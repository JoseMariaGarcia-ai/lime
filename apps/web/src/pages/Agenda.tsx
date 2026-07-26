import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Settings2 } from 'lucide-react'
import { api } from '../lib/api'
import { Appointment, BusinessHour, ClientListItem } from '../types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { AppointmentForm } from '../components/agenda/AppointmentForm'
import { MonthView } from '../components/agenda/MonthView'
import { DayView } from '../components/agenda/DayView'
import { BusinessHoursSettings } from '../components/agenda/BusinessHoursSettings'

function monthRange(year: number, month: number) {
  const from = new Date(year, month, 1)
  const to = new Date(year, month + 1, 0, 23, 59, 59)
  return { from: from.toISOString(), to: to.toISOString() }
}

function dayRange(date: Date) {
  const from = new Date(date); from.setHours(0, 0, 0, 0)
  const to = new Date(date); to.setHours(23, 59, 59, 999)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function Agenda() {
  const today = new Date()
  const [view, setView] = useState<'month' | 'day'>('month')
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const [monthAppointments, setMonthAppointments] = useState<Appointment[]>([])
  const [dayAppointments, setDayAppointments] = useState<Appointment[]>([])
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([])
  const [slotMinutes, setSlotMinutes] = useState(30)
  const [clients, setClients] = useState<ClientListItem[]>([])

  const [editing, setEditing] = useState<Appointment | 'new' | null>(null)
  const [presetTimes, setPresetTimes] = useState<{ start_at: string; end_at: string } | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  async function loadMonthAppointments() {
    const { from, to } = monthRange(cursor.year, cursor.month)
    setMonthAppointments(await api.get(`/api/agenda?from=${from}&to=${to}`))
  }

  async function loadDayAppointments() {
    const { from, to } = dayRange(selectedDate)
    setDayAppointments(await api.get(`/api/agenda?from=${from}&to=${to}`))
  }

  async function loadStaticData() {
    const [hours, config, clientsData] = await Promise.all([
      api.get('/api/agenda/business-hours'),
      api.get('/api/agenda/config'),
      api.get('/api/clients'),
    ])
    setBusinessHours(hours)
    setSlotMinutes(config.slot_duration_minutes)
    setClients(clientsData)
  }

  useEffect(() => { loadStaticData() }, [])
  useEffect(() => { loadMonthAppointments() }, [cursor])
  useEffect(() => { if (view === 'day') loadDayAppointments() }, [view, selectedDate])

  function goToDay(date: Date) {
    setSelectedDate(date)
    setView('day')
  }

  function navigateMonth(direction: -1 | 1) {
    setCursor(prev => {
      const next = new Date(prev.year, prev.month + direction, 1)
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  function navigateDay(direction: -1 | 1) {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + direction)
    setSelectedDate(next)
    if (next.getMonth() !== cursor.month || next.getFullYear() !== cursor.year) {
      setCursor({ year: next.getFullYear(), month: next.getMonth() })
    }
  }

  function openCreateAt(start: Date, end: Date) {
    setPresetTimes({ start_at: start.toISOString(), end_at: end.toISOString() })
    setEditing('new')
  }

  function openCreateAnyway() {
    setPresetTimes(null)
    setEditing('new')
  }

  async function refreshAfterChange() {
    await loadMonthAppointments()
    if (view === 'day') await loadDayAppointments()
  }

  async function handleSubmit(values: any) {
    if (editing === 'new') await api.post('/api/agenda', values)
    else await api.put(`/api/agenda/${(editing as Appointment).id}`, values)
    setEditing(null)
    setPresetTimes(null)
    await refreshAfterChange()
  }

  async function handleDelete() {
    if (editing === 'new' || !editing) return
    if (!confirm('¿Eliminar esta cita?')) return
    await api.delete(`/api/agenda/${editing.id}`)
    setEditing(null)
    await refreshAfterChange()
  }

  const hoursForSelectedDay = businessHours.filter(h => h.day_of_week === selectedDate.getDay())

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          {view === 'day' ? (
            <button onClick={() => setView('month')} className="flex items-center gap-2 text-sm text-navy-400 hover:text-navy-100">
              <ArrowLeft size={16} /> Volver al mes
            </button>
          ) : (
            <div>
              <h1 className="text-xl font-semibold text-navy-50">Agenda</h1>
              <p className="text-sm text-navy-400">Vista mensual — pincha un día para ver sus citas.</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowSettings(true)}>
            <Settings2 size={16} /> Horario de apertura
          </Button>
          <Button onClick={openCreateAnyway}>
            <Plus size={16} /> Nueva cita
          </Button>
        </div>
      </div>

      <Card>
        {view === 'month' ? (
          <MonthView
            year={cursor.year} month={cursor.month} appointments={monthAppointments}
            onSelectDay={goToDay} onNavigate={navigateMonth}
          />
        ) : (
          <DayView
            date={selectedDate} appointments={dayAppointments} hoursForDay={hoursForSelectedDay}
            slotMinutes={slotMinutes} onNavigate={navigateDay}
            onCreateAt={openCreateAt} onSelectAppointment={setEditing} onCreateAnyway={openCreateAnyway}
          />
        )}
      </Card>

      <Modal
        open={!!editing}
        onClose={() => { setEditing(null); setPresetTimes(null) }}
        title={editing === 'new' ? 'Nueva cita' : 'Editar cita'}
      >
        {editing && (
          <AppointmentForm
            initial={editing === 'new' ? (presetTimes ?? undefined) : editing}
            clients={clients}
            onSubmit={handleSubmit}
            onCancel={() => { setEditing(null); setPresetTimes(null) }}
            onDelete={editing !== 'new' ? handleDelete : undefined}
          />
        )}
      </Modal>

      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Horario de apertura" wide>
        <BusinessHoursSettings onSaved={async () => { setShowSettings(false); await loadStaticData() }} />
      </Modal>
    </div>
  )
}
