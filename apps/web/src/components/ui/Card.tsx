import clsx from 'clsx'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={clsx('rounded-xl border border-navy-700 bg-navy-800/60 p-5 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function Badge({ children, color = 'lime' }: { children: React.ReactNode; color?: 'lime' | 'teal' | 'red' | 'gray' }) {
  const colors: Record<string, string> = {
    lime: 'bg-lime-500/15 text-lime-400',
    teal: 'bg-teal-500/15 text-teal-400',
    red: 'bg-red-500/15 text-red-400',
    gray: 'bg-navy-600/40 text-navy-300',
  }
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', colors[color])}>
      {children}
    </span>
  )
}
