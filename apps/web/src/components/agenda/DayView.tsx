import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import clsx from 'clsx'
import { Appointment, BusinessHour } from '../../types'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Card'

const STATUS_COLOR: Record<string, 'lime' | 'teal' | 'red' | 'gray'> = {
  programada: 'teal', completada: 'lime', cancelada: 'red',
}

interface Slot {
  start: Date
  end: Date
  label: string
}

function buildSlots(date: Date, hoursForDay: BusinessHour[], slotMinutes: number): Slot[] {
  const slots: Slot[] = []
  for (const h of hoursForDay) {
    const [sh, sm] = h.start_time.split(':').map(Number)
    const [eh, em] = h.end_time.split(':').map(Number)
    const rangeStart = new Date(date); rangeStart.setHours(sh, sm, 0, 0)
    const rangeEnd = new Date(date); rangeEnd.setHours(eh, em, 0, 0)
    let cursor = new Date(rangeStart)
    while (cursor.getTime() + slotMinutes * 60000 <= rangeEnd.getTime()) {
      const end = new Date(cursor.getTime() + slotMinutes * 60000)
      slots.push({
        start: new Date(cursor),
        end,
        label: cursor.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      })
      cursor = end
    }
  }
  return slots
}

export function DayView({
  date, appointments, hoursForDay, slotMinutes, onNavigate, onCreateAt, onSelectAppointment, onCreateAnyway,
}: {
  date: Date
  appointments: Appointment[]
  hoursForDay: BusinessHour[]
  slotMinutes: number
  onNavigate: (direction: -1 | 1) => void
  onCreateAt: (start: Date, end: Date) => void
  onSelectAppointment: (a: Appointment) => void
  onCreateAnyway: () => void
}) {
  const slots = buildSlots(date, hoursForDay, slotMinutes)
  const dayLabel = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  function appointmentsInSlot(slot: Slot): Appointment[] {
    return appointments.filter(a => {
      const start = new Date(a.start_at)
      return start >= slot.start && start < slot.end
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => onNavigate(-1)}><ChevronLeft size={18} /></Button>
        <h2 className="text-lg font-semibold capitalize text-navy-50">{dayLabel}</h2>
        <Button variant="ghost" onClick={() => onNavigate(1)}><ChevronRight size={18} /></Button>
      </div>

      {slots.length === 0 ? (
        <div className="rounded-xl border border-navy-700 bg-navy-800/60 p-6 text-center">
          <p className="mb-3 text-navy-400">Este día no tiene tramos horarios configurados (día cerrado).</p>
          <Button variant="secondary" onClick={onCreateAnyway}>
            <Plus size={16} /> Añadir cita de todos modos
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {slots.map(slot => {
            const items = appointmentsInSlot(slot)
            return (
              <div key={slot.start.toISOString()} className="flex gap-3 border-b border-navy-700/50 py-2">
                <span className="w-14 shrink-0 pt-1 text-sm text-navy-400">{slot.label}</span>
                <div className="flex-1">
                  {items.length === 0 ? (
                    <button
                      onClick={() => onCreateAt(slot.start, slot.end)}
                      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-navy-700 px-3 py-2 text-sm text-navy-500 hover:border-lime-500/50 hover:text-lime-400"
                    >
                      <Plus size={14} /> Añadir cita
                    </button>
                  ) : (
                    <div className="space-y-1">
                      {items.map(a => (
                        <button
                          key={a.id}
                          onClick={() => onSelectAppointment(a)}
                          className="flex w-full items-center justify-between rounded-lg bg-navy-700/50 px-3 py-2 text-left hover:bg-navy-700"
                        >
                          <div>
                            <p className={clsx('text-sm font-medium text-navy-50')}>{a.title}</p>
                            {(a.client_nombre || a.location) && (
                              <p className="text-xs text-navy-400">
                                {a.client_nombre ?? ''}{a.client_nombre && a.location ? ' · ' : ''}{a.location ?? ''}
                              </p>
                            )}
                          </div>
                          <Badge color={STATUS_COLOR[a.status]}>{a.status}</Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
