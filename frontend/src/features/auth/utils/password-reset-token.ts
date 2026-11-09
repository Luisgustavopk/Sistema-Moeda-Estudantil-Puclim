// Capture before the router starts: fragments are never sent to the server and
// are removed before navigation, API requests, or page instrumentation can use them.
// The token lives only in this document's memory, never in browser storage.
let resetToken: string | null = null

function capturePasswordResetToken() {
  if (!/^\/redefinir-senha\/?$/.test(window.location.pathname)) return
  if (!window.location.hash) return
  const value = new URLSearchParams(window.location.hash.slice(1)).get('token')
  resetToken = value && /^[A-Za-z0-9_-]{32,128}$/.test(value) ? value : null
  window.history.replaceState(
    window.history.state,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
}

capturePasswordResetToken()

export function readPasswordResetToken() {
  // Also handle links opened by client-side navigation in an existing document.
  capturePasswordResetToken()
  return resetToken
}

export function clearPasswordResetToken() {
  resetToken = null
}
