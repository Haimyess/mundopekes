import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAdd } = vi.hoisted(() => ({ mockAdd: vi.fn() }))

vi.mock('../../node_modules/@nuxt/ui/dist/runtime/composables/useToast.js', () => ({
  useToast: () => ({ add: mockAdd }),
}))

const { useUiToast } = await import('../../../../layers/ui/composables/useUiToast')

describe('useUiToast', () => {
  beforeEach(() => {
    mockAdd.mockClear()
  })

  it('shows informational toasts by default', () => {
    useUiToast().show({ title: 'Guardado' })
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Guardado',
        color: 'neutral',
        icon: 'i-hugeicons-information-circle',
      })
    )
  })

  it.each([
    ['success', 'success', 'i-hugeicons-checkmark-circle-02'],
    ['error', 'error', 'i-hugeicons-alert-circle'],
  ] as const)('maps the %s tone to its color and icon', (tone, color, icon) => {
    useUiToast().show({ title: 'x', description: 'detalle', tone })
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'detalle',
        color,
        icon,
        ui: expect.objectContaining({ root: `ui-toast ui-toast--${tone}` }),
      })
    )
  })
})
