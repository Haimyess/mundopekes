import { ref, computed, watch, watchEffect, nextTick, onMounted, onUnmounted, reactive } from 'vue'

export { ref, computed, watch, watchEffect, nextTick, onMounted, onUnmounted, reactive }

let _stateStore: Record<string, ReturnType<typeof ref>> = {}
export const useState = (key: string, init?: () => unknown) => {
  if (!_stateStore[key]) _stateStore[key] = ref(init?.())
  return _stateStore[key]
}
export const __resetStateStore = () => {
  _stateStore = {}
}

export const useI18n = () => ({ locale: ref('es'), t: (k: string) => k })
export const useToast = () => ({ add: () => {} })
export const useRouter = () => ({ push: () => {} })
export const navigateTo = () => {}
export const useRuntimeConfig = () => ({})
export const useNuxtApp = () => ({})
