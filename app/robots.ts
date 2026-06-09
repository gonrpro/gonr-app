import type { MetadataRoute } from 'next'

// TASK-218 SEO — the GONR consumer host (gonr.app) exposes ONE consumer version.
// Only /solve-v2 and the legal pages are indexable; every closed pro/operator/admin
// route and all APIs are disallowed so they never surface in search.
// NOTE: `/solve$` + `/solve/` block the legacy operator app at /solve WITHOUT
// catching the consumer app at /solve-v2 (a bare `/solve` rule would also match it).
const BASE_URL = 'https://gonr.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/solve-v2', '/privacy', '/terms', '/contact'],
        disallow: [
          '/api/',
          '/solve$',
          '/solve/',
          '/landing',
          '/profile',
          '/history',
          '/saved',
          '/scan',
          '/operator',
          '/pro',
          '/spotter',
          '/spottingboard',
          '/deep-solve',
          '/handoff',
          '/review',
          '/verified',
          '/protocol-builder',
          '/plant-brain',
          '/plant-brain-builder',
          '/mission-control',
          '/admin',
          '/courses',
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
