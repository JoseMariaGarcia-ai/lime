import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { WhatsAppConversation, WhatsAppMessage } from '../types'
import { Card } from '../components/ui/Card'
import { Select } from '../components/ui/Input'
import { ConversationList } from '../components/whatsapp/ConversationList'
import { ChatWindow } from '../components/whatsapp/ChatWindow'
import { ConnectionPanel } from '../components/whatsapp/ConnectionPanel'

interface ClientOption { id: string; nombre: string; empresa: string | null; unread: number }

export function WhatsApp() {
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState<string>('')
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [active, setActive] = useState<WhatsAppConversation | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])

  useEffect(() => {
    api.get('/api/whatsapp/clients').then(data => {
      setClients(data)
      if (data.length > 0) setClientId(data[0].id)
    })
  }, [])

  async function loadConversations(id: string) {
    const data = await api.get(`/api/whatsapp/conversations?clientId=${id}`)
    setConversations(data)
    setActive(null)
    setMessages([])
  }

  useEffect(() => { if (clientId) loadConversations(clientId) }, [clientId])

  async function selectConversation(c: WhatsAppConversation) {
    setActive(c)
    const data = await api.get(`/api/whatsapp/conversations/${c.id}/messages`)
    setMessages(data)
  }

  async function handleSend(body: string) {
    if (!active) return
    const message = await api.post('/api/whatsapp/send', { clientId, phone: active.phone, body })
    setMessages(prev => [...prev, message])
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-navy-50">WhatsApp</h1>
          <p className="text-sm text-navy-400">Conversaciones y envío de mensajes por cliente.</p>
        </div>
        <Select value={clientId} onChange={e => setClientId(e.target.value)} className="w-64">
          {clients.map(c => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.empresa ? `· ${c.empresa}` : ''} {c.unread > 0 ? `(${c.unread})` : ''}
            </option>
          ))}
        </Select>
      </div>

      {!clientId ? (
        <Card className="text-center text-navy-400">Crea un cliente primero para poder gestionar su WhatsApp.</Card>
      ) : (
        <Card className="flex flex-1 overflow-hidden p-0">
          <div className="w-72 border-r border-navy-700 overflow-y-auto">
            <ConversationList conversations={conversations} activeId={active?.id ?? null} onSelect={selectConversation} />
          </div>
          <div className="flex flex-1 flex-col">
            <ConnectionPanel clientId={clientId} />
            {active ? (
              <ChatWindow conversation={active} messages={messages} onSend={handleSend} />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-navy-400">
                Selecciona una conversación
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
