'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import FAQAccordion, { FAQItem } from '@/components/FAQAccordion'

const teacherFAQs: FAQItem[] = [
  {
    q: '怎么加入平台？',
    a: '点击"教师注册"提交资料，平台审核通过后即可展示接单。',
  },
  {
    q: '怎么接单？',
    a: '家长预约后，平台推送需求到您的教师端。您查看学生情况后选择接单或婉拒。',
  },
  {
    q: '课时费怎么结算？',
    a: '家长可选择直接转账给您，或付到平台账户由平台转给您。具体结算方式由您与家长沟通确认。',
  },
  {
    q: '平台收取什么费用？',
    a: '平台向老师收取信息服务费（接单后解锁家长联系方式时支付一次），不向家长收取任何费用。具体标准在接单时会明确告知。',
  },
  {
    q: '有什么要求？',
    a: '接单后请在约定时间准时上课，每节课后及时与家长沟通反馈。平台会定期回访家长，保障双方权益。',
  },
]

export default function TeacherRulesPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const teacherId = localStorage.getItem('teacher_id')
    const token = localStorage.getItem('teacher_token')
    if (!teacherId || !token) { router.push('/teacher/login'); return }
    setReady(true)
  }, [router])

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>

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
        <FAQAccordion items={teacherFAQs} />
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
