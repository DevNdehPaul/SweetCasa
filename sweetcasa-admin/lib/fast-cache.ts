const memory = new Map<string, { value: unknown; time: number }>()
const PREFIX = 'sc_admin_cache:'

export function readCache<T>(key: string, maxAgeMs = 5 * 60_000): T | null {
  const mem = memory.get(key)
  if (mem && Date.now() - mem.time < maxAgeMs) return mem.value as T
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { value: T; time: number }
    if (Date.now() - parsed.time >= maxAgeMs) return null
    memory.set(key, parsed)
    return parsed.value
  } catch { return null }
}

export function writeCache<T>(key: string, value: T) {
  const entry = { value, time: Date.now() }
  memory.set(key, entry)
  if (typeof window !== 'undefined') {
    try { sessionStorage.setItem(PREFIX + key, JSON.stringify(entry)) } catch {}
  }
}

export function clearCache(prefix?: string) {
  for (const key of Array.from(memory.keys())) if (!prefix || key.startsWith(prefix)) memory.delete(key)
  if (typeof window === 'undefined') return
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i)
      if (key?.startsWith(PREFIX) && (!prefix || key.slice(PREFIX.length).startsWith(prefix))) sessionStorage.removeItem(key)
    }
  } catch {}
}
