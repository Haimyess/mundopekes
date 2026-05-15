export default defineNuxtPlugin(() => {
  const tracking = useTracking()
  const router = useRouter()

  router.afterEach((to) => {
    tracking.trackPageView(to.path, to.meta?.title as string)
  })
})
