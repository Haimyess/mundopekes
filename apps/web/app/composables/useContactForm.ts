import type { ContactIntent } from '~/types/contact'

export function useContactForm() {
  // ✅ Llamado al top-level del composable (que se ejecuta dentro de setup)
  const { t, locale } = useI18n()

  const isOpen = useState('contact:isOpen', () => false)
  const isLoading = useState('contact:isLoading', () => false)
  const intent = useState<ContactIntent>('contact:intent', () => 'other')
  const prefillActivityId = useState<string | undefined>(
    'contact:prefillActivityId',
    () => undefined
  )
  const prefillActivityTitle = useState<string | undefined>(
    'contact:prefillActivityTitle',
    () => undefined
  )

  const form = ref({ name: '', email: '', message: '' })

  function open(
    selectedIntent?: ContactIntent,
    prefill?: { activityId?: string; activityTitle?: string }
  ) {
    intent.value = selectedIntent ?? 'other'
    prefillActivityId.value = prefill?.activityId
    prefillActivityTitle.value = prefill?.activityTitle
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    isLoading.value = false
    form.value = { name: '', email: '', message: '' }
    prefillActivityId.value = undefined
    prefillActivityTitle.value = undefined
  }

  async function submit() {
    const toast = useToast()
    const { trackContactSend } = useTracking()

    isLoading.value = true
    try {
      await $fetch('/api/contact', {
        method: 'POST',
        body: {
          intent: intent.value,
          name: form.value.name,
          email: form.value.email,
          message: form.value.message,
          activityId: prefillActivityId.value,
          activityTitle: prefillActivityTitle.value,
          locale: locale.value, // ✅ usa la ref extraída arriba
        },
      })

      trackContactSend(intent.value)
      toast.add({ title: t('contact.success_title'), color: 'success' }) // ✅
      close()
    } catch {
      toast.add({ title: t('contact.error_title'), color: 'error' }) // ✅
    } finally {
      isLoading.value = false
    }
  }

  return {
    isOpen,
    isLoading,
    intent,
    form,
    prefillActivityId,
    prefillActivityTitle,
    open,
    close,
    submit,
  }
}
