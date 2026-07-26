import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Settings2 } from 'lucide-react'
import { api } from '../lib/api'
import { ClientListItem, CustomFieldDef } from '../types'
import { Button } from '../components/ui/Button'
import { Badge, Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { ClientForm } from '../components/clients/ClientForm'
import { CustomFieldDefsManager } from '../components/ui/CustomFieldsEditor'

export function Clients() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showFieldsManager, setShowFieldsManager] = useState(false)

  async function load() {
    setLoading(true)
    const [clientsData, defsData] = await Promise.all([
      api.get('/api/clients'),
      api.get('/api/clients/meta/custom-fields'),
    ])
    setClients(clientsData)
    setCustomFieldDefs(defsData)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleCreate(values: any) {
    await api.post('/api/clients', values)
    setShowCreate(false)
    await load()
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy-50">Clientes</h1>
          <p className="text-sm text-navy-400">Empresas y contactos que gestiona Lime AI Studio.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowFieldsManager(true)}>
            <Settings2 size={16} /> Campos personalizados
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Nuevo cliente
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-navy-400">Cargando...</p>
      ) : clients.length === 0 ? (
        <Card className="text-center text-navy-400">Todavía no hay ningún cliente. Crea el primero.</Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700 text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Claves configuradas</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="cursor-pointer border-b border-navy-700/60 last:border-0 hover:bg-navy-700/30"
                >
                  <td className="px-4 py-3 font-medium text-navy-50">{c.nombre} {c.apellidos}</td>
                  <td className="px-4 py-3 text-navy-300">{c.empresa ?? '—'}</td>
                  <td className="px-4 py-3 text-navy-300">{c.telefono ?? '—'}</td>
                  <td className="px-4 py-3 text-navy-300">{c.email ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {c.has_n8n_key && <Badge color="gray">n8n</Badge>}
                      {c.has_openrouter_key && <Badge color="gray">OpenRouter</Badge>}
                      {c.has_claude_key && <Badge color="gray">Claude</Badge>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Nuevo cliente" wide>
        <ClientForm
          customFieldDefs={customFieldDefs}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitLabel="Crear cliente"
        />
      </Modal>

      <Modal open={showFieldsManager} onClose={() => setShowFieldsManager(false)} title="Campos personalizados de cliente">
        <CustomFieldDefsManager
          defs={customFieldDefs}
          onAdd={async (label, field_type) => {
            await api.post('/api/clients/meta/custom-fields', { label, field_type })
            await load()
          }}
          onDelete={async (id) => {
            await api.delete(`/api/clients/meta/custom-fields/${id}`)
            await load()
          }}
        />
      </Modal>
    </div>
  )
}
