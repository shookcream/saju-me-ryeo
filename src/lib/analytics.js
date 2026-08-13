const GA_MEASUREMENT_ID = 'G-2WP935ELXF'

function canTrack() {
  return typeof window !== 'undefined' && typeof window.gtag === 'function'
}

/** GA4 커스텀 이벤트 */
export function trackEvent(eventName, params = {}) {
  if (!canTrack()) return
  window.gtag('event', eventName, params)
}

/** SPA 경로 전환 시 페이지뷰 */
export function trackPageView(path = window.location.pathname) {
  if (!canTrack()) return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_title: document.title,
    page_location: window.location.href,
    send_to: GA_MEASUREMENT_ID,
  })
}
