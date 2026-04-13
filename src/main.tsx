import { Component, type ErrorInfo, type ReactNode, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import { AuthProvider } from './auth/AuthProvider'
import { ParticlesBackground } from './components/ui/ParticlesBackground'
import './index.css'
import { GoogleAnalytics } from './analytics/GoogleAnalytics'
import { AppRoutes } from './routes/AppRoutes'

registerSW({ immediate: true })

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  override state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#1a1010',
            color: '#fecaca',
            minHeight: '100vh',
          }}
        >
          <h1 style={{ marginTop: 0 }}>Chess Loop failed to load</h1>
          <p style={{ color: '#fca5a5' }}>
            {this.state.error.message}
          </p>
          <pre
            style={{
              overflow: 'auto',
              fontSize: 12,
              color: '#fecaca',
              opacity: 0.9,
            }}
          >
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Missing #root element')
}

createRoot(rootEl).render(
  <StrictMode>
    <ErrorBoundary>
      <ParticlesBackground />
      <BrowserRouter>
        <GoogleAnalytics />
        <div className="relative z-10 min-h-full">
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
