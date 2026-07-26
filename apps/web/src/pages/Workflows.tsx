import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { ClientListItem, Workflow } from '../types'
import { Button } from '../components/ui/Button'
import { Badge, Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Toggle } from '../components/ui/Toggle'
import { WorkflowForm } from '../components/workflows/WorkflowForm'

export function Workflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [editing, setEditing] = useState<Workflow | 'new' | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [data, clientsData] = await Promise.all([api.get('/api/workflows'), api.get('/api/clients')])
    setWorkflows(data)
    setClients(clientsData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(values: any) {
    if (editing === 'new') await api.post('/api/workflows', values)
    else await api.put(`/api/workflows/${(editing as Workflow).id}`, values)
    setEditing(null)
    await load()
  }

  async function handleToggle(w: Workflow) {
    setWorkflows(prev => prev.map(x => x.id === w.id ? { ...x, active: !x.active } : x))
    await api.patch(`/api/workflows/${w.id}/toggle`)
  }

  async function handleDelete(w: Workflow) {
    if (!confirm(`¿Eliminar el workflow "${w.name}"?`)) return
    await api.delete(`/api/workflows/${w.id}`)
    await load()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy-50">Workflows</h1>
          <p className="text-sm text-navy-400">Automatizaciones — actívalas o desactívalas cuando quieras.</p>
        </div>
        <Button onClick={() => setEditing('new')}>
          <Plus size={16} /> Nuevo workflow
        </Button>
      </div>

      {loading ? (
        <p className="text-navy-400">Cargando...</p>
      ) : workflows.length === 0 ? (
        <Card className="text-center text-navy-400">Todavía no hay ningún workflow.</Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {workflows.map(w => (
            <Card key={w.id}>
              <div className="flex items-start justify-between">
                <div className="cursor-pointer" onClick={() => setEditing(w)}>
                  <p className="font-medium text-navy-50">{w.name}</p>
                  {w.description && <p className="mt-1 text-sm text-navy-400">{w.description}</p>}
                  <div className="mt-2 flex gap-2">
                    <Badge color="gray">{w.trigger_type}</Badge>
                    {w.client_nombre && <Badge color="teal">{w.client_nombre}</Badge>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Toggle checked={w.active} onChange={() => handleToggle(w)} />
                  <button onClick={() => handleDelete(w)} className="text-navy-500 hover:text-red-400">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo workflow' : 'Editar workflow'} wide>
        {editing && (
          <WorkflowForm
            initial={editing === 'new' ? undefined : editing}
            clients={clients}
            onSubmit={handleSubmit}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
