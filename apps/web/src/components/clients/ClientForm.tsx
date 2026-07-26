import { useState } from 'react'
import { Client, CustomFieldDef } from '../../types'
import { Button } from '../ui/Button'
import { Input, Label, Select, Textarea } from '../ui/Input'
import { CustomFieldsValues } from '../ui/CustomFieldsEditor'

type ClientFormValues = Partial<Client>

export function ClientForm({
  initial, customFieldDefs, onSubmit, onCancel, submitLabel = 'Guardar',
}: {
  initial?: ClientFormValues
  customFieldDefs: CustomFieldDef[]
  onSubmit: (values: any) => Promise<void>
  onCancel: () => void
  submitLabel?: string
}) {
  const [values, setValues] = useState<ClientFormValues>(initial ?? { whatsapp_provider: 'ycloud' })
  const [customFields, setCustomFields] = useState<Record<string, string>>(initial?.custom_fields ?? {})
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof ClientFormValues>(key: K, val: ClientFormValues[K]) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.nombre?.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ ...values, custom_fields: customFields })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nombre</Label>
          <Input value={values.nombre ?? ''} onChange={e => set('nombre', e.target.value)} required />
        </div>
        <div>
          <Label>Apellidos</Label>
          <Input value={values.apellidos ?? ''} onChange={e => set('apellidos', e.target.value)} />
        </div>
        <div>
          <Label>Empresa</Label>
          <Input value={values.empresa ?? ''} onChange={e => set('empresa', e.target.value)} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={values.telefono ?? ''} onChange={e => set('telefono', e.target.value)} placeholder="+34..." />
        </div>
        <div className="col-span-2">
          <Label>Email</Label>
          <Input type="email" value={values.email ?? ''} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="col-span-2">
          <Label>Notas</Label>
          <Textarea rows={2} value={values.notas ?? ''} onChange={e => set('notas', e.target.value)} />
        </div>
      </div>

      <div className="border-t border-navy-700 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-navy-200">Proveedor de WhatsApp</h3>
        <Select value={values.whatsapp_provider ?? 'ycloud'} onChange={e => set('whatsapp_provider', e.target.value as any)}>
          <option value="ycloud">YCloud (API oficial)</option>
          <option value="baileys">Baileys (WhatsApp Web, no oficial)</option>
        </Select>
      </div>

      <div className="border-t border-navy-700 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-navy-200">Claves de API y servidor</h3>
        <div className="space-y-3">
          <div>
            <Label>URL del servidor n8n</Label>
            <Input value={values.n8n_url ?? ''} onChange={e => set('n8n_url', e.target.value)} placeholder="https://n8n.midominio.com" />
          </div>
          <div>
            <Label>Clave de API de n8n</Label>
            <Input type="password" value={values.n8n_api_key ?? ''} onChange={e => set('n8n_api_key', e.target.value)} placeholder={initial ? '•••••••• (déjalo en blanco para no cambiarla)' : ''} />
          </div>
          <div>
            <Label>Clave de API de OpenRouter</Label>
            <Input type="password" value={values.openrouter_api_key ?? ''} onChange={e => set('openrouter_api_key', e.target.value)} placeholder={initial ? '•••••••• (déjalo en blanco para no cambiarla)' : ''} />
          </div>
          <div>
            <Label>Clave de API de Claude</Label>
            <Input type="password" value={values.claude_api_key ?? ''} onChange={e => set('claude_api_key', e.target.value)} placeholder={initial ? '•••••••• (déjalo en blanco para no cambiarla)' : ''} />
          </div>
          <div>
            <Label>Clave de API de YCloud</Label>
            <Input type="password" value={values.ycloud_api_key ?? ''} onChange={e => set('ycloud_api_key', e.target.value)} placeholder={initial ? '•••••••• (déjalo en blanco para no cambiarla)' : ''} />
          </div>
          <div>
            <Label>Número de WhatsApp (YCloud)</Label>
            <Input value={values.ycloud_wa_number ?? ''} onChange={e => set('ycloud_wa_number', e.target.value)} placeholder="+34..." />
          </div>
        </div>
      </div>

      {customFieldDefs.length > 0 && (
        <div className="border-t border-navy-700 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-navy-200">Campos personalizados</h3>
          <CustomFieldsValues defs={customFieldDefs} values={customFields} onChange={setCustomFields} />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end gap-2 border-t border-navy-700 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : submitLabel}</Button>
      </div>
    </form>
  )
}
