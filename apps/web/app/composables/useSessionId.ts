export const useSessionId = () => {
  const sessionId = ref('')

  onMounted(() => {
    if (!import.meta.client) return
    const key = 'mp_session_id'
    let id = localStorage.getItem(key)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(key, id)
    }
    sessionId.value = id
  })

  return sessionId
}
