// Reemplaza el `routeRules: { '/api/**': { cors: true } }` anterior, que
// reflejaba cualquier origen. Restringe /api/** a un allowlist explícito.
//
// Nombrado "cors.ts" a propósito: los middlewares de Nitro corren en orden
// alfabético, así que este corre antes que require-admin.ts y puede
// responder los preflights OPTIONS con 204 sin que el chequeo de admin los
// rechace con 401 (el browser nunca manda cookies/credentials en un
// preflight).
const ALLOWED_ORIGINS = [
  process.env.ADMIN_URL ?? 'https://admin.mundopekes.com',
  'http://localhost:3000',
]

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/')) return

  handleCors(event, {
    origin: ALLOWED_ORIGINS,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
})
