import { useState } from 'react'
import { Appointment, ClientListItem } from '../../types'
import { Button } from '../ui/Button'
import { Input, Label, Select, Textarea } from '../ui/Input'

function toLocalInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AppointmentForm({
  initial, clients, onSubmit, onCancel, onDelete,
}: {
  initial?: Partial<Appointment>
  clients: ClientListItem[]
  onSubmit: (values: any) => Promise<void>
  onCancel: () => void
  onDelete?: () => Promise<void>
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [clientId, setClientId] = useState(initial?.client_id ?? '')
  const [startAt, setStartAt] = useState(toLocalInput(initial?.start_at))
  const [endAt, setEndAt] = useState(toLocalInput(initial?.end_at))
  const [location, setLocation] = useState(initial?.location ?? '')
  const [status, setStatus] = useState(initial?.status ?? 'programada')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !startAt || !endAt) { setError('Título, inicio y fin son obligatorios'); return }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        title, description: description || null, client_id: clientId || null,
        start_at: new Date(startAt).toISOString(), end_at: new Date(endAt).toISOString(),
        location: location || null, status,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Título</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Inicio</Label>
          <Input type="datetime-local" value={startAt} onChange={e => setStartAt(e.target.value)} required />
        </div>
        <div>
          <Label>Fin</Label>
          <Input type="datetime-local" value={endAt} onChange={e => setEndAt(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label>Cliente (opcional)</Label>
        <Select value={clientId} onChange={e => setClientId(e.target.value)}>
          <option value="">— Sin cliente —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.nombre} {c.empresa ? `· ${c.empresa}` : ''}</option>)}
        </Select>
      </div>
      <div>
        <Label>Ubicación</Label>
        <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="Videollamada, oficina..." />
      </div>
      <div>
        <Label>Descripción</Label>
        <Textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      {initial?.id && (
        <div>
          <Label>Estado</Label>
          <Select value={status} onChange={e => setStatus(e.target.value as any)}>
            <option value="programada">Programada</option>
            <option value="completada">Completada</option>
            <option value="cancelada">Cancelada</option>
          </Select>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-between border-t border-navy-700 pt-4">
        {onDelete ? (
          <Button type="button" variant="danger" onClick={onDelete}>Eliminar</Button>
        ) : <span />}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        </div>
      </div>
    </form>
  )
}
