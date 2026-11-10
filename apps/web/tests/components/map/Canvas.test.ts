import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { fakeMap, moveHandlers } from './leaflet-stubs'

vi.mock('leaflet', () => ({
  divIcon: (options: { className: string; html: string }) => options,
}))
vi.mock('@vue-leaflet/vue-leaflet', async () => await import('./leaflet-stubs'))

const Canvas = (await import('~/app/components/map/Canvas.vue')).default

const PINS = [
  { id: 'a', lat: 32.08, lng: 34.78, label: '₪35', title: 'Museo' },
  { id: 'b', lat: 32.1, lng: 34.8, label: '<b>Free</b>', title: 'Parque' },
]

async function mountCanvas(props: Record<string, unknown> = {}) {
  moveHandlers.length = 0
  fakeMap.fitBounds.mockClear()
  const wrapper = mount(Canvas, { props: { pins: PINS, label: 'Mapa de resultados', ...props } })
  await flushPromises()
  return wrapper
}

const markers = (wrapper: Awaited<ReturnType<typeof mountCanvas>>) =>
  wrapper.findAll('[data-stub="LMarker"]')

describe('MapCanvas', () => {
  it('labels the map region and gives every pin an accessible title', async () => {
    const wrapper = await mountCanvas()
    expect(wrapper.find('[role="region"]').attributes('aria-label')).toBe('Mapa de resultados')
    expect(markers(wrapper).map((marker) => marker.attributes('title'))).toEqual([
      'Museo',
      'Parque',
    ])
  })

  it('escapes the pin labels and marks the active pin', async () => {
    const wrapper = await mountCanvas({ activeId: 'b' })
    const icon = JSON.parse(markers(wrapper)[1]!.attributes('data-icon')!)
    expect(icon.html).toContain('&lt;b&gt;Free&lt;/b&gt;')
    expect(icon.className).toContain('map-canvas__pin--active')
    expect(JSON.parse(markers(wrapper)[0]!.attributes('data-icon')!).className).not.toContain(
      '--active'
    )
  })

  it('fits the pins unless told not to', async () => {
    await mountCanvas()
    expect(fakeMap.fitBounds).toHaveBeenCalledTimes(1)
    await mountCanvas({ shouldFitPins: false })
    expect(fakeMap.fitBounds).not.toHaveBeenCalled()
  })

  it('reports selection, hover and user moves but not its own fitting', async () => {
    const wrapper = await mountCanvas()
    await markers(wrapper)[0]!.trigger('click')
    await markers(wrapper)[0]!.trigger('mouseover')
    await markers(wrapper)[0]!.trigger('mouseout')
    moveHandlers.forEach((handler) => handler())
    expect(wrapper.emitted('move')).toBeUndefined()
    moveHandlers.forEach((handler) => handler())
    expect(wrapper.emitted('select')).toEqual([['a']])
    expect(wrapper.emitted('highlight')).toEqual([['a'], [null]])
    expect(wrapper.emitted('move')).toEqual([[{ south: 32, west: 34.7, north: 32.2, east: 34.9 }]])
  })

  it('selects a pin with Enter or Space for keyboard users', async () => {
    const wrapper = await mountCanvas()
    await markers(wrapper)[1]!.trigger('keydown', { key: 'Enter' })
    await markers(wrapper)[0]!.trigger('keydown', { key: ' ' })
    await markers(wrapper)[0]!.trigger('keydown', { key: 'Tab' })
    expect(wrapper.emitted('select')).toEqual([['b'], ['a']])
  })
})
