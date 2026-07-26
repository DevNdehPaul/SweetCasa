const isBrowser = typeof document !== 'undefined'

function get(name: string): string | null {
  if (!isBrowser) return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function set(name: string, value: string, days = 7) {
  if (!isBrowser) return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  // SameSite=Lax is enough here since the dashboard calls a different-origin API
  // directly from the browser (not via cookie auth) — this cookie only gates
  // client-side route access and is read by middleware.ts for the same purpose.
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function remove(name: string) {
  if (!isBrowser) return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

const Cookies = { get, set, remove }
export default Cookies
