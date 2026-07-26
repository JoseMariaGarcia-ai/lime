import { X } from 'lucide-react'

export function Modal({
  open, onClose, title, children, wide = false,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} overflow-y-auto rounded-xl border border-navy-700 bg-navy-800 p-6 shadow-xl`}
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-navy-50">{title}</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-100">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
