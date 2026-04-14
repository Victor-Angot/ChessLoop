import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function getGaId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim()
  return id || undefined
}

/**
 * Place inside `<BrowserRouter>`. Loads GA4 when `VITE_GA_MEASUREMENT_ID` is set
 * and sends `page_view` on SPA navigations.
 */
export function GoogleAnalytics(): null {
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
