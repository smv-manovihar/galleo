const PREFIX = "galleo_"

function prefixed(key: string) {
  return PREFIX + key
}

export const storage = {
  get(key: string): string | null {
    return localStorage.getItem(prefixed(key))
  },
  set(key: string, value: string): void {
    localStorage.setItem(prefixed(key), value)
  },
  remove(key: string): void {
    localStorage.removeItem(prefixed(key))
  },
}
