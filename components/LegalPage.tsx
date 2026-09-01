import Link from 'next/link'
import { LEGAL } from '@/lib/legal'

/** 三个法律页共用的骨架，样式对齐 /rules，别另起一套 */
export default function LegalPage({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{title}</h1>
            <p className="text-xs text-gray-400">{subtitle || LEGAL.platform}</p>
          </div>
          <Link href="/" className="text-sm text-orange-500 hover:text-orange-600">返回首页</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {children}

        <div className="bg-white rounded-2xl p-5 text-xs text-gray-500 leading-relaxed space-y-1">
          <p>运营主体：{LEGAL.operator}</p>
          <p>联系方式：教务企业微信 <span className="font-medium text-orange-600">{LEGAL.contactWecom}</span>（{LEGAL.contactHours}）</p>
          <p>本版本生效日期：{LEGAL.effectiveDate}</p>
        </div>

        <div className="flex justify-center gap-4 pb-6 text-xs text-gray-400">
          <Link href="/terms" className="hover:text-gray-600">用户协议</Link>
          <Link href="/privacy" className="hover:text-gray-600">隐私政策</Link>
          <Link href="/report" className="hover:text-gray-600">投诉举报</Link>
        </div>
      </div>
    </main>
  )
}

/** 一节：标题 + 正文块 */
export function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5">
      <h2 className="font-bold text-gray-900 text-sm mb-3">{n}. {title}</h2>
      <div className="text-xs text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

/** 需要用户特别注意的条款，法律上要求显著提示，不能混在正文里 */
export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 text-xs text-orange-800 leading-relaxed">
      {children}
    </div>
  )
}
