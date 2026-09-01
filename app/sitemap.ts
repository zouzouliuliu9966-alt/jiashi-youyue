import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/legal'

// 只列公开、希望被收录的页面。后台、教师端、家长课时查询都不进。
export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/laoshi', '/teacher/register', '/rules', '/terms', '/privacy', '/report'].map(p => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: 'monthly' as const,
    priority: p === '' ? 1 : 0.6,
  }))
}
