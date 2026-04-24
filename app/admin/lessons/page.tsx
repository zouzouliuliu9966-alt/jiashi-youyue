'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Teacher } from '@/lib/types'

type LessonOrder = {
  id: string
  booking_id: string | null
  teacher_id: string
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
  teachers?: { id: string; name: string; tier: number } | null
  bookings?: { id: string; student_grade: string; address: string; available_time: string } | null
}

type Tab = 'all' | 'pending' | 'paid' | 'completed' | 'settled'

const tabLabels: Record<Tab, string> = {
  all: '全部',
  pending: '待付款',
  paid: '已付款待上课',
  completed: '已完成待结算',
  settled: '已结算',
}

export default function AdminLessons() {
  const router = useRouter()
  const [lessons, setLessons] = useState<LessonOrder[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  // 新建弹窗
  const [creating, setCreating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    teacher_id: '',
    parent_phone: '',
    parent_wechat: '',
    parent_name: '',
    student_grade: '',
    subject: '',
    price_per_lesson: '',
    notes: '',
  })

  const load = useCallback(async (currentTab: Tab) => {
    setLoading(true)
    const qs = currentTab === 'all' ? '' : `?status=${currentTab}`
    const res = await fetch(`/api/admin/lessons${qs}`)
    const data = await res.json()
    if (Array.isArray(data)) setLessons(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('admin_auth')) {
      router.push('/admin/login')
      return
    }
    // 首次加载老师列表
    fetch('/api/teachers').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setTeachers(d)
    })
  }, [router])

  useEffect(() => {
    load(tab)
  }, [tab, load])

  const act = async (id: string, action: string) => {
    setBusyId(id)
    const res = await fetch(`/api/admin/lessons/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    setBusyId(null)
    if (!res.ok) {
      alert('操作失败：' + (json.error || '未知错误'))
      return
    }
    load(tab)
  }

  const del = async (id: string) => {
    if (!confirm('确定删除该课时订单？该操作不可恢复。')) return
    setBusyId(id)
    const res = await fetch(`/api/admin/lessons/${id}`, { method: 'DELETE' })
    setBusyId(null)
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert('删除失败：' + (json.error || '未知错误'))
      return
    }
    load(tab)
  }

  const submitCreate = async () => {
    if (!form.teacher_id || !form.parent_phone || !form.price_per_lesson) {
      alert('请填写老师、家长手机、单价')
      return
    }
    setSubmitting(true)
    const res = await fetch('/api/admin/lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        price_per_lesson: Number(form.price_per_lesson),
      }),
    })
    const json = await res.json()
    setSubmitting(false)
    if (!res.ok) {
      alert('创建失败：' + (json.error || '未知错误'))
      return
    }
    setCreating(false)
    setForm({
      teacher_id: '',
      parent_phone: '',
      parent_wechat: '',
      parent_name: '',
      student_grade: '',
      subject: '',
      price_per_lesson: '',
      notes: '',
    })
    load(tab)
  }

  const logout = () => {
    localStorage.removeItem('admin_auth')
    router.push('/admin/login')
  }

  const payLabel = (s: string) => (s === 'paid' ? '已付款' : '待付款')
  const payColor = (s: string) =>
    s === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
  const lessonLabel = (s: string) => (s === 'completed' ? '已完课' : '未完课')
  const lessonColor = (s: string) =>
    s === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 overflow-x-auto">
            <h1 className="font-bold text-gray-900 shrink-0">管理后台</h1>
            <Link href="/admin/bookings" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">预约管理</Link>
            <Link href="/admin/teachers" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">老师管理</Link>
            <Link href="/admin/lessons" className="text-sm text-orange-500 font-medium shrink-0">课时管理</Link>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600 shrink-0 ml-2">退出</button>
        </div>
      </div>

      {/* Tab 过滤 */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
          {(Object.keys(tabLabels) as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 min-w-[80px] py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {tabLabels[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900">课时订单（{lessons.length}条）</h2>
          <button
            onClick={() => setCreating(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium"
          >
            + 新建课时订单
          </button>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : lessons.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无课时订单</div>
        ) : (
          lessons.map(l => {
            const price = Number(l.price_per_lesson)
            const rate = Number(l.platform_rate ?? 0.08)
            const fee = +(price * rate).toFixed(2)
            const toTeacher = +(price - fee).toFixed(2)
            return (
              <div key={l.id} className="bg-white rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {l.teachers?.name || l.teacher_name || '未知老师'}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${payColor(l.payment_status)}`}>
                        {payLabel(l.payment_status)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${lessonColor(l.lesson_status)}`}>
                        {lessonLabel(l.lesson_status)}
                      </span>
                      {l.settled && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          已结算
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      创建：{new Date(l.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-orange-600 font-medium">¥{price}</div>
                    <div className="text-xs text-gray-400">单价</div>
                  </div>
                </div>

                {/* 家长信息 + 课程信息 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                  <p>
                    <span className="text-gray-400">家长：</span>
                    <span className="font-medium">{l.parent_name || '-'}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">手机：</span>
                    <span className="font-medium">{l.parent_phone}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">微信：</span>
                    <span className="font-medium">{l.parent_wechat || '-'}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">年级/科目：</span>
                    <span className="font-medium">
                      {l.student_grade || '-'}{l.subject ? ` · ${l.subject}` : ''}
                    </span>
                  </p>
                  {l.notes && (
                    <p className="col-span-full">
                      <span className="text-gray-400">备注：</span>
                      <span className="text-gray-600">{l.notes}</span>
                    </p>
                  )}
                </div>

                {/* 时间线 */}
                <div className="text-xs text-gray-500 space-y-0.5 mb-3 bg-gray-50 rounded-lg px-3 py-2">
                  {l.payment_confirmed_at && (
                    <p>确认收款：{new Date(l.payment_confirmed_at).toLocaleString('zh-CN')}</p>
                  )}
                  {l.teacher_marked_at && (
                    <p>老师标记完课：{new Date(l.teacher_marked_at).toLocaleString('zh-CN')}</p>
                  )}
                  {l.parent_confirmed_at && (
                    <p>家长已确认：{new Date(l.parent_confirmed_at).toLocaleString('zh-CN')}</p>
                  )}
                  {l.settled_at && (
                    <p>
                      结算：{new Date(l.settled_at).toLocaleString('zh-CN')} ·
                      应付老师 ¥{l.settle_amount} · 平台 ¥{l.platform_fee}
                    </p>
                  )}
                </div>

                {/* 结算预览（未结算时显示） */}
                {!l.settled && (
                  <div className="text-xs text-gray-500 mb-3">
                    预计：应付老师 <span className="text-green-600 font-medium">¥{toTeacher}</span>
                    {' · '}
                    平台抽成 <span className="text-orange-600 font-medium">¥{fee}</span>
                    {' '}（{(rate * 100).toFixed(0)}%）
                  </div>
                )}

                {/* 操作按钮 */}
                <div className="flex flex-wrap gap-2 border-t pt-3">
                  {l.payment_status === 'pending' && (
                    <button
                      disabled={busyId === l.id}
                      onClick={() => act(l.id, 'confirm_payment')}
                      className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      确认收款
                    </button>
                  )}
                  {l.payment_status === 'paid' && l.lesson_status === 'pending' && (
                    <button
                      disabled={busyId === l.id}
                      onClick={() => act(l.id, 'mark_completed')}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      标记完课
                    </button>
                  )}
                  {l.lesson_status === 'completed' && !l.parent_confirmed_at && (
                    <button
                      disabled={busyId === l.id}
                      onClick={() => act(l.id, 'parent_confirm')}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      家长已确认
                    </button>
                  )}
                  {l.lesson_status === 'completed' && !l.settled && (
                    <button
                      disabled={busyId === l.id}
                      onClick={() => act(l.id, 'settle')}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-medium disabled:opacity-50"
                    >
                      结算
                    </button>
                  )}
                  <button
                    disabled={busyId === l.id}
                    onClick={() => del(l.id)}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium disabled:opacity-50 ml-auto"
                  >
                    删除
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 新建课时订单弹窗 */}
      {creating && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">新建课时订单</h3>
              <button
                onClick={() => setCreating(false)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                关闭
              </button>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">老师<span className="text-red-500">*</span></label>
              <select
                value={form.teacher_id}
                onChange={e => setForm({ ...form, teacher_id: e.target.value })}
                className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white"
              >
                <option value="">请选择老师</option>
                {teachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}（{['', '基础', '进阶', '精英'][t.tier]}）
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">家长手机<span className="text-red-500">*</span></label>
                <input
                  value={form.parent_phone}
                  onChange={e => setForm({ ...form, parent_phone: e.target.value })}
                  placeholder="手机号"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">家长微信</label>
                <input
                  value={form.parent_wechat}
                  onChange={e => setForm({ ...form, parent_wechat: e.target.value })}
                  placeholder="微信号"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">家长姓名</label>
                <input
                  value={form.parent_name}
                  onChange={e => setForm({ ...form, parent_name: e.target.value })}
                  placeholder="称呼"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">学生年级</label>
                <input
                  value={form.student_grade}
                  onChange={e => setForm({ ...form, student_grade: e.target.value })}
                  placeholder="如：初二"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">科目</label>
                <input
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="如：语文"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">单价（元/课时）<span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={form.price_per_lesson}
                  onChange={e => setForm({ ...form, price_per_lesson: e.target.value })}
                  placeholder="如：300"
                  className="w-full border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">备注</label>
              <textarea
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full border rounded-xl px-3 py-2 text-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={submitCreate}
                disabled={submitting}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-2.5 text-sm font-medium"
              >
                {submitting ? '创建中...' : '创建订单'}
              </button>
              <button
                onClick={() => setCreating(false)}
                className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
