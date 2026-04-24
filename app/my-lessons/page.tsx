'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type LessonOrder = {
  id: string
  teacher_name: string | null
  parent_phone: string
  parent_wechat: string | null
  parent_name: string | null
  student_grade: string | null
  subject: string | null
  price_per_lesson: number
  platform_rate: number
  payment_status: 'pending' | 'paid'
  payment_confirmed_at: string | null
  lesson_status: 'pending' | 'completed'
  teacher_marked_at: string | null
  parent_confirmed_at: string | null
  settled: boolean
  settled_at: string | null
  settle_amount: number | null
  platform_fee: number | null
  notes: string | null
  created_at: string
}

export default function MyLessonsPage() {
  const [phone, setPhone] = useState('')
  const [queried, setQueried] = useState('')
  const [lessons, setLessons] = useState<LessonOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('parent_phone')
    if (saved) setPhone(saved)
  }, [])

  const query = async (p?: string) => {
    const target = (p ?? phone).trim()
    if (!target) {
      setError('请输入手机号')
      return
    }
    if (!/^\d{11}$/.test(target)) {
      setError('请输入11位手机号')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/parent/lessons?phone=${encodeURIComponent(target)}`)
      const json = await res.json()
      if (json.error) {
        setError(json.error)
        setLessons([])
      } else {
        setLessons(json.lessons || [])
        setQueried(target)
        localStorage.setItem('parent_phone', target)
      }
    } catch {
      setError('查询失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  const confirmLesson = async (id: string) => {
    if (!queried) return
    setConfirming(id)
    try {
      const res = await fetch(`/api/parent/lessons/${id}/confirm?phone=${encodeURIComponent(queried)}`, {
        method: 'POST',
      })
      const json = await res.json()
      if (json.error) {
        alert(json.error)
      } else {
        setLessons(ls => ls.map(l => l.id === id ? { ...l, parent_confirmed_at: new Date().toISOString() } : l))
      }
    } catch {
      alert('操作失败，请稍后再试')
    } finally {
      setConfirming(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">我的课时</h1>
            <p className="text-xs text-gray-400">家师有约 · 家长端</p>
          </div>
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">返回首页</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">输入您的手机号查询课时记录</label>
          <div className="flex gap-2">
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              type="tel"
              inputMode="numeric"
              maxLength={11}
              placeholder="11位手机号"
              className="flex-1 border rounded-xl px-3 py-2.5 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') query() }}
            />
            <button
              onClick={() => query()}
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl px-5 py-2.5 text-sm font-medium"
            >
              {loading ? '查询中' : '查询'}
            </button>
          </div>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        {queried && !loading && lessons.length === 0 && (
          <div className="text-center text-gray-400 py-16">暂无课时记录</div>
        )}

        {lessons.length > 0 && (
          <div className="space-y-3">
            {lessons.map(l => {
              const needConfirm = l.teacher_marked_at && !l.parent_confirmed_at
              const settleAmount = l.settle_amount ?? Number(l.price_per_lesson) * (1 - Number(l.platform_rate || 0.08))
              return (
                <div key={l.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {l.teacher_name || '老师'}
                        {l.subject && <span className="text-gray-500 font-normal"> · {l.subject}</span>}
                        {l.student_grade && <span className="text-gray-500 font-normal"> · {l.student_grade}</span>}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(l.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {l.settled && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">已结算</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-xs mt-3 pt-3 border-t border-gray-100">
                    <span className="text-gray-400">单价</span>
                    <span className="text-gray-700 text-right">¥{Number(l.price_per_lesson).toFixed(0)}</span>

                    <span className="text-gray-400">付款状态</span>
                    <span className={`text-right ${l.payment_status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                      {l.payment_status === 'paid' ? '已付款' : '待付款'}
                    </span>

                    <span className="text-gray-400">上课状态</span>
                    <span className={`text-right ${l.lesson_status === 'completed' ? 'text-green-600' : 'text-gray-500'}`}>
                      {l.lesson_status === 'completed' ? '已完成' : '待上课'}
                    </span>

                    <span className="text-gray-400">家长确认</span>
                    <span className={`text-right ${l.parent_confirmed_at ? 'text-green-600' : 'text-gray-500'}`}>
                      {l.parent_confirmed_at ? '已确认' : '未确认'}
                    </span>

                    {l.settled && (
                      <>
                        <span className="text-gray-400">老师结算</span>
                        <span className="text-gray-700 text-right">¥{Number(settleAmount).toFixed(2)}</span>
                      </>
                    )}
                  </div>

                  {needConfirm && (
                    <button
                      onClick={() => confirmLesson(l.id)}
                      disabled={confirming === l.id}
                      className="w-full mt-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white rounded-xl py-2 text-sm font-medium"
                    >
                      {confirming === l.id ? '确认中...' : '确认上过这节课'}
                    </button>
                  )}

                  {l.notes && (
                    <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                      <span className="text-gray-400">备注：</span>{l.notes}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 bg-orange-50 rounded-xl p-4 text-xs text-orange-700">
          <p className="font-medium mb-1">说明</p>
          <p>老师上完课后会标记已完成，请您及时确认。确认后平台将结算课时费给老师。</p>
        </div>
      </div>
    </main>
  )
}
