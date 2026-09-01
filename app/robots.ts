import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/legal'

// 之前站上没有 robots.ts / robots.txt，线上那份是 Cloudflare 兜底生成的，
// 里面一条 User-agent/Disallow 都没有，等于全站放行 —— /admin 也在内。
// 🔴 别写 disallow: '/teacher/'。robots.txt 的 Disallow 优先级高于页面里的 meta robots，
// 爬虫连页面都不抓，app/teacher/register/layout.tsx 显式开的 index:true 根本读不到 ——
// 招募页是老师搜「南京家教老师招聘」进来的入口，封掉等于把招募漏斗掐了。
// 教师端要挡的是登录后的页面，逐个列，别用前缀一刀切。
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // 只 Disallow 不该被抓取的接口。
      // 「不想被收录」的页面（/admin、/my-lessons、教师端）一律靠页面自己的 noindex ——
      // Disallow 会让爬虫读不到 noindex，反而可能仅凭外链把 URL 收进结果里。
      disallow: ['/api/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
