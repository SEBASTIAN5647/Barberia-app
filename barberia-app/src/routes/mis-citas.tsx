import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { convexQuery, useConvexMutation } from '@convex-dev/react-query'
import { useAuth, SignInButton } from '@clerk/tanstack-react-start'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'

export const Route = createFileRoute('/mis-citas')({ component: MisCitas })

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'Confirmada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
}

function MisCitas() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return null

  if (!isSignedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold">Mis citas</h1>
        <p className="mt-2 text-stone-600">Inicia sesión para ver tus citas.</p>
        <SignInButton mode="modal">
          <button className="mt-6 rounded-md bg-stone-900 px-4 py-2 text-white hover:bg-stone-700">
            Iniciar sesión
          </button>
        </SignInButton>
      </div>
    )
  }

  return <MisCitasContent />
}

function MisCitasContent() {
  const apptsQuery = useQuery(convexQuery(api.appointments.listMine, {}))
  const appts = apptsQuery.data ?? []
  const cancel = useConvexMutation(api.appointments.cancel)
  const rate = useConvexMutation(api.appointments.rate)
  const [cancelingId, setCancelingId] = useState<Id<'appointments'> | null>(null)

  const upcoming = appts.filter((a) => a.status === 'confirmed')
  const history = appts.filter((a) => a.status !== 'confirmed')

  async function handleCancel(id: Id<'appointments'>) {
    setCancelingId(id)
    try {
      await cancel({ id })
    } finally {
      setCancelingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-3xl font-semibold">Mis citas</h1>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Próximas
        </h2>
        {upcoming.length === 0 && (
          <p className="text-sm text-stone-500">No tienes citas próximas.</p>
        )}
        <div className="space-y-3">
          {upcoming.map((a) => (
            <div
              key={a._id}
              className="flex items-center justify-between rounded-lg border border-stone-200 px-4 py-3"
            >
              <div>
                <div className="font-medium">{a.serviceName}</div>
                <div className="text-sm text-stone-500">
                  {a.dateISO} · {a.time24} · L {a.price}
                  {a.depositRequired && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-800">
                      💰 Seña pendiente
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleCancel(a._id)}
                disabled={cancelingId === a._id}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-stone-500">
          Historial
        </h2>
        {history.length === 0 && <p className="text-sm text-stone-500">Aún no tienes historial.</p>}
        <div className="space-y-3">
          {history.map((a) => (
            <div key={a._id} className="rounded-lg border border-stone-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{a.serviceName}</div>
                <span className="text-xs text-stone-500">{STATUS_LABEL[a.status]}</span>
              </div>
              <div className="text-sm text-stone-500">
                {a.dateISO} · {a.time24} · L {a.price}
              </div>
              {a.status === 'completed' && (
                <RatingRow
                  appointmentId={a._id}
                  rating={a.rating}
                  onRate={(r) => rate({ id: a._id, rating: r })}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function RatingRow({
  rating,
  onRate,
}: {
  appointmentId: Id<'appointments'>
  rating: number | undefined
  onRate: (rating: number) => void
}) {
  const [pending, setPending] = useState<number | null>(null)

  if (rating) {
    return (
      <div className="mt-2 text-sm text-amber-600">{'★'.repeat(rating) + '☆'.repeat(5 - rating)}</div>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          onClick={() => setPending(i)}
          className={`text-lg ${(pending ?? 0) >= i ? 'text-amber-500' : 'text-stone-300'}`}
          aria-label={`${i} estrellas`}
        >
          ★
        </button>
      ))}
      {pending && (
        <button
          onClick={() => onRate(pending)}
          className="ml-2 text-xs font-medium text-stone-700 underline"
        >
          Guardar calificación
        </button>
      )}
    </div>
  )
}
