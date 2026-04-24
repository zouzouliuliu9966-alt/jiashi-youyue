'use client'

import { useEffect, useState } from 'react'
import { Teacher, Match, Booking } from '@/lib/types'
import { useRouter } from 'next/navigation'

const SUBJECTS_OPTIONS = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '政治', '历史', '艺术类']
const GRADES_OPTIONS = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']

type MatchWithBooking = Match & { bookings: Booking }

type LessonOrder = {
  id: string
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
}

export default function TeacherDashboard() {
  const router = useRouter()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [matches, setMatches] = useState<MatchWithBooking[]>([])
  const [form, setForm] = useState<Partial<Teacher>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'profile' | 'matches' | 'lessons'>('profile')
  const [daysSinceUpdate, setDaysSinceUpdate] = useState(0)
  const [payingMatch, setPayingMatch] = useState<MatchWithBooking | null>(null)
  const [lessons, setLessons] = useState<LessonOrder[]>([])
  const [lessonsLoaded, setLessonsLoaded] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)

  useEffect(() => {
    const teacherId = localStorage.getItem('teacher_id')
    if (!teacherId) { router.push('/teacher/login'); return }

    fetch(`/api/teacher/profile?id=${teacherId}`)
      .then(res => res.json())
      .then(json => {
        if (json.error || !json.teacher) {
          localStorage.clear()
          router.push('/teacher/login')
          return
        }
        setTeacher(json.teacher)
        setForm(json.teacher)
        const days = Math.floor((Date.now() - new Date(json.teacher.last_updated_at).getTime()) / 86400000)
        setDaysSinceUpdate(days)
        setMatches(json.matches || [])
      })
      .catch(() => {
        router.push('/teacher/login')
      })
  }, [router])

  useEffect(() => {
    if (tab !== 'lessons' || !teacher || lessonsLoaded) return
    fetch(`/api/teacher/lessons?teacherId=${teacher.id}`)
      .then(res => res.json())
      .then(json => {
        setLessons(json.lessons || [])
        setLessonsLoaded(true)
      })
      .catch(() => setLessonsLoaded(true))
  }, [tab, teacher, lessonsLoaded])

  const markCompleted = async (lessonId: string) => {
    if (!teacher) return
    setMarkingId(lessonId)
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}/mark-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacherId: teacher.id }),
      })
      const json = await res.json()
      if (json.error) {
        alert(json.error)
      } else {
        setLessons(ls => ls.map(l => l.id === lessonId ? { ...l, lesson_status: 'completed' as const, teacher_marked_at: new Date().toISOString() } : l))
      }
    } catch {
      alert('操作失败，请稍后再试')
    } finally {
      setMarkingId(null)
    }
  }

  const set = (k: keyof Teacher, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const toggleArray = (key: 'subjects' | 'grades', val: string) => {
    const arr: string[] = (form[key] as string[]) || []
    set(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const save = async () => {
    if (!teacher) return
    setSaving(true)
    await fetch('/api/teacher/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teacherId: teacher.id, form })
    })
    setSaving(false)
    setSaved(true)
    setDaysSinceUpdate(0)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAccept = (m: MatchWithBooking) => {
    setPayingMatch(m)
  }

  const confirmPaid = async () => {
    if (!payingMatch || !teacher) return
    const amount = teacher.price || '费用详询教务'
    await fetch('/api/teacher/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId: payingMatch.id, response: 'accepted', paymentAmount: amount })
    })
    setMatches(ms => ms.map(m => m.id === payingMatch.id ? { ...m, teacher_response: 'accepted', payment_amount: amount, payment_confirmed: false } : m))
    setPayingMatch(null)
  }

  const respond = async (matchId: string, response: 'declined') => {
    await fetch('/api/teacher/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matchId, response })
    })
    setMatches(ms => ms.map(m => m.id === matchId ? { ...m, teacher_response: response } : m))
  }

  const logout = () => {
    localStorage.removeItem('teacher_token')
    localStorage.removeItem('teacher_id')
    localStorage.removeItem('teacher_name')
    router.push('/teacher/login')
  }

  const uploadAvatar = async (file: File) => {
    if (!teacher) return
    const formData = new FormData()
    formData.append('file', file)
    formData.append('teacherId', teacher.id)
    const res = await fetch('/api/teacher/upload-avatar', { method: 'POST', body: formData })
    const json = await res.json()
    if (json.url) {
      set('photo_url', json.url)
    }
  }

  if (!teacher) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">你好，{teacher.name}</h1>
            <p className="text-xs text-gray-400">家师有约 · 教师端</p>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">退出</button>
        </div>
      </div>

      {daysSinceUpdate >= 7 && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
            您的可用时间已 {daysSinceUpdate} 天未更新，请及时更新，避免影响家长匹配。
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab('profile')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'profile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            我的资料
          </button>
          <button onClick={() => setTab('matches')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'matches' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            家长需求 {matches.filter(m => m.teacher_response === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 ml-1">
                {matches.filter(m => m.teacher_response === 'pending').length}
              </span>
            )}
          </button>
          <button onClick={() => setTab('lessons')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'lessons' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            我的课时
          </button>
        </div>
      </div>

      {tab === 'profile' && (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {form.photo_url ? (
                  <img src={form.photo_url} alt="头像" className="w-20 h-20 rounded-xl object-cover" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-orange-100 flex items-center justify-center">
                    <span className="text-3xl text-orange-400">师</span>
                  </div>
                )}
                <label className="block mt-2 cursor-pointer">
                  <span className="text-xs text-orange-500 hover:text-orange-600">上传头像</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadAvatar(file)
                  }} />
                </label>
              </div>
              <div className="flex-1">
                <Field label="姓名/称呼">
                  <input value={form.name || ''} onChange={e => set('name', e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="如：张老师" />
                </Field>
              </div>
            </div>

            <Field label="身份类型">
              <div className="flex flex-wrap gap-2">
                {['在校教师', '专职辅导', '独立工作室', '应届毕业生'].map(t => (
                  <button key={t} onClick={() => set('teacher_type', t)}
                    className={`px-3 py-1.5 rounded-full text-sm ${form.teacher_type === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="教授科目">
              <div className="flex flex-wrap gap-2">
                {SUBJECTS_OPTIONS.map(s => (
                  <button key={s} onClick={() => toggleArray('subjects', s)}
                    className={`px-3 py-1.5 rounded-full text-sm ${(form.subjects as string[])?.includes(s) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="教授年级">
              <div className="flex flex-wrap gap-2">
                {GRADES_OPTIONS.map(g => (
                  <button key={g} onClick={() => toggleArray('grades', g)}
                    className={`px-3 py-1.5 rounded-full text-sm ${(form.grades as string[])?.includes(g) ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {g}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="一句话亮点">
              <input value={form.highlight || ''} onChange={e => set('highlight', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="如：连续3年送学生语文成绩提升20分" />
            </Field>

            <Field label="个人简介">
              <textarea value={form.bio || ''} onChange={e => set('bio', e.target.value)}
                rows={3} className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none"
                placeholder="简要介绍您的教学风格和优势..." />
            </Field>

            <Field label="上课方式">
              <div className="flex gap-2">
                {['上门', '工作室', '均可'].map(m => (
                  <button key={m} onClick={() => set('teaching_mode', m)}
                    className={`px-4 py-1.5 rounded-full text-sm ${form.teaching_mode === m ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {m}
                  </button>
                ))}
              </div>
            </Field>

            {(form.teaching_mode === '上门' || form.teaching_mode === '均可') && (
              <Field label="上门范围">
                <input value={form.service_areas || ''} onChange={e => set('service_areas', e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="如：玄武区、鼓楼区" />
              </Field>
            )}

            {(form.teaching_mode === '工作室' || form.teaching_mode === '均可') && (
              <Field label="工作室地址" hint="填写具体地址，方便家长找到您">
                <input value={(form as Record<string, unknown>).studio_address as string || ''} onChange={e => set('studio_address' as keyof Teacher, e.target.value)}
                  className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="如：雨花台区xx大厦3楼301" />
              </Field>
            )}

            <Field label="可用时间 *" hint="请务必及时更新，家长会根据此安排选择">
              <input value={form.available_time || ''} onChange={e => set('available_time', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="如：周一三五晚上、周末全天" />
            </Field>

            <Field label="收费（元/小时）">
              <input value={form.price || ''} onChange={e => set('price', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="如：初一500 初二600 初三650" />
            </Field>

            <Field label="教龄（年）">
              <input type="number" value={form.years_exp || ''} onChange={e => set('years_exp', Number(e.target.value))}
                className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="如：5" />
            </Field>

          </div>

          <button onClick={save} disabled={saving}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
            {saved ? '✅ 保存成功' : saving ? '保存中...' : '保存资料'}
          </button>
        </div>
      )}

      {tab === 'matches' && (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {matches.length === 0 ? (
            <div className="text-center text-gray-400 py-16">暂无推送的家长需求</div>
          ) : matches.map(m => (
            <div key={m.id} className="bg-white rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="text-sm font-medium text-gray-900">{m.bookings?.student_grade} · {m.bookings?.address}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(m.created_at).toLocaleDateString('zh-CN')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  m.teacher_response === 'accepted' && m.payment_confirmed ? 'bg-green-100 text-green-700' :
                  m.teacher_response === 'accepted' && !m.payment_confirmed ? 'bg-orange-100 text-orange-700' :
                  m.teacher_response === 'declined' ? 'bg-gray-100 text-gray-500' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {m.teacher_response === 'accepted' && m.payment_confirmed ? '已匹配' :
                   m.teacher_response === 'accepted' && !m.payment_confirmed ? '待确认收款' :
                   m.teacher_response === 'declined' ? '已婉拒' : '待回复'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1"><span className="text-gray-400">学生情况：</span>{m.bookings?.student_intro}</p>
              <p className="text-sm text-gray-600 mb-1"><span className="text-gray-400">可上课时间：</span>{m.bookings?.available_time}</p>

              {m.teacher_response === 'accepted' && m.payment_confirmed && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm font-medium text-green-800 mb-2">家长联系方式</p>
                  <p className="text-sm text-green-700"><span className="text-green-500">手机：</span>{m.bookings?.phone}</p>
                  <p className="text-sm text-green-700"><span className="text-green-500">微信：</span>{m.bookings?.wechat}</p>
                </div>
              )}

              {m.teacher_response === 'accepted' && !m.payment_confirmed && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <p className="text-sm text-orange-700">您已接单并完成付款，教务正在确认中，确认后将显示家长联系方式。</p>
                </div>
              )}

              {m.teacher_response === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => handleAccept(m)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-2 text-sm font-medium">
                    接单
                  </button>
                  <button onClick={() => respond(m.id, 'declined')}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-2 text-sm font-medium">
                    婉拒
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'lessons' && (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
          {!lessonsLoaded ? (
            <div className="text-center text-gray-400 py-16">加载中...</div>
          ) : lessons.length === 0 ? (
            <div className="text-center text-gray-400 py-16">暂无课时记录</div>
          ) : lessons.map(l => {
            const settleAmount = l.settle_amount ?? Number(l.price_per_lesson) * (1 - Number(l.platform_rate || 0.08))
            const platformFee = l.platform_fee ?? Number(l.price_per_lesson) * Number(l.platform_rate || 0.08)
            const needMark = l.payment_status === 'paid' && l.lesson_status !== 'completed'
            return (
              <div key={l.id} className="bg-white rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {l.parent_name || '家长'}
                      {l.student_grade && <span className="text-gray-500 font-normal"> · {l.student_grade}</span>}
                      {l.subject && <span className="text-gray-500 font-normal"> · {l.subject}</span>}
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
                  <span className="text-gray-400">家长手机</span>
                  <span className="text-gray-700 text-right">{l.parent_phone}</span>

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

                  {l.settled ? (
                    <>
                      <span className="text-gray-400">结算金额</span>
                      <span className="text-green-700 text-right font-medium">¥{Number(settleAmount).toFixed(2)}</span>
                      <span className="text-gray-400">平台抽成</span>
                      <span className="text-gray-500 text-right">¥{Number(platformFee).toFixed(2)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-400">预计结算</span>
                      <span className="text-gray-600 text-right">¥{Number(settleAmount).toFixed(2)} <span className="text-gray-400">（抽8%）</span></span>
                    </>
                  )}
                </div>

                {needMark && (
                  <button
                    onClick={() => markCompleted(l.id)}
                    disabled={markingId === l.id}
                    className="w-full mt-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-2 text-sm font-medium"
                  >
                    {markingId === l.id ? '处理中...' : '标记完课'}
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

      {payingMatch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2 text-center">支付信息费</h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              接单需支付首节课时费作为信息服务费
            </p>

            <div className="bg-orange-50 rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-gray-500 mb-1">需求：{payingMatch.bookings?.student_grade}</p>
              <p className="text-sm text-gray-500 mb-2">您的课时费标准：</p>
              <p className="text-xl font-bold text-orange-600">{teacher.price || '请先设置价格'}</p>
              <p className="text-xs text-gray-400 mt-1">请按对应年级课时费转账</p>
            </div>

            <div className="border rounded-xl p-4 mb-4 text-center">
              <p className="text-sm text-gray-500 mb-3">请扫描下方收款码付款</p>
              <div className="w-48 h-48 mx-auto bg-gray-100 rounded-xl flex items-center justify-center">
                <img src="/payment-qrcode.png" alt="收款码" className="w-full h-full object-contain rounded-xl"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<p class="text-gray-400 text-sm">收款码加载中...</p>' }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">支付宝扫码 · 家师有约教务</p>
            </div>

            <div className="flex gap-2">
              <button onClick={confirmPaid}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium">
                我已付款
              </button>
              <button onClick={() => setPayingMatch(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium">
                取消
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center mt-3">
              付款后教务将在24小时内确认，确认后您将看到家长联系方式
            </p>
          </div>
        </div>
      )}
    </main>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-orange-500 mb-1">{hint}</p>}
      {children}
    </div>
  )
}
