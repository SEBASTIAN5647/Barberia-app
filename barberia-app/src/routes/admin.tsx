import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { useAuth, SignInButton } from '@clerk/tanstack-react-start'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/admin')({ component: Admin })

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function Admin() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold">Admin</h1>
        <p className="mt-2 text-stone-600">Inicia sesión para entrar al panel.</p>
        <SignInButton mode="modal">
          <button className="mt-6 rounded-md bg-stone-900 px-4 py-2 text-white hover:bg-stone-700">
            Iniciar sesión
          </button>
        </SignInButton>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        ⚠️ Cualquier persona que inicie sesión puede ver esta página por ahora. Antes de compartir
        el link, agrega una verificación de rol de admin (ver README, sección "Pendiente: roles").
      </div>
      <h1 className="font-serif text-3xl font-semibold">Panel</h1>
      <DayView />
      <ServicesPanel />
      <BlocksPanel />
    </div>
  )
}

function DayView() {
  const [dateISO, setDateISO] = useState(todayISO())
  const apptsQuery = useQuery(convexQuery(api.appointments.listByDate, { dateISO }))
  const appts = (apptsQuery.data ?? []).slice().sort((a, b) => a.time24.localeCompare(b.time24))

  const markCompleted = useConvexMutation(api.appointments.markCompleted)
  const markNoShow = useConvexMutation(api.appointments.markNoShow)
  const adminCancel = useConvexMutation(api.appointments.adminCancel)

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Citas del día
      </h2>
      <input
        type="date"
        value={dateISO}
        onChange={(e) => setDateISO(e.target.value)}
        className="rounded-md border border-stone-300 px-3 py-2"
      />
      <div className="mt-4 space-y-2">
        {appts.length === 0 && <p className="text-sm text-stone-500">Sin citas ese día.</p>}
        {appts.map((a) => (
          <div
            key={a._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 px-4 py-3"
          >
            <div>
              <div className="font-medium">
                {a.time24} · {a.serviceName}
              </div>
              <div className="text-sm text-stone-500">
                {a.clientName} · {a.clientPhone} · L {a.price}
                <span className="ml-2 text-xs uppercase text-stone-400">{a.status}</span>
              </div>
            </div>
            {a.status === 'confirmed' && (
              <div className="flex gap-2">
                <button
                  onClick={() => markCompleted({ id: a._id })}
                  className="rounded-md border border-emerald-300 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-50"
                >
                  Completada
                </button>
                <button
                  onClick={() => markNoShow({ id: a._id })}
                  className="rounded-md border border-red-300 px-2.5 py-1 text-xs text-red-700 hover:bg-red-50"
                >
                  No asistió
                </button>
                <button
                  onClick={() => adminCancel({ id: a._id })}
                  className="rounded-md border border-stone-300 px-2.5 py-1 text-xs text-stone-600 hover:bg-stone-100"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function ServicesPanel() {
  const servicesQuery = useQuery(convexQuery(api.services.listAll, {}))
  const services = servicesQuery.data ?? []
  const createService = useConvexMutation(api.services.create)
  const updateService = useConvexMutation(api.services.update)

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [durationMin, setDurationMin] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !price || !durationMin) return
    await createService({ name: name.trim(), price: Number(price), durationMin: Number(durationMin) })
    setName('')
    setPrice('')
    setDurationMin('')
  }

  return (
    <section className="mt-10">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Servicios
      </h2>
      <div className="space-y-2">
        {services.map((s) => (
          <div
            key={s._id}
            className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-2"
          >
            <div>
              <span className={s.active ? '' : 'text-stone-400 line-through'}>{s.name}</span>
              <span className="ml-2 text-sm text-stone-500">
                L {s.price} · {s.durationMin} min
              </span>
            </div>
            <button
              onClick={() => updateService({ id: s._id, active: !s.active })}
              className="text-xs text-stone-500 underline"
            >
              {s.active ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="mt-3 flex flex-wrap gap-2">
        <input
          placeholder="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Precio (L)"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
        <input
          placeholder="Minutos"
          type="number"
          value={durationMin}
          onChange={(e) => setDurationMin(e.target.value)}
          className="w-24 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
        >
          Agregar
        </button>
      </form>
    </section>
  )
}

const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

function BlocksPanel() {
  const blocksQuery = useQuery(convexQuery(api.blocks.list, {}))
  const blocks = blocksQuery.data ?? []
  const createBlock = useConvexMutation(api.blocks.create)
  const removeBlock = useConvexMutation(api.blocks.remove)

  const [title, setTitle] = useState('')
  const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'daily'>('weekly')
  const [weekday, setWeekday] = useState('0')
  const [dateISO, setDateISO] = useState(todayISO())
  const [startTime, setStartTime] = useState('00:00')
  const [endTime, setEndTime] = useState('23:59')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await createBlock({
      title: title.trim(),
      recurrence,
      dateISO: recurrence === 'none' ? dateISO : undefined,
      weekday: recurrence === 'weekly' ? Number(weekday) : undefined,
      startTime,
      endTime,
    })
    setTitle('')
  }

  return (
    <section className="mt-10 mb-16">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Bloqueos de horario
      </h2>
      <div className="space-y-2">
        {blocks.map((b) => (
          <div
            key={b._id}
            className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-2 text-sm"
          >
            <div>
              {b.title} ·{' '}
              {b.recurrence === 'none' && b.dateISO}
              {b.recurrence === 'weekly' && `cada ${WEEKDAYS[b.weekday ?? 0]}`}
              {b.recurrence === 'daily' && 'todos los días'} · {b.startTime}–{b.endTime}
            </div>
            <button
              onClick={() => removeBlock({ id: b._id })}
              className="text-xs text-red-600 underline"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          placeholder="Título (ej. Almuerzo)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
          className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        >
          <option value="none">Un solo día</option>
          <option value="weekly">Cada semana</option>
          <option value="daily">Todos los días</option>
        </select>
        {recurrence === 'none' && (
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        )}
        {recurrence === 'weekly' && (
          <select
            value={weekday}
            onChange={(e) => setWeekday(e.target.value)}
            className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          >
            {WEEKDAYS.map((w, i) => (
              <option key={w} value={i}>
                {w}
              </option>
            ))}
          </select>
        )}
        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="rounded-md border border-stone-300 px-2 py-1.5 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-700"
        >
          Agregar bloqueo
        </button>
      </form>
    </section>
  )
}
