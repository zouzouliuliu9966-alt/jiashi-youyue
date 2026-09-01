import type { Metadata } from 'next'

// 后台不该进搜索结果。
// 🔴 注意：不能只靠 robots.txt 的 Disallow —— 被 Disallow 的页面爬虫压根不会抓，
// 也就读不到这里的 noindex，反而可能仅凭外链被收录。
// 正确做法是「允许抓取 + noindex」，所以 robots.ts 里不再 Disallow 这些路径。
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
