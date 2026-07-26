import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '../../lib/api'
import { BusinessHour } from '../../types'
import { Button } from '../ui/Button'
import { Input, Label } from '../ui/Input'
import { Toggle } from '../ui/Toggle'

// Orden de visualización lunes→domingo, con su day_of_week real (convención
// JS Date.getDay(): 0=domingo...6=sábado) — igual que en MonthView.
const DAYS: { label: string; day_of_week: number }[] = [
  { label: 'Lunes', day_of_week: 1 },
  { label: 'Martes', day_of_week: 2 },
  { label: 'Miércoles', day_of_week: 3 },
  { label: 'Jueves', day_of_week: 4 },
  { label: 'Viernes', day_of_week: 5 },
  { label: 'Sábado', day_of_week: 6 },
  { label: 'Domingo', day_of_week: 0 },
]

interface Range { start_time: string; end_time: string }

function toInputTime(t: string): string {
  return t.slice(0, 5) // "09:00:00" -> "09:00"
}

export function BusinessHoursSettings({ onSaved }: { onSaved: () => void }) {
  const [rangesByDay, setRangesByDay] = useState<Record<number, Range[]>>({})
  const [slotMinutes, setSlotMinutes] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/agenda/business-hours'),
      api.get('/api/agenda/config'),
    ]).then(([hours, config]: [BusinessHour[], { slot_duration_minutes: number }]) => {
      const grouped: Record<number, Range[]> = {}
      for (const h of hours) {
        if (!grouped[h.day_of_week]) grouped[h.day_of_week] = []
        grouped[h.day_of_week].push({ start_time: toInputTime(h.start_time), end_time: toInputTime(h.end_time) })
      }
      setRangesByDay(grouped)
      setSlotMinutes(config.slot_duration_minutes)
      setLoading(false)
    })
  }, [])

  function toggleDay(day: number, enabled: boolean) {
    setRangesByDay(prev => {
      const next = { ...prev }
      if (enabled) next[day] = [{ start_time: '09:00', end_time: '14:00' }]
      else delete next[day]
      return next
    })
  }

  function addRange(day: number) {
    setRangesByDay(prev => ({ ...prev, [day]: [...(prev[day] ?? []), { start_time: '16:00', end_time: '20:00' }] }))
  }

  function updateRange(day: number, index: number, field: keyof Range, value: string) {
    setRangesByDay(prev => {
      const ranges = [...(prev[day] ?? [])]
      ranges[index] = { ...ranges[index], [field]: value }
      return { ...prev, [day]: ranges }
    })
  }

  function removeRange(day: number, index: number) {
    setRangesByDay(prev => {
      const ranges = (prev[day] ?? []).filter((_, i) => i !== index)
      const next = { ...prev }
      if (ranges.length === 0) delete next[day]
      else next[day] = ranges
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const hours = Object.entries(rangesByDay).flatMap(([day, ranges]) =>
        ranges.map(r => ({ day_of_week: Number(day), start_time: r.start_time, end_time: r.end_time }))
      )
      await api.put('/api/agenda/business-hours', { hours })
      await api.put('/api/agenda/config', { slot_duration_minutes: slotMinutes })
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-navy-400">Cargando...</p>

  return (
    <div className="space-y-5">
      <div>
        <Label>Duración de cada franja (minutos)</Label>
        <Input
          type="number" min={5} max={240} value={slotMinutes}
          onChange={e => setSlotMinutes(Number(e.target.value))}
          className="w-32"
        />
      </div>

      <div className="space-y-3">
        {DAYS.map(({ label, day_of_week }) => {
          const ranges = rangesByDay[day_of_week] ?? []
          const enabled = ranges.length > 0
          return (
            <div key={day_of_week} className="rounded-lg border border-navy-700 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-navy-100">{label}</span>
                <Toggle checked={enabled} onChange={() => toggleDay(day_of_week, !enabled)} />
              </div>
              {enabled && (
                <div className="mt-3 space-y-2">
                  {ranges.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input type="time" value={r.start_time} onChange={e => updateRange(day_of_week, i, 'start_time', e.target.value)} className="w-32" />
                      <span className="text-navy-400">—</span>
                      <Input type="time" value={r.end_time} onChange={e => updateRange(day_of_week, i, 'end_time', e.target.value)} className="w-32" />
                      <button onClick={() => removeRange(day_of_week, i)} className="text-navy-500 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  <Button variant="ghost" onClick={() => addRange(day_of_week)} className="text-xs">
                    <Plus size={14} /> Añadir tramo
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex justify-end border-t border-navy-700 pt-4">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar horario'}</Button>
      </div>
    </div>
  )
}
