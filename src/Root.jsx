import { useEffect } from 'react'
import App from './App.jsx'
import SharedResultPage from './SharedResultPage.jsx'
import { trackPageView } from './lib/analytics'

function Root() {
  const match = window.location.pathname.match(/^\/result\/([^/]+)\/?$/)

  useEffect(() => {
    trackPageView(window.location.pathname)
  }, [])

  if (match) {
    return <SharedResultPage shareId={decodeURIComponent(match[1])} />
  }
  return <App />
}

export default Root
