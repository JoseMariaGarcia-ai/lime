import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { AccountSettings, CustomFieldDef } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Input, Label } from '../components/ui/Input'
import { CustomFieldDefsManager, CustomFieldsValues } from '../components/ui/CustomFieldsEditor'

export function Settings() {
  const [settings, setSettings] = useState<AccountSettings | null>(null)
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([])
  const [customFields, setCustomFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    const [settingsData, defsData] = await Promise.all([
      api.get('/api/settings'),
      api.get('/api/settings/custom-fields'),
    ])
    setSettings(settingsData)
    setCustomFields(settingsData.custom_fields ?? {})
    setCustomFieldDefs(defsData)
  }

  useEffect(() => { load() }, [])

  function set<K extends keyof AccountSettings>(key: K, val: AccountSettings[K]) {
    setSettings(s => (s ? { ...s, [key]: val } : s))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!settings) return
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const updated = await api.put('/api/settings', { ...settings, custom_fields: customFields })
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!settings) return <p className="text-navy-400">Cargando...</p>

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-navy-50">Configuración de cuenta</h1>
        <p className="text-sm text-navy-400">Claves de API globales del entorno de Lime AI Studio.</p>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label>Clave de API de YCloud</Label>
            <Input type="password" value={settings.ycloud_api_key ?? ''} onChange={e => set('ycloud_api_key', e.target.value)} placeholder="•••••••• (déjalo en blanco para no cambiarla)" />
          </div>
          <div>
            <Label>Número de WhatsApp (YCloud)</Label>
            <Input value={settings.ycloud_wa_number ?? ''} onChange={e => set('ycloud_wa_number', e.target.value)} placeholder="+34..." />
          </div>
          <div>
            <Label>Clave de API de OpenRouter</Label>
            <Input type="password" value={settings.openrouter_api_key ?? ''} onChange={e => set('openrouter_api_key', e.target.value)} placeholder="•••••••• (déjalo en blanco para no cambiarla)" />
          </div>
          <div>
            <Label>Clave de API de Claude</Label>
            <Input type="password" value={settings.claude_api_key ?? ''} onChange={e => set('claude_api_key', e.target.value)} placeholder="•••••••• (déjalo en blanco para no cambiarla)" />
          </div>
          <div>
            <Label>URL del servidor n8n</Label>
            <Input value={settings.n8n_url ?? ''} onChange={e => set('n8n_url', e.target.value)} placeholder="https://n8n.midominio.com" />
          </div>
          <div>
            <Label>Clave de API de n8n</Label>
            <Input type="password" value={settings.n8n_api_key ?? ''} onChange={e => set('n8n_api_key', e.target.value)} placeholder="•••••••• (déjalo en blanco para no cambiarla)" />
          </div>

          {customFieldDefs.length > 0 && (
            <div className="border-t border-navy-700 pt-4">
              <h3 className="mb-3 text-sm font-semibold text-navy-200">Campos personalizados</h3>
              <CustomFieldsValues defs={customFieldDefs} values={customFields} onChange={setCustomFields} />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
          {saved && <p className="text-sm text-lime-400">Guardado.</p>}

          <div className="flex justify-end border-t border-navy-700 pt-4">
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-navy-200">Campos personalizados disponibles</h2>
        <CustomFieldDefsManager
          defs={customFieldDefs}
          onAdd={async (label, field_type) => {
            await api.post('/api/settings/custom-fields', { label, field_type })
            await load()
          }}
          onDelete={async (id) => {
            await api.delete(`/api/settings/custom-fields/${id}`)
            await load()
          }}
        />
      </Card>
    </div>
  )
}
