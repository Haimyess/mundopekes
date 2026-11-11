<script setup lang="ts">
interface FooterLink {
  label: string
  to: string
}

interface FooterGroup {
  label: string
  value: string
  links: FooterLink[]
}

const FOOTER_CITY_SLUGS = [
  'tel-aviv',
  'jerusalem',
  'haifa',
  'beer-sheva',
  'rishon-lezion',
  'netanya',
  'herzliya',
  'modiin',
] as const

const OCCASION_LINKS = [
  { key: 'shabat', to: '/search?when=shabat' },
  { key: 'rainy', to: '/search?category=indoor-juego' },
  { key: 'free', to: '/search?free=true' },
  { key: 'hanukkah', to: '/search?when=occasion:hanukkah' },
  { key: 'summerBreak', to: '/search?when=occasion:summer-break' },
] as const

const { t } = useI18n()
const { cityName } = useSearchLabels()
const { locales, currentLocale, switchLocale } = useLanguageSwitch()
const { resetConsent } = useCookieConsent()

const currentYear = new Date().getFullYear()

const linkGroups = computed<FooterGroup[]>(() =>
  [
    {
      label: t('footer.groups.cities'),
      value: 'cities',
      links: FOOTER_CITY_SLUGS.map((slug) => ({
        label: cityName(slug) ?? slug,
        to: `/search?where=city:${slug}`,
      })),
    },
    {
      label: t('footer.groups.occasions'),
      value: 'occasions',
      links: OCCASION_LINKS.map(({ key, to }) => ({ label: t(`footer.links.${key}`), to })),
    },
    {
      label: t('footer.groups.mundopekes'),
      value: 'mundopekes',
      links: [
        { label: t('footer.links.about'), to: '/about' },
        { label: t('business.cta.footer'), to: '/business' },
      ],
    },
    {
      label: t('footer.groups.legal'),
      value: 'legal',
      links: [
        { label: t('footer.links.terms'), to: '/terms' },
        { label: t('footer.links.privacy'), to: '/privacy' },
      ],
    },
  ].filter((group) => group.links.length > 0)
)

const handleCookiePreferences = () => resetConsent()
</script>

<template>
  <footer class="layout-footer">
    <div class="layout-footer__inner">
      <div class="layout-footer__brand">
        <LayoutLogo size="sm" />
        <p class="layout-footer__tagline">{{ t('footer.tagline') }}</p>
      </div>

      <nav class="layout-footer__nav" :aria-label="t('footer.nav')">
        <div class="layout-footer__columns">
          <section v-for="group in linkGroups" :key="group.value" class="layout-footer__column">
            <h2 class="layout-footer__heading">{{ group.label }}</h2>
            <ul class="layout-footer__links">
              <li v-for="link in group.links" :key="link.to">
                <NuxtLinkLocale :to="link.to" class="layout-footer__link">{{
                  link.label
                }}</NuxtLinkLocale>
              </li>
              <li v-if="group.value === 'legal'">
                <button type="button" class="layout-footer__link" @click="handleCookiePreferences">
                  {{ t('footer.links.cookies') }}
                </button>
              </li>
            </ul>
          </section>
        </div>
        <div class="layout-footer__accordion">
          <UiAccordion :items="linkGroups">
            <template #panel="{ item }">
              <ul class="layout-footer__links">
                <li v-for="link in item.links" :key="link.to">
                  <NuxtLinkLocale :to="link.to" class="layout-footer__link">{{
                    link.label
                  }}</NuxtLinkLocale>
                </li>
                <li v-if="item.value === 'legal'">
                  <button
                    type="button"
                    class="layout-footer__link"
                    @click="handleCookiePreferences"
                  >
                    {{ t('footer.links.cookies') }}
                  </button>
                </li>
              </ul>
            </template>
          </UiAccordion>
        </div>
      </nav>

      <section class="layout-footer__languages" :aria-label="t('footer.groups.language')">
        <h2 class="layout-footer__heading">{{ t('footer.groups.language') }}</h2>
        <ul class="layout-footer__language-list">
          <li v-for="language in locales" :key="language.code">
            <button
              type="button"
              class="layout-footer__language"
              :lang="language.code"
              :aria-current="language.code === currentLocale ? 'true' : undefined"
              @click="switchLocale(language.code)"
            >
              {{ language.name }}
            </button>
          </li>
        </ul>
      </section>

      <div class="layout-footer__bottom">
        <p class="layout-footer__app">
          {{ t('footer.app') }}
          <span class="layout-footer__badge">{{ t('footer.appStore') }}</span>
          <span class="layout-footer__badge">{{ t('footer.googlePlay') }}</span>
        </p>
        <p class="layout-footer__copyright">
          {{ t('footer.copyright', { year: currentYear }) }}
        </p>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.layout-footer {
  margin-block-start: var(--mp-section-gap);
  border-block-start: 1px solid var(--mp-border-soft);
  background: var(--mp-surface);
  color: var(--mp-ink);
  font-family: var(--mp-font);
}

.layout-footer__inner {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px var(--mp-gutter) calc(32px + env(safe-area-inset-bottom));
}

.layout-footer__tagline {
  margin: 8px 0 0;
  color: var(--mp-text-2);
  font-size: var(--mp-fs-body);
}

.layout-footer__columns {
  display: none;
}

.layout-footer__heading {
  margin: 0 0 8px;
  font-size: var(--mp-fs-label);
  font-weight: var(--mp-fw-bold);
  letter-spacing: var(--mp-ls-label);
  text-transform: uppercase;
}

.layout-footer__links,
.layout-footer__language-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.layout-footer__language-list {
  flex-flow: row wrap;
  gap: 4px 16px;
}

.layout-footer__link,
.layout-footer__language {
  display: inline-flex;
  align-items: center;
  min-block-size: var(--mp-tap);
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--mp-text-2);
  font: inherit;
  font-size: var(--mp-fs-body);
  text-decoration: none;
  cursor: pointer;
}

.layout-footer__link:hover,
.layout-footer__language:hover {
  color: var(--mp-ink);
  text-decoration: underline;
}

.layout-footer__language[aria-current='true'] {
  color: var(--mp-ink);
  font-weight: var(--mp-fw-bold);
}

.layout-footer__link:focus-visible,
.layout-footer__language:focus-visible {
  outline: var(--mp-focus-ring);
  outline-offset: 2px;
}

.layout-footer__bottom {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-block-start: 16px;
  border-block-start: 1px solid var(--mp-border-soft);
  color: var(--mp-text-3);
  font-size: var(--mp-fs-body-sm);
}

.layout-footer__app,
.layout-footer__copyright {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.layout-footer__badge {
  padding: 4px 10px;
  border: 1px solid var(--mp-border);
  border-radius: var(--mp-r-pill);
  color: var(--mp-text-2);
  font-weight: var(--mp-fw-semibold);
}

@media (min-width: 1200px) {
  .layout-footer__inner {
    display: grid;
    grid-template-columns: 2fr 5fr;
    gap: 32px 48px;
    max-inline-size: var(--mp-container);
    margin-inline: auto;
    padding-inline: 0;
  }

  .layout-footer__columns {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 32px;
  }

  .layout-footer__accordion {
    display: none;
  }

  .layout-footer__languages {
    grid-column: 2;
  }

  .layout-footer__bottom {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
  }
}
</style>
