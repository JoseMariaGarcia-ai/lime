import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { CustomFieldDef } from '../../types'
import { Button } from './Button'
import { Input, Label, Select, Textarea } from './Input'

// Editor genérico de valores de campos personalizables (para la ficha de un
// cliente o para la configuración de cuenta) — las definiciones (qué campos
// existen) se gestionan aparte con CustomFieldDefsManager.
export function CustomFieldsValues({
  defs, values, onChange,
}: { defs: CustomFieldDef[]; values: Record<string, string>; onChange: (values: Record<string, string>) => void }) {
  if (defs.length === 0) return null
  return (
    <div className="space-y-4">
      {defs.map(def => (
        <div key={def.id}>
          <Label>{def.label}</Label>
          {def.field_type === 'textarea' ? (
            <Textarea
              rows={3}
              value={values[def.field_key] ?? ''}
              onChange={e => onChange({ ...values, [def.field_key]: e.target.value })}
            />
          ) : (
            <Input
              type={def.field_type === 'password' ? 'password' : def.field_type === 'number' ? 'number' : def.field_type === 'url' ? 'url' : 'text'}
              value={values[def.field_key] ?? ''}
              onChange={e => onChange({ ...values, [def.field_key]: e.target.value })}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// Gestión de las definiciones en sí (añadir/quitar campos disponibles).
export function CustomFieldDefsManager({
  defs, onAdd, onDelete,
}: { defs: CustomFieldDef[]; onAdd: (label: string, fieldType: string) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const [label, setLabel] = useState('')
  const [fieldType, setFieldType] = useState('text')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return
    setAdding(true)
    setError(null)
    try {
      await onAdd(label.trim(), fieldType)
      setLabel('')
      setFieldType('text')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="space-y-3">
      {defs.length > 0 && (
        <ul className="space-y-2">
          {defs.map(def => (
            <li key={def.id} className="flex items-center justify-between rounded-lg border border-navy-700 bg-navy-900/50 px-3 py-2">
              <span className="text-sm text-navy-100">
                {def.label} <span className="text-navy-500">({def.field_type})</span>
              </span>
              <button onClick={() => onDelete(def.id)} className="text-navy-500 hover:text-red-400">
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <Label>Nuevo campo</Label>
          <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="p. ej. ID de proyecto n8n" />
        </div>
        <div>
          <Label>Tipo</Label>
          <Select value={fieldType} onChange={e => setFieldType(e.target.value)}>
            <option value="text">Texto</option>
            <option value="number">Número</option>
            <option value="password">Clave/contraseña</option>
            <option value="url">URL</option>
            <option value="textarea">Texto largo</option>
          </Select>
        </div>
        <Button type="submit" variant="secondary" disabled={adding}>
          <Plus size={16} /> Añadir
        </Button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  )
}
