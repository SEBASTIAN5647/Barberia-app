import { Link } from '@tanstack/react-router'
import { Show, SignInButton, UserButton } from '@clerk/tanstack-react-start'

export function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link to="/" className="font-serif text-lg font-semibold tracking-tight">
          Barbería
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="hover:text-stone-600" activeProps={{ className: 'font-semibold' }}>
            Reservar
          </Link>
          <Show when="signed-in">
            <Link
              to="/mis-citas"
              className="hover:text-stone-600"
              activeProps={{ className: 'font-semibold' }}
            >
              Mis citas
            </Link>
            <Link
              to="/admin"
              className="hover:text-stone-600"
              activeProps={{ className: 'font-semibold' }}
            >
              Admin
            </Link>
            <UserButton afterSignOutUrl="/" />
          </Show>
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="rounded-md bg-stone-900 px-3 py-1.5 text-white hover:bg-stone-700">
                Iniciar sesión
              </button>
            </SignInButton>
          </Show>
        </nav>
      </div>
    </header>
  )
}
