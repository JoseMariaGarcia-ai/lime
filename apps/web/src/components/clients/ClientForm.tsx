import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Client, CustomFieldDef } from '../../types'
import { Button } from '../ui/Button'
import { Input, Label, Textarea } from '../ui/Input'
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
  const [values, setValues] = useState<ClientFormValues>(initial ?? {})
  const [customFields, setCustomFields] = useState<Record<string, string>>(initial?.custom_fields ?? {})
  const [extraApiKeys, setExtraApiKeys] = useState<{ name: string; value: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function set<K extends keyof ClientFormValues>(key: K, val: ClientFormValues[K]) {
    setValues(v => ({ ...v, [key]: val }))
  }

  function updateExtraKeyRow(i: number, field: 'name' | 'value', val: string) {
    setExtraApiKeys(rows => rows.map((row, idx) => (idx === i ? { ...row, [field]: val } : row)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!values.nombre?.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        ...values,
        custom_fields: customFields,
        extra_api_keys: extraApiKeys.filter(k => k.name.trim() && k.value.trim()),
      })
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
        <h3 className="mb-3 text-sm font-semibold text-navy-200">Facturación</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Importe de implementación (€)</Label>
            <Input
              type="number" step="0.01" min="0"
              value={values.implementation_amount ?? ''}
              onChange={e => set('implementation_amount', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Importe mensual (€)</Label>
            <Input
              type="number" step="0.01" min="0"
              value={values.monthly_amount ?? ''}
              onChange={e => set('monthly_amount', e.target.value === '' ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <Label>Fecha de renovación</Label>
            <Input
              type="date"
              value={values.renewal_date ?? ''}
              onChange={e => set('renewal_date', e.target.value || null)}
            />
          </div>
        </div>
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
            <Input value={values.n8n_api_key ?? ''} onChange={e => set('n8n_api_key', e.target.value)} />
          </div>
          <div>
            <Label>Clave de API de OpenRouter</Label>
            <Input value={values.openrouter_api_key ?? ''} onChange={e => set('openrouter_api_key', e.target.value)} />
          </div>
          <div>
            <Label>Clave de API de Claude</Label>
            <Input value={values.claude_api_key ?? ''} onChange={e => set('claude_api_key', e.target.value)} />
          </div>
        </div>
      </div>

      {!initial && (
        <div className="border-t border-navy-700 pt-4">
          <h3 className="mb-3 text-sm font-semibold text-navy-200">Claves de API adicionales</h3>
          <div className="space-y-2">
            {extraApiKeys.map((row, i) => (
              <div key={i} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label>Nombre</Label>
                  <Input value={row.name} onChange={e => updateExtraKeyRow(i, 'name', e.target.value)} placeholder="p. ej. Stripe" />
                </div>
                <div className="flex-1">
                  <Label>Valor</Label>
                  <Input value={row.value} onChange={e => updateExtraKeyRow(i, 'value', e.target.value)} />
                </div>
                <button
                  type="button"
                  onClick={() => setExtraApiKeys(rows => rows.filter((_, idx) => idx !== i))}
                  className="mb-2 text-navy-500 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <Button type="button" variant="secondary" onClick={() => setExtraApiKeys(rows => [...rows, { name: '', value: '' }])}>
              <Plus size={16} /> Añadir clave
            </Button>
          </div>
        </div>
      )}

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
