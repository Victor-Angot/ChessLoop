import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AboutPage as AboutContent } from '../components/about/AboutPage'
import { useAuth } from '../auth/useAuth'
import { useChessStore } from '../stores/useChessStore'
import { copy } from '../content/texts'

export default function AboutPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  useEffect(() => {
    useChessStore.getState().setMainSection('about')
    return () => {
      useChessStore.getState().setMainSection('trainer')
    }
  }, [])

  const onLogout = async () => {
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container-app py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 sm:gap-x-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
              <div className="flex min-w-0 shrink-0 items-center gap-2.5">
                <Link to="/" className="min-w-0">
                  <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                    {copy.app.name}
                  </h1>
                </Link>
                <span className="badge hidden sm:inline-flex">{copy.app.tagline}</span>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              {user ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => void onLogout()}
                >
                  {copy.buttons.logout}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="container-app flex-1 py-8 sm:py-10">
        <AboutContent />
      </main>
    </div>
  )
}

