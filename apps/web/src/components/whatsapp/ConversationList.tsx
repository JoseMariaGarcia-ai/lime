import clsx from 'clsx'
import { WhatsAppConversation } from '../../types'
import { Badge } from '../ui/Card'

export function ConversationList({
  conversations, activeId, onSelect,
}: { conversations: WhatsAppConversation[]; activeId: string | null; onSelect: (c: WhatsAppConversation) => void }) {
  if (conversations.length === 0) {
    return <p className="p-4 text-sm text-navy-400">Todavía no hay conversaciones con este cliente.</p>
  }
  return (
    <ul className="divide-y divide-navy-700/60">
      {conversations.map(c => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c)}
            className={clsx(
              'flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors',
              activeId === c.id ? 'bg-lime-500/10' : 'hover:bg-navy-700/40'
            )}
          >
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium text-navy-50">{c.contact_name || c.phone}</span>
              {c.unread_count > 0 && <Badge color="lime">{c.unread_count}</Badge>}
            </div>
            <span className="truncate text-xs text-navy-400">{c.last_message_preview ?? 'Sin mensajes'}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
