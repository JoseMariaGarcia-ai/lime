import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { Client, CustomFieldDef } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ClientForm } from '../components/clients/ClientForm'

export function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client | null>(null)
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [clientData, defsData] = await Promise.all([
      api.get(`/api/clients/${id}`),
      api.get('/api/clients/meta/custom-fields'),
    ])
    setClient(clientData)
    setCustomFieldDefs(defsData)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleSave(values: any) {
    await api.put(`/api/clients/${id}`, values)
    await load()
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar a ${client?.nombre}? Esta acción no se puede deshacer.`)) return
    await api.delete(`/api/clients/${id}`)
    navigate('/')
  }

  if (loading || !client) return <p className="text-navy-400">Cargando...</p>

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-navy-400 hover:text-navy-100">
          <ArrowLeft size={16} /> Volver a clientes
        </button>
        <Button variant="danger" onClick={handleDelete}>
          <Trash2 size={16} /> Eliminar cliente
        </Button>
      </div>

      <Card>
        <h1 className="mb-6 text-xl font-semibold text-navy-50">{client.nombre} {client.apellidos}</h1>
        <ClientForm
          initial={client}
          customFieldDefs={customFieldDefs}
          onSubmit={handleSave}
          onCancel={() => navigate('/')}
          submitLabel="Guardar cambios"
        />
      </Card>
    </div>
  )
}
