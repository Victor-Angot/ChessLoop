import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function getGaId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
  return id || undefined
}

function useGtagInit(): void {
  useEffect(() => {
    const id = getGaId()
    if (!id) return
    if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) return

    const w = window as Window & {
      dataLayer?: unknown[]
      gtag?: (...args: unknown[]) => void
    }
    w.dataLayer = w.dataLayer || []
    w.gtag = function gtag(...args: unknown[]) {
      w.dataLayer!.push(args)
    }
    w.gtag('js', new Date())

    const s = document.createElement('script')
    s.async = true
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(s)

    w.gtag('config', id, { send_page_view: false })
  }, [])
}

/**
 * Place inside `<BrowserRouter>`. Loads GA4 when `VITE_GA_MEASUREMENT_ID` is set
 * and sends `page_view` on SPA navigations.
 */
export function GoogleAnalytics(): null {
  useGtagInit()
  const location = useLocation()

  useEffect(() => {
    const id = getGaId()
    if (!id) return
    const gtag = window.gtag
    if (typeof gtag !== 'function') return
    const path = `${location.pathname}${location.search}${location.hash}`
    gtag('event', 'page_view', {
      page_path: path,
      page_title: document.title,
    })
  }, [location.pathname, location.search, location.hash])

  return null
}
