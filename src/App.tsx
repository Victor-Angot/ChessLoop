import { lazy, Suspense, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { GraduationCap, Info, type LucideIcon } from 'lucide-react'
import { useAuth } from './auth/useAuth'
import { setTrainerDatabaseUser } from './db/database'
import { Modal } from './components/ui/Modal'
import { useTrainingShortcuts } from './hooks/useTrainingShortcuts'
import type { MainSection } from './stores/chess/storeTypes'
import { useChessStore } from './stores/useChessStore'

const AboutPage = lazy(() =>
  import('./components/about/AboutPage').then((m) => ({ default: m.AboutPage })),
)
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

function MainSectionNavItem({
  id,
  icon: Icon,
  label,
  active,
  onSelect,
}: {
  id: MainSection
  icon: LucideIcon
  label: string
  active: boolean
  onSelect: (s: MainSection) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={clsx(
        'flex items-center justify-center gap-1.5 rounded-[calc(var(--radius-sm)-1px)] px-[0.85rem] py-2.5 text-sm font-semibold leading-snug transition-[color,background,box-shadow] duration-150',
        'focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-2)]',
        active
          ? 'bg-[var(--accent)] text-white shadow-sm'
          : 'text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

function MainSectionNav({
  section,
  onSelect,
}: {
  section: MainSection
  onSelect: (s: MainSection) => void
}) {
  return (
    <nav
      className="flex min-w-0 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-px shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      aria-label="Main sections"
    >
      <MainSectionNavItem
        id="trainer"
        icon={GraduationCap}
        label="Trainer"
        active={section === 'trainer'}
        onSelect={onSelect}
      />
      <MainSectionNavItem
        id="about"
        icon={Info}
        label="About"
        active={section === 'about'}
        onSelect={onSelect}
      />
    </nav>
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
  const mainSection = useChessStore((s) => s.ui.mainSection)
  const setMainSection = useChessStore((s) => s.setMainSection)
  const exitAnalysisMode = useChessStore((s) => s.exitAnalysisMode)
  const analysisEnabled = useChessStore((s) => s.analysisMode.enabled)

  const go = (s: MainSection) => {
    if (s !== 'trainer') exitAnalysisMode()
    setMainSection(s)
  }

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

  const trainerActive = mainSection === 'trainer'

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
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 sm:gap-x-4">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6">
              <div className="flex min-w-0 shrink-0 items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Chess Loop</h1>
                <span className="hidden text-sm text-[var(--muted)] sm:inline">
                  Spaced repetition
                </span>
              </div>
              <MainSectionNav section={mainSection} onSelect={go} />
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              {trainerActive && user ? (
                <>
                  <button
                    type="button"
                    className="btn btn-toggle"
                    onClick={() => toggleLinesPanel()}
                    aria-pressed={showLinesPanel}
                  >
                    Library
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-toggle"
                    onClick={() => toggleImportPanel()}
                    aria-pressed={showImportPanel}
                  >
                    Import PGN
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
                  {logoutBusy ? 'Logging out…' : 'Log out'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="container-app flex-1 py-8 sm:py-10">
        {mainSection === 'about' ? (
          <Suspense fallback={<TrainerSectionFallback />}>
            <AboutPage />
          </Suspense>
        ) : (
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
              </div>
            ) : null}
          </div>
        )}
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
