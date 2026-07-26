import { useState } from 'react'
import { ClientListItem, Workflow } from '../../types'
import { Button } from '../ui/Button'
import { Input, Label, Select, Textarea } from '../ui/Input'

export function WorkflowForm({
  initial, clients, onSubmit, onCancel,
}: {
  initial?: Partial<Workflow>
  clients: ClientListItem[]
  onSubmit: (values: any) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [triggerType, setTriggerType] = useState(initial?.trigger_type ?? 'manual')
  const [clientId, setClientId] = useState(initial?.client_id ?? '')
  const [configText, setConfigText] = useState(JSON.stringify(initial?.config ?? {}, null, 2))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    let config: Record<string, any>
    try {
      config = configText.trim() ? JSON.parse(configText) : {}
    } catch {
      setError('La configuración debe ser un JSON válido')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ name, description: description || null, trigger_type: triggerType, client_id: clientId || null, config })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nombre</Label>
        <Input value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div>
        <Label>Descripción</Label>
        <Textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Disparador</Label>
          <Select value={triggerType} onChange={e => setTriggerType(e.target.value as any)}>
            <option value="manual">Manual</option>
            <option value="webhook">Webhook</option>
            <option value="n8n">n8n</option>
            <option value="schedule">Programado</option>
          </Select>
        </div>
        <div>
          <Label>Cliente (opcional)</Label>
          <Select value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">— General —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <Label>Configuración (JSON)</Label>
        <Textarea rows={6} className="font-mono text-xs" value={configText} onChange={e => setConfigText(e.target.value)} />
        <p className="mt-1 text-xs text-navy-500">
          Datos libres del workflow (URL de webhook de n8n, prompt, parámetros...).
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-navy-700 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
      </div>
    </form>
  )
}
