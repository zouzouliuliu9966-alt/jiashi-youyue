'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Teacher } from '@/lib/types'
import TeacherCard from '@/components/TeacherCard'
import BookingModal from '@/components/BookingModal'

const SUBJECTS = ['全部', '语文', '数学', '英语', '物理', '化学', '生物', '地理', '政治', '历史', '艺术类']
const GRADES = ['全部', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']
const TIERS = ['全部', '⭐⭐⭐ 精英档', '⭐⭐ 进阶档', '⭐ 基础档']
const MODES = ['全部', '可上门', '支持网课', '去工作室']
// 「均可」的老师三种方式都接受，所以每个筛选项都该把 TA 算进来
const MODE_MATCH: Record<string, string[]> = {
  '可上门': ['上门', '均可'],
  '支持网课': ['网课', '均可'],
  '去工作室': ['工作室', '均可'],
}

export default function Home() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [filtered, setFiltered] = useState<Teacher[]>([])
  const [subject, setSubject] = useState('全部')
  const [grade, setGrade] = useState('全部')
  const [tier, setTier] = useState('全部')
  const [mode, setMode] = useState('全部')
  const [selected, setSelected] = useState<Teacher | null>(null)
  const [loading, setLoading] = useState(true)
  // 微信里点《用户协议》是整页硬导航，回来弹窗已经销毁了，用户只看到首页。
  // BookingModal 把草稿连同 teacher_id 一起暂存，这里给一个回到那份草稿的入口，
  // 否则「返回后可从首页继续」就又是一句做不到的承诺。
  const [draft, setDraft] = useState<{ key: string; teacher_id: string; teacher_name: string } | null>(null)

  useEffect(() => {
    fetch('/api/teachers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTeachers(data)
          setFiltered(data)
        }
      })
      .finally(() => setLoading(false))

    // 扫一遍有没有未填完的预约草稿。
    // 逐份 try/catch：一份坏掉的草稿不能让整轮扫描停下，后面有效的就看不到了。
    // 取 saved_at 最新的一份 —— sessionStorage 的枚举顺序不代表最近填的。
    try {
      let best: { key: string; teacher_id: string; teacher_name: string; saved_at: number } | null = null
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (!k?.startsWith('booking_draft:')) continue
        try {
          const d = JSON.parse(sessionStorage.getItem(k) || '{}')
          // 只认真填过东西的草稿，空表单不打扰用户
          const filled = d.form && Object.entries(d.form)
            .some(([key, v]) => key !== 'course_type' && typeof v === 'string' && v.trim())
          if (!filled || !d.teacher_id) continue
          const saved = typeof d.saved_at === 'number' ? d.saved_at : 0
          if (!best || saved > best.saved_at) {
            best = { key: k, teacher_id: d.teacher_id, teacher_name: d.teacher_name || '这位老师', saved_at: saved }
          }
        } catch { /* 这一份坏了，跳过继续看下一份 */ }
      }
      // sessionStorage 只在浏览器有，不能放进 useState 惰性初始化
      // （首页参与 SSR，会崩；改成 typeof window 判断又会 hydration 不一致），
      // 挂载后读再 setState 是这个场景的正解
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (best) setDraft(best)
    } catch { /* 存储被禁用就没有草稿，正常走 */ }
  }, [])

  useEffect(() => {
    let list = teachers
    if (subject !== '全部') list = list.filter(t => t.subjects?.includes(subject))
    if (grade !== '全部') list = list.filter(t => t.grades?.includes(grade))
    if (tier !== '全部') {
      const tierMap: Record<string, number> = { '⭐⭐⭐ 精英档': 3, '⭐⭐ 进阶档': 2, '⭐ 基础档': 1 }
      list = list.filter(t => t.tier === tierMap[tier])
    }
    if (mode !== '全部') {
      const accepted = MODE_MATCH[mode] || []
      list = list.filter(t => accepted.includes(t.teaching_mode))
    }
    setFiltered(list)
  }, [subject, grade, tier, mode, teachers])

  const discardDraft = () => {
    if (draft) { try { sessionStorage.removeItem(draft.key) } catch { /* 忽略 */ } }
    setDraft(null)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">家师有约</h1>
            <p className="text-sm text-gray-500">教务面试筛选 · 一对一匹配</p>
          </div>
          <Link href="/my-lessons" className="text-sm text-orange-500 hover:text-orange-600">我的课时</Link>
        </div>
      </div>

      <div className="bg-gradient-to-b from-orange-500 to-orange-400 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <h2 className="text-2xl font-bold mb-2">严选南京家教 · 教务一对一匹配</h2>
          <p className="text-orange-100 mb-6">教务面试筛选 · 免费匹配 · 不满意可换老师</p>
          <button
            onClick={() => document.getElementById('teacher-list')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-white text-orange-500 font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all text-lg"
          >
            立即查看老师
          </button>
        </div>
      </div>

      {draft && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <p className="text-sm text-orange-800 flex-1">
              您有一份填了一半的预约（{draft.teacher_name}）
            </p>
            <button
              onClick={() => {
                const t = teachers.find(x => x.id === draft.teacher_id)
                if (t) { setSelected(t); return }
                // 列表还没加载完就点，teachers 是空的，这时不能判成"已下架"
                if (loading) { alert('老师列表还在加载，请稍等一下再点'); return }
                alert('这位老师已经下架了，这份草稿用不上了')
                discardDraft()
              }}
              className="shrink-0 text-sm font-medium text-orange-600 hover:text-orange-700"
            >
              继续填写 →
            </button>
            {/* 丢弃必须真删存储：草稿里有手机号、学生情况和上课地址，
                只清 React 状态的话刷新又回来了，用户没有任何办法把它删掉 */}
            <button onClick={discardDraft} aria-label="丢弃这份草稿"
              className="shrink-0 text-orange-300 hover:text-orange-500 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 space-y-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-gray-500 shrink-0 self-center">科目</span>
            {SUBJECTS.map(s => (
              <button key={s} onClick={() => setSubject(s)}
                className={`shrink-0 px-3 py-1 rounded-full text-sm ${subject === s ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-gray-500 shrink-0 self-center">年级</span>
            {GRADES.map(g => (
              <button key={g} onClick={() => setGrade(g)}
                className={`shrink-0 px-3 py-1 rounded-full text-sm ${grade === g ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {g}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-gray-500 shrink-0 self-center">档位</span>
            {TIERS.map(t => (
              <button key={t} onClick={() => setTier(t)}
                className={`shrink-0 px-3 py-1 rounded-full text-sm ${tier === t ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-gray-500 shrink-0 self-center">方式</span>
            {MODES.map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`shrink-0 px-3 py-1 rounded-full text-sm ${mode === m ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div id="teacher-list" className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无符合条件的老师</div>
        ) : (
          filtered.map(teacher => (
            <TeacherCard key={teacher.id} teacher={teacher} onBook={() => setSelected(teacher)} />
          ))
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="bg-orange-50 rounded-xl p-6">
          <h3 className="text-center font-bold text-gray-800 mb-6">平台保障</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-medium text-sm text-gray-800 mb-1">严选师资</p>
              <p className="text-xs text-gray-500">教务逐位面试 · 教学经历核对过</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="font-medium text-sm text-gray-800 mb-1">免费匹配</p>
              <p className="text-xs text-gray-500">教务一对一推荐，不收家长任何中介费</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-medium text-sm text-gray-800 mb-1">教务跟进</p>
              <p className="text-xs text-gray-500">课后定期回访，不满意可协调换老师</p>
            </div>
          </div>
        </div>
        <a href="/rules" className="block mt-4 text-center text-sm text-orange-500 hover:text-orange-600">
          查看平台规则 →
        </a>

        {/* 老师入口。放在页脚不抢家长的注意力，主要靠直接把 /laoshi 链接发到教师群 */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <Link href="/laoshi" className="text-sm text-gray-400 hover:text-gray-600">
            我是老师，我要入驻 →
          </Link>
        </div>

        {/* 法律入口。有页面没入口等于没有，别删 */}
        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
          <Link href="/terms" className="hover:text-gray-600">用户协议</Link>
          <Link href="/privacy" className="hover:text-gray-600">隐私政策</Link>
          <Link href="/report" className="hover:text-gray-600">投诉举报</Link>
        </div>
      </div>

      {selected && (
        <BookingModal
          key={selected.id}
          teacher={selected}
          onClose={() => setSelected(null)}
          // 提交成功后横幅必须撤掉，否则它还挂着、点开是一份空表单
          onSubmitted={() => setDraft(d => (d?.teacher_id === selected.id ? null : d))}
        />
      )}
    </main>
  )
}
