import { ref } from 'vue'

let _store: Record<string, ReturnType<typeof ref>> = {}

export function useState<T>(key: string, init?: () => T) {
  if (!_store[key]) _store[key] = ref(init?.())
  return _store[key] as ReturnType<typeof ref<T>>
}

export function __resetStore() {
  _store = {}
}
