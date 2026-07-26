import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { api } from '../lib/api'
import { WhatsAppConversation, WhatsAppMessage } from '../types'
import { Card } from '../components/ui/Card'
import { ConversationList } from '../components/whatsapp/ConversationList'
import { ChatWindow } from '../components/whatsapp/ChatWindow'
import { ConnectionPanel } from '../components/whatsapp/ConnectionPanel'

type Filter = 'all' | 'unread' | 'pending'

const TABS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'unread', label: 'No leídos' },
  { key: 'pending', label: 'Pendientes de gestión' },
]

export function WhatsApp() {
  const [filter, setFilter] = useState<Filter>('all')
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([])
  const [active, setActive] = useState<WhatsAppConversation | null>(null)
  const [messages, setMessages] = useState<WhatsAppMessage[]>([])
  const [loading, setLoading] = useState(true)

  async function loadConversations() {
    setLoading(true)
    const query = filter === 'all' ? '' : `?filter=${filter}`
    const data = await api.get(`/api/whatsapp/conversations${query}`)
    setConversations(data)
    setLoading(false)
  }

  useEffect(() => { loadConversations() }, [filter])

  async function selectConversation(c: WhatsAppConversation) {
    setActive(c)
    const data = await api.get(`/api/whatsapp/conversations/${c.id}/messages`)
    setMessages(data)
    setConversations(prev => prev.map(x => x.id === c.id ? { ...x, unread_count: 0 } : x))
  }

  async function handleSend(body: string) {
    if (!active) return
    const message = await api.post('/api/whatsapp/send', { conversationId: active.id, body })
    setMessages(prev => [...prev, message])
  }

  async function togglePending(c: WhatsAppConversation) {
    const updated = await api.post(`/api/whatsapp/conversations/${c.id}/pending`, { pending: !c.is_pending })
    setConversations(prev => prev.map(x => x.id === c.id ? { ...x, is_pending: updated.is_pending } : x))
    if (active?.id === c.id) setActive(a => a && { ...a, is_pending: updated.is_pending })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-navy-50">WhatsApp</h1>
        <p className="text-sm text-navy-400">Bandeja única de conversaciones.</p>
      </div>

      <div className="mb-4">
        <ConnectionPanel />
      </div>

      <div className="mb-4 flex gap-2">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={clsx(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              filter === t.key ? 'bg-lime-500 text-navy-950' : 'bg-navy-800 text-navy-300 hover:bg-navy-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-navy-400">Cargando...</p>
      ) : (
        <Card className="flex flex-1 overflow-hidden p-0">
          <div className="w-80 overflow-y-auto border-r border-navy-700">
            <ConversationList
              conversations={conversations} activeId={active?.id ?? null}
              onSelect={selectConversation} onTogglePending={togglePending}
            />
          </div>
          <div className="flex flex-1 flex-col">
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
