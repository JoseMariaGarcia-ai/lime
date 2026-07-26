import { ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'
import { Appointment } from '../../types'
import { Button } from '../ui/Button'

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Genera la cuadrícula de semanas completas (empezando en lunes, convención
// española) que cubre el mes indicado — incluye días del mes anterior/
// siguiente para rellenar la primera y última semana.
function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1)
  // getDay(): 0=domingo...6=sábado. Para empezar en lunes, domingo pasa a
  // ser el último día de la semana (offset 6) en vez del primero (offset 0).
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7
  const gridStart = new Date(year, month, 1 - firstWeekday)

  const lastOfMonth = new Date(year, month + 1, 0)
  const lastWeekday = (lastOfMonth.getDay() + 6) % 7
  const gridEnd = new Date(year, month + 1, 0 + (6 - lastWeekday))

  const days: Date[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    days.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
}

export function MonthView({
  year, month, appointments, onSelectDay, onNavigate,
}: {
  year: number
  month: number
  appointments: Appointment[]
  onSelectDay: (date: Date) => void
  onNavigate: (direction: -1 | 1) => void
}) {
  const days = buildMonthGrid(year, month)
  const today = toDateKey(new Date())

  const countsByDay = new Map<string, number>()
  for (const a of appointments) {
    const key = toDateKey(new Date(a.start_at))
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1)
  }

  const monthLabel = new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => onNavigate(-1)}><ChevronLeft size={18} /></Button>
        <h2 className="text-lg font-semibold capitalize text-navy-50">{monthLabel}</h2>
        <Button variant="ghost" onClick={() => onNavigate(1)}><ChevronRight size={18} /></Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-navy-400">
        {WEEKDAY_LABELS.map(d => <div key={d} className="py-2">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const key = toDateKey(d)
          const inMonth = d.getMonth() === month
          const count = countsByDay.get(key) ?? 0
          const isToday = key === today
          return (
            <button
              key={key}
              onClick={() => onSelectDay(d)}
              className={clsx(
                'flex h-20 flex-col items-start rounded-lg border p-2 text-left transition-colors',
                inMonth ? 'border-navy-700 bg-navy-800/60 hover:border-lime-500/50' : 'border-navy-800 bg-navy-900/40 text-navy-600',
                isToday && 'ring-1 ring-lime-500'
              )}
            >
              <span className={clsx('text-sm font-medium', inMonth ? 'text-navy-100' : 'text-navy-600')}>
                {d.getDate()}
              </span>
              {count > 0 && (
                <span className="mt-auto rounded-full bg-lime-500/15 px-2 py-0.5 text-xs font-medium text-lime-400">
                  {count} cita{count === 1 ? '' : 's'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
