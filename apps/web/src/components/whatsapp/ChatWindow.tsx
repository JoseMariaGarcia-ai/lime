import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import clsx from 'clsx'
import { WhatsAppConversation, WhatsAppMessage } from '../../types'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function ChatWindow({
  conversation, messages, onSend,
}: { conversation: WhatsAppConversation; messages: WhatsAppMessage[]; onSend: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim()) return
    setSending(true)
    try {
      await onSend(body.trim())
      setBody('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-navy-700 px-4 py-3">
        <p className="text-sm font-medium text-navy-50">{conversation.contact_name || conversation.phone}</p>
        <p className="text-xs text-navy-400">{conversation.phone} · {conversation.provider === 'baileys' ? 'Baileys' : 'YCloud'}</p>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.map(m => (
          <div key={m.id} className={clsx('flex', m.direction === 'outbound' ? 'justify-end' : 'justify-start')}>
            <div
              className={clsx(
                'max-w-[70%] rounded-2xl px-3 py-2 text-sm',
                m.direction === 'outbound' ? 'bg-lime-500 text-navy-950' : 'bg-navy-700 text-navy-50',
                m.status === 'failed' && 'opacity-60 ring-1 ring-red-500'
              )}
            >
              {m.body}
              {m.status === 'failed' && <p className="mt-1 text-xs text-red-300">No se pudo enviar</p>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 border-t border-navy-700 p-3">
        <Input value={body} onChange={e => setBody(e.target.value)} placeholder="Escribe un mensaje..." />
        <Button type="submit" disabled={sending}>
          <Send size={16} />
        </Button>
      </form>
    </div>
  )
}
