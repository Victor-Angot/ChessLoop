import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { setTrainerDatabaseUser } from './db/database'
import { Modal } from './components/ui/Modal'
import { useTrainingShortcuts } from './hooks/useTrainingShortcuts'
import { useChessStore } from './stores/useChessStore'
import { copy } from './content/texts'
import { TrainingStatusMessage } from './components/review/TrainingStatusMessage'

const ReviewSession = lazy(() =>
  import('./components/ReviewSession').then((m) => ({
    default: m.ReviewSession,
  })),
)
const StatsPanel = lazy(() =>
  import('./components/StatsPanel').then((m) => ({ default: m.StatsPanel })),
)
const LinesList = lazy(() =>
  import('./components/LinesList').then((m) => ({ default: m.LinesList })),
)
const PGNImporter = lazy(() =>
  import('./components/PGNImporter').then((m) => ({ default: m.PGNImporter })),
)
import { PgnCommentsPanel } from './components/review/PgnCommentsPanel'

function TrainerSectionFallback() {
  return (
    <div
      className="flex min-h-[320px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 text-sm text-[var(--muted)]"
      role="status"
      aria-live="polite"
    >
      Loading…
    </div>
  )
}

export default function App() {
  const navigate = useNavigate()
  const { user, status: authStatus, logout } = useAuth()
  const [logoutBusy, setLogoutBusy] = useState(false)
  const reloadFromDb = useChessStore((s) => s.reloadFromDb)
  const setNow = useChessStore((s) => s.setNow)
  const toggleLinesPanel = useChessStore((s) => s.toggleLinesPanel)
  const toggleImportPanel = useChessStore((s) => s.toggleImportPanel)
  const setLinesPanelOpen = useChessStore((s) => s.setLinesPanelOpen)
  const setImportPanelOpen = useChessStore((s) => s.setImportPanelOpen)
  const showLinesPanel = useChessStore((s) => s.ui.showLinesPanel)
  const showImportPanel = useChessStore((s) => s.ui.showImportPanel)
  const exitAnalysisMode = useChessStore((s) => s.exitAnalysisMode)
  const analysisEnabled = useChessStore((s) => s.analysisMode.enabled)

  useEffect(() => {
    void (async () => {
      if (authStatus === 'loading') {
        await setTrainerDatabaseUser(null)
        await reloadFromDb()
        return
      }
      await setTrainerDatabaseUser(user?.id ?? null)
      await reloadFromDb()
    })()
  }, [user?.id, authStatus, reloadFromDb])

  useEffect(() => {
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(id)
  }, [setNow])

  useEffect(() => {
    return () => {
      exitAnalysisMode()
    }
  }, [exitAnalysisMode])

  useTrainingShortcuts()

  const onLogout = async () => {
    setLogoutBusy(true)
    try {
      await logout()
      navigate('/', { replace: true })
    } finally {
      setLogoutBusy(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container-app py-3 sm:py-4">
          <div className="topbar-row flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 sm:gap-x-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
              <div className="flex min-w-0 shrink-0 items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {copy.app.name}
                </h1>
                <span className="badge hidden sm:inline-flex">{copy.app.tagline}</span>
              </div>
              <Link to="/about" className="muted text-sm hover:text-[var(--text)]">
                {copy.nav.about}
              </Link>
            </div>
            <div className="topbar-actions flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              {user ? (
                <>
                  <button
                    type="button"
                    className="btn btn-toggle"
                    onClick={() => toggleLinesPanel()}
                    aria-pressed={showLinesPanel}
                  >
                    {copy.buttons.library}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-toggle"
                    onClick={() => toggleImportPanel()}
                    aria-pressed={showImportPanel}
                  >
                    {copy.buttons.importPgn}
                  </button>
                </>
              ) : null}
              {user ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={logoutBusy}
                  onClick={() => void onLogout()}
                >
                  {logoutBusy ? copy.buttons.loggingOut : copy.buttons.logout}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="container-app flex-1 py-8 sm:py-10">
        <div
          className={`grid gap-6 sm:gap-8 ${analysisEnabled ? '' : 'lg:grid-cols-[minmax(0,1fr)_minmax(22rem,28rem)] xl:grid-cols-[minmax(0,1fr)_minmax(24rem,32rem)]'}`}
        >
          <div className="min-w-0 space-y-4">
            <Suspense fallback={<TrainerSectionFallback />}>
              <ReviewSession />
            </Suspense>
          </div>
          {!analysisEnabled ? (
            <div className="min-w-0 space-y-4">
              <Suspense fallback={<TrainerSectionFallback />}>
                <StatsPanel />
              </Suspense>
              <TrainingStatusMessage />
              <PgnCommentsPanel />
            </div>
          ) : null}
        </div>
      </main>

      {user && showLinesPanel ? (
        <Modal onClose={() => setLinesPanelOpen(false)} className="max-w-4xl">
          <Suspense fallback={<TrainerSectionFallback />}>
            <LinesList />
          </Suspense>
        </Modal>
      ) : null}
      {user && showImportPanel ? (
        <Modal onClose={() => setImportPanelOpen(false)}>
          <Suspense fallback={<TrainerSectionFallback />}>
            <PGNImporter />
          </Suspense>
        </Modal>
      ) : null}
    </div>
  )
}
