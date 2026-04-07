'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Teacher, Match, Booking } from '@/lib/types'
import { useRouter } from 'next/navigation'

const SUBJECTS_OPTIONS = ['语文', '数学', '英语', '物理', '化学', '生物', '地理', '政治', '历史', '艺术类']
const GRADES_OPTIONS = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']

type MatchWithBooking = Match & { bookings: Booking }

export default function TeacherDashboard() {
  const router = useRouter()
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [matches, setMatches] = useState<MatchWithBooking[]>([])
  const [form, setForm] = useState<Partial<Teacher>>({})
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'profile' | 'matches'>('profile')
  const [daysSinceUpdate, setDaysSinceUpdate] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/teacher/login'); return }
      const { data } = await supabase.from('teachers').select('*').eq('email', user.email).single()
      if (data) {
        setTeacher(data)
        setForm(data)
        const days = Math.floor((Date.now() - new Date(data.last_updated_at).getTime()) / 86400000)
        setDaysSinceUpdate(days)
        // 加载推送给我的家长需求
        const { data: matchData } = await supabase
          .from('matches')
          .select('*, bookings(*)')
          .eq('teacher_id', data.id)
          .order('created_at', { ascending: false })
        if (matchData) setMatches(matchData as MatchWithBooking[])
      }
    })
  }, [router])

  const set = (k: keyof Teacher, v: unknown) => setForm(f => ({ ...f, [k]: v }))

  const toggleArray = (key: 'subjects' | 'grades', val: string) => {
    const arr: string[] = (form[key] as string[]) || []
    set(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  const save = async () => {
    if (!teacher) return
    setSaving(true)
    await supabase.from('teachers').update({ ...form, last_updated_at: new Date().toISOString() }).eq('id', teacher.id)
    setSaving(false)
    setSaved(true)
    setDaysSinceUpdate(0)
    setTimeout(() => setSaved(false), 2000)
  }

  const respond = async (matchId: string, response: 'accepted' | 'declined') => {
    await supabase.from('matches').update({ teacher_response: response }).eq('id', matchId)
    setMatches(ms => ms.map(m => m.id === matchId ? { ...m, teacher_response: response } : m))
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/teacher/login')
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

      {/* 更新提醒 */}
      {daysSinceUpdate >= 7 && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
            ⚠️ 您的可用时间已 {daysSinceUpdate} 天未更新，请及时更新，避免影响家长匹配。
          </div>
        </div>
      )}

      {/* Tab */}
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
        </div>
      </div>

      {tab === 'profile' && (
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
          <div className="bg-white rounded-2xl p-4 space-y-4">
            <Field label="姓名/称呼">
              <input value={form.name || ''} onChange={e => set('name', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="如：张老师" />
            </Field>

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

            <Field label="头像图片链接">
              <input value={form.photo_url || ''} onChange={e => set('photo_url', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm" placeholder="粘贴图片URL（可选）" />
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
                  m.teacher_response === 'accepted' ? 'bg-green-100 text-green-700' :
                  m.teacher_response === 'declined' ? 'bg-gray-100 text-gray-500' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {m.teacher_response === 'accepted' ? '已接单' : m.teacher_response === 'declined' ? '已婉拒' : '待回复'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-1"><span className="text-gray-400">学生情况：</span>{m.bookings?.student_intro}</p>
              <p className="text-sm text-gray-600 mb-1"><span className="text-gray-400">可上课时间：</span>{m.bookings?.available_time}</p>
              {m.teacher_response === 'pending' && (
                <div className="flex gap-2 mt-3">
                  <button onClick={() => respond(m.id, 'accepted')}
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
