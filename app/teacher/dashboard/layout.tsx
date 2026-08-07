import type { Metadata } from 'next'

// robots 不用在这儿设：上一层 app/teacher/layout.tsx 已经默认 noindex，
// 这里继承即可。只需要给个自己的标题。
export const metadata: Metadata = {
  title: '我的教师端',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
