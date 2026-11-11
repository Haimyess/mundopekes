import { buildRobotsTxt } from '../utils/sitemap'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  return buildRobotsTxt((useRuntimeConfig(event).public.i18n?.baseUrl as string) || '')
})
