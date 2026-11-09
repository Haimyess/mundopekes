export type UiToastTone = 'info' | 'success' | 'error'

export interface UiToastOptions {
  title: string
  description?: string
  tone?: UiToastTone
}

const TONE_ICONS: Record<UiToastTone, string> = {
  info: 'i-hugeicons-information-circle',
  success: 'i-hugeicons-checkmark-circle-02',
  error: 'i-hugeicons-alert-circle',
}

const TONE_COLORS = {
  info: 'neutral',
  success: 'success',
  error: 'error',
} as const satisfies Record<UiToastTone, string>

export function useUiToast() {
  const toast = useToast()

  const show = ({ title, description, tone = 'info' }: UiToastOptions) =>
    toast.add({
      title,
      description,
      icon: TONE_ICONS[tone],
      color: TONE_COLORS[tone],
      ui: {
        root: `ui-toast ui-toast--${tone}`,
        title: 'ui-toast__title',
        description: 'ui-toast__description',
        icon: 'ui-toast__icon',
      },
    })

  return { show }
}
