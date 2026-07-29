'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FAQAccordion, { FAQItem } from '@/components/FAQAccordion'

export default function TeacherRulesPage() {
  const router = useRouter()
  const [faqs, setFaqs] = useState<FAQItem[] | null>(null)

  // 正文不写在这个文件里 —— 客户端组件的内容会被编译进公开 JS bundle。
  // 改为登录后向服务端要，服务端校验 token 通过才返回。
  useEffect(() => {
    const teacherId = localStorage.getItem('teacher_id')
    const token = localStorage.getItem('teacher_token')
    if (!teacherId || !token) { router.push('/teacher/login'); return }

    fetch(`/api/teacher/rules?teacherId=${teacherId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async res => {
        if (res.status === 401 || res.status === 403) {
          localStorage.clear()
          router.push('/teacher/login')
          return null
        }
        return res.json()
      })
      .then(json => {
        if (!json) return
        if (json.error) { router.push('/teacher/login'); return }
        setFaqs(json.faqs || [])
      })
      .catch(() => router.push('/teacher/login'))
  }, [router])

  if (!faqs) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">老师须知</h1>
          <p className="text-sm text-gray-500">家师有约 · 教师端</p>
        </div>
      </div>

      {/* FAQ 列表 */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <FAQAccordion items={faqs} />
      </div>

      {/* 底部提示 */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-700">
          <p className="font-medium mb-1">温馨提示</p>
          <p>如有任何疑问，请联系平台教务，我们将竭诚为您服务。</p>
        </div>
      </div>

      {/* 返回按钮 */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <button
          onClick={() => router.push('/teacher/dashboard')}
          className="block w-full text-center bg-orange-500 text-white font-medium py-3 rounded-xl hover:bg-orange-600 transition-colors"
        >
          返回教师端
        </button>
      </div>
    </main>
  )
}
