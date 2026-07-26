export interface CustomFieldDef {
  id: string
  field_key: string
  label: string
  field_type: 'text' | 'number' | 'password' | 'url' | 'textarea'
}

export interface ClientListItem {
  id: string
  nombre: string
  apellidos: string | null
  empresa: string | null
  telefono: string | null
  email: string | null
  whatsapp_provider: 'ycloud' | 'baileys'
  has_n8n_key: boolean
  has_openrouter_key: boolean
  has_claude_key: boolean
  has_ycloud_key: boolean
}

export interface Client extends ClientListItem {
  notas: string | null
  n8n_url: string | null
  n8n_api_key: string | null
  openrouter_api_key: string | null
  claude_api_key: string | null
  ycloud_api_key: string | null
  ycloud_wa_number: string | null
  custom_fields: Record<string, string>
}

export interface Appointment {
  id: string
  client_id: string | null
  client_nombre?: string | null
  client_empresa?: string | null
  title: string
  description: string | null
  start_at: string
  end_at: string
  location: string | null
  status: 'programada' | 'completada' | 'cancelada'
}

export interface Workflow {
  id: string
  name: string
  description: string | null
  trigger_type: 'manual' | 'webhook' | 'n8n' | 'schedule'
  config: Record<string, any>
  active: boolean
  client_id: string | null
  client_nombre?: string | null
  created_at: string
}

export interface WhatsAppConversation {
  id: string
  client_id: string
  phone: string
  contact_name: string | null
  provider: 'ycloud' | 'baileys'
  last_message_at: string | null
  last_message_preview: string | null
  unread_count: number
}

export interface WhatsAppMessage {
  id: string
  conversation_id: string
  direction: 'inbound' | 'outbound'
  body: string
  status: string
  created_at: string
}

export interface AccountSettings {
  ycloud_api_key: string | null
  ycloud_wa_number: string | null
  openrouter_api_key: string | null
  claude_api_key: string | null
  n8n_url: string | null
  n8n_api_key: string | null
  custom_fields: Record<string, string>
}
