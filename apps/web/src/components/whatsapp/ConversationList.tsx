import { Flag } from 'lucide-react'
import clsx from 'clsx'
import { WhatsAppConversation } from '../../types'
import { Badge } from '../ui/Card'

export function ConversationList({
  conversations, activeId, onSelect, onTogglePending,
}: {
  conversations: WhatsAppConversation[]
  activeId: string | null
  onSelect: (c: WhatsAppConversation) => void
  onTogglePending: (c: WhatsAppConversation) => void
}) {
  if (conversations.length === 0) {
    return <p className="p-4 text-sm text-navy-400">No hay conversaciones en esta bandeja.</p>
  }
  return (
    <ul className="divide-y divide-navy-700/60">
      {conversations.map(c => (
        <li key={c.id} className={clsx('group relative', activeId === c.id && 'bg-lime-500/10')}>
          <button onClick={() => onSelect(c)} className="flex w-full flex-col items-start gap-0.5 px-4 py-3 pr-9 text-left hover:bg-navy-700/40">
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium text-navy-50">{c.contact_name || c.phone}</span>
              {c.unread_count > 0 && <Badge color="lime">{c.unread_count}</Badge>}
            </div>
            <span className="truncate text-xs text-navy-400">
              {c.client_nombre ?? 'Sin cliente asignado'}{c.client_empresa ? ` · ${c.client_empresa}` : ''}
            </span>
            <span className="truncate text-xs text-navy-500">{c.last_message_preview ?? 'Sin mensajes'}</span>
          </button>
          <button
            onClick={() => onTogglePending(c)}
            title={c.is_pending ? 'Quitar de pendientes' : 'Marcar como pendiente de gestión'}
            className={clsx(
              'absolute right-3 top-3 rounded p-1',
              c.is_pending ? 'text-amber-400' : 'text-navy-600 opacity-0 group-hover:opacity-100 hover:text-amber-400'
            )}
          >
            <Flag size={14} fill={c.is_pending ? 'currentColor' : 'none'} />
          </button>
        </li>
      ))}
    </ul>
  )
}
