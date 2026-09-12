import { useEffect, useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const KEY_PREFIX = 'scrollpos:'

// Manually reimplements what react-router's data-router <ScrollRestoration>
// gives you for free, since this app uses plain <Routes>/<Route>. Every
// route's whole page scrolls at the window/document level (see Layout.jsx —
// no nested overflow container), so window.scrollY is the right thing to
// save/restore.
//
// On back/forward navigation (POP), the browser doesn't know where a list
// page's content will end up — it renders short, then grows once its data
// finishes loading — so a single scrollTo right away isn't reliable. Saving
// continuously (keyed by the exact pathname+search, which already encodes
// page/per_page/filters for pages that sync them to the URL) and restoring
// with a couple of retries after mount covers that.
export default function useScrollRestoration() {
  const location = useLocation()
  const navType = useNavigationType() // 'POP' | 'PUSH' | 'REPLACE'
  const key = location.pathname + location.search

  useEffect(() => {
    let raf = null
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        sessionStorage.setItem(KEY_PREFIX + key, String(window.scrollY))
        raf = null
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [key])

  useLayoutEffect(() => {
    // REPLACE covers this app's own bookkeeping (syncing page/per_page/
    // filters into the URL as the user interacts with a list) — that's not
    // a real navigation from the user's point of view, so leave scroll
    // exactly where it is instead of jumping it around on every click.
    if (navType === 'REPLACE') return

    if (navType === 'PUSH') {
      // A fresh forward navigation (clicking into a lead, a sidebar link,
      // etc.) always starts at the top, like a normal page load would.
      window.scrollTo(0, 0)
      return
    }

    // POP — Back/Forward. Restore whatever was saved for this exact
    // pathname+search, if anything.
    const saved = sessionStorage.getItem(KEY_PREFIX + key)
    if (saved == null) { window.scrollTo(0, 0); return }
    const y = parseInt(saved, 10)
    window.scrollTo(0, y)
    // Retry a couple of times as async-loaded content grows the page —
    // cheap and self-cancelling once the component/route changes again.
    const t1 = setTimeout(() => window.scrollTo(0, y), 100)
    const t2 = setTimeout(() => window.scrollTo(0, y), 350)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [key, navType])
}
