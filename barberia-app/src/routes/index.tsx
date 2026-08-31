import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { useUser } from '@clerk/tanstack-react-start'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/')({ component: Home })

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function Home() {
  const { user } = useUser()
  const servicesQuery = useQuery(convexQuery(api.services.list, {}))
  const services = servicesQuery.data ?? []

  const [serviceId, setServiceId] = useState<Id<'services'> | null>(null)
  const [dateISO, setDateISO] = useState(todayISO())
  const [time24, setTime24] = useState<string | null>(null)
  const [name, setName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(user?.primaryEmailAddress?.emailAddress ?? '')
  const [confirmedId, setConfirmedId] = useState<Id<'appointments'> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const slotsQuery = useQuery({
    ...convexQuery(api.appointments.availableSlots, {
      dateISO,
      serviceId: serviceId as Id<'services'>,
    }),
    enabled: !!serviceId,
  })
  const slots = slotsQuery.data ?? []

  const selectedService = useMemo(
    () => services.find((s) => s._id === serviceId) ?? null,
    [services, serviceId],
  )

  // useConvexMutation returns a plain async function (not a react-query
  // mutation object) -- we track pending/submitting state ourselves.
  const createAppointment = useConvexMutation(api.appointments.create)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!serviceId || !time24) {
      setError('Elige un servicio y un horario.')
      return
    }
    if (!name.trim() || !phone.trim()) {
      setError('Escribe tu nombre y teléfono.')
      return
    }
    setIsSubmitting(true)
    try {
      const id = await createAppointment({
        serviceId,
        dateISO,
        time24,
        clientName: name.trim(),
        clientPhone: phone.trim(),
        clientEmail: email.trim() || undefined,
      })
      setConfirmedId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo reservar la cita.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (confirmedId) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="mb-3 text-4xl">✅</div>
        <h1 className="font-serif text-2xl font-semibold">¡Cita reservada!</h1>
        <p className="mt-2 text-stone-600">
          {selectedService?.name} el {dateISO} a las {time24}.
        </p>
        <button
          className="mt-6 rounded-md border border-stone-300 px-4 py-2 text-sm hover:bg-stone-100"
          onClick={() => {
            setConfirmedId(null)
            setServiceId(null)
            setTime24(null)
          }}
        >
          Reservar otra cita
        </button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-3xl font-semibold">Reserva tu cita</h1>
      <p className="mt-1 text-stone-600">Elige el servicio, la fecha y la hora que te acomode.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            1. Servicio
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {services.map((s) => (
              <button
                type="button"
                key={s._id}
                onClick={() => {
                  setServiceId(s._id)
                  setTime24(null)
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  serviceId === s._id
                    ? 'border-stone-900 bg-stone-900 text-white'
                    : 'border-stone-200 hover:border-stone-400'
                }`}
              >
                <div className="font-medium">{s.name}</div>
                <div
                  className={`text-sm ${serviceId === s._id ? 'text-stone-300' : 'text-stone-500'}`}
                >
                  L {s.price} · {s.durationMin} min
                </div>
              </button>
            ))}
            {servicesQuery.isLoading && (
              <p className="text-sm text-stone-500">Cargando servicios…</p>
            )}
            {!servicesQuery.isLoading && services.length === 0 && (
              <p className="text-sm text-stone-500">
                Todavía no hay servicios cargados. Corre <code>npx convex run seed:run</code>.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            2. Fecha y hora
          </h2>
          <input
            type="date"
            value={dateISO}
            min={todayISO()}
            onChange={(e) => {
              setDateISO(e.target.value)
              setTime24(null)
            }}
            className="rounded-md border border-stone-300 px-3 py-2"
          />
          {serviceId && (
            <div className="mt-3 flex flex-wrap gap-2">
              {slotsQuery.isLoading && <p className="text-sm text-stone-500">Buscando horarios…</p>}
              {!slotsQuery.isLoading && slots.length === 0 && (
                <p className="text-sm text-stone-500">No hay horarios disponibles ese día.</p>
              )}
              {slots.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTime24(t)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    time24 === t
                      ? 'border-stone-900 bg-stone-900 text-white'
                      : 'border-stone-200 hover:border-stone-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
            3. Tus datos
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-2"
            />
            <input
              placeholder="Teléfono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-2"
            />
            <input
              placeholder="Correo (opcional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-2 sm:col-span-2"
            />
          </div>
        </section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-stone-900 px-4 py-3 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Reservando…' : 'Reservar cita'}
        </button>
      </form>
    </div>
  )
}
