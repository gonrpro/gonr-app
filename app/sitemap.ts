import type { MetadataRoute } from 'next'

// TASK-218 SEO — list ONLY the public consumer entry + legal pages. The pro/operator
// surfaces are closed on this host (see proxy.ts) and intentionally excluded.
const BASE_URL = 'https://gonr.app'

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return [
    { url: `${BASE_URL}/solve-v2`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE_URL}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/contact`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
