import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { ClientApiKey } from '../../types'
import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Input'

// Claves de API adicionales de un cliente, con nombre libre — a diferencia
// de los campos personalizados (definición global compartida por todos los
// clientes), aquí cada clave se crea suelta para este cliente en concreto,
// por eso cada acción llama directamente a la API en vez de acumular estado
// en el formulario general del cliente.
export function ClientApiKeysEditor({
  clientId, keys, onChange,
}: { clientId: string; keys: ClientApiKey[]; onChange: () => Promise<void> | void }) {
  const [name, setName] = useState('')
  const [value, setValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingValues, setEditingValues] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !value.trim()) return
    setAdding(true)
    setError(null)
    try {
      await api.post(`/api/clients/${clientId}/api-keys`, { name: name.trim(), value })
      setName('')
      setValue('')
      await onChange()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleUpdateValue(keyId: string) {
    const newValue = editingValues[keyId]
    if (!newValue?.trim()) return
    setError(null)
    try {
      await api.put(`/api/clients/${clientId}/api-keys/${keyId}`, { value: newValue })
      setEditingValues(v => ({ ...v, [keyId]: '' }))
      await onChange()
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleDelete(keyId: string) {
    if (!confirm('¿Eliminar esta clave de API?')) return
    await api.delete(`/api/clients/${clientId}/api-keys/${keyId}`)
    await onChange()
  }

  return (
    <div className="space-y-3">
      {keys.length > 0 && (
        <ul className="space-y-2">
          {keys.map(k => (
            <li key={k.id} className="rounded-lg border border-navy-700 bg-navy-900/50 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-navy-100">{k.name}</span>
                <button type="button" onClick={() => handleDelete(k.id)} className="text-navy-500 hover:text-red-400">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  type="password"
                  placeholder="•••••••• (déjalo en blanco para no cambiarla)"
                  value={editingValues[k.id] ?? ''}
                  onChange={e => setEditingValues(v => ({ ...v, [k.id]: e.target.value }))}
                />
                <Button type="button" variant="secondary" onClick={() => handleUpdateValue(k.id)}>
                  Actualizar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[140px]">
          <Label>Nombre de la clave</Label>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="p. ej. Stripe" />
        </div>
        <div className="flex-1 min-w-[140px]">
          <Label>Valor</Label>
          <Input type="password" value={value} onChange={e => setValue(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary" disabled={adding}>
          <Plus size={16} /> Añadir
        </Button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
