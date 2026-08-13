import App from './App.jsx'
import SharedResultPage from './SharedResultPage.jsx'

function Root() {
  const match = window.location.pathname.match(/^\/result\/([^/]+)\/?$/)
  if (match) {
    return <SharedResultPage shareId={decodeURIComponent(match[1])} />
  }
  return <App />
}

export default Root
