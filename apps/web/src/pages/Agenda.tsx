import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { api } from '../lib/api'
import { Appointment, ClientListItem } from '../types'
import { Button } from '../components/ui/Button'
import { Badge, Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { AppointmentForm } from '../components/agenda/AppointmentForm'

const STATUS_COLOR: Record<string, 'lime' | 'teal' | 'red' | 'gray'> = {
  programada: 'teal', completada: 'lime', cancelada: 'red',
}

function groupByDay(appointments: Appointment[]): [string, Appointment[]][] {
  const groups = new Map<string, Appointment[]>()
  for (const a of appointments) {
    const day = new Date(a.start_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    if (!groups.has(day)) groups.set(day, [])
    groups.get(day)!.push(a)
  }
  return Array.from(groups.entries())
}

export function Agenda() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [editing, setEditing] = useState<Appointment | 'new' | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [appts, clientsData] = await Promise.all([api.get('/api/agenda'), api.get('/api/clients')])
    setAppointments(appts)
    setClients(clientsData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(values: any) {
    if (editing === 'new') await api.post('/api/agenda', values)
    else await api.put(`/api/agenda/${(editing as Appointment).id}`, values)
    setEditing(null)
    await load()
  }

  async function handleDelete() {
    if (editing === 'new' || !editing) return
    if (!confirm('¿Eliminar esta cita?')) return
    await api.delete(`/api/agenda/${editing.id}`)
    setEditing(null)
    await load()
  }

  const groups = groupByDay(appointments)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy-50">Agenda</h1>
          <p className="text-sm text-navy-400">Citas y reuniones.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus size={16} /> Nueva cita
        </Button>
      </div>

      {loading ? (
        <p className="text-navy-400">Cargando...</p>
      ) : groups.length === 0 ? (
        <Card className="text-center text-navy-400">No hay ninguna cita programada.</Card>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, items]) => (
            <div key={day}>
              <h2 className="mb-2 text-sm font-semibold capitalize text-navy-300">{day}</h2>
              <div className="space-y-2">
                {items.map(a => (
                  <Card key={a.id} className="cursor-pointer hover:border-lime-500/50" >
                    <div onClick={() => setEditing(a)} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-navy-50">{a.title}</p>
                        <p className="text-sm text-navy-400">
                          {new Date(a.start_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          {' – '}
                          {new Date(a.end_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          {a.client_nombre ? ` · ${a.client_nombre}` : ''}
                          {a.location ? ` · ${a.location}` : ''}
                        </p>
                      </div>
                      <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva cita' : 'Editar cita'}>
        {editing && (
          <AppointmentForm
            initial={editing === 'new' ? undefined : editing}
            clients={clients}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
            onDelete={editing !== 'new' ? handleDelete : undefined}
          />
        )}
      </Modal>
    </div>
  )
}
