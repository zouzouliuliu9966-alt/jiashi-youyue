'use client'

import { useEffect, useState } from 'react'
import { Teacher } from '@/lib/types'
import TeacherCard from '@/components/TeacherCard'
import BookingModal from '@/components/BookingModal'

const SUBJECTS = ['全部', '语文', '数学', '英语', '物理', '化学', '生物', '地理', '政治', '历史', '艺术类']
const GRADES = ['全部', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三']
const TIERS = ['全部', '⭐⭐⭐ 精英档', '⭐⭐ 进阶档', '⭐ 基础档']

export default function Home() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [filtered, setFiltered] = useState<Teacher[]>([])
  const [subject, setSubject] = useState('全部')
  const [grade, setGrade] = useState('全部')
  const [tier, setTier] = useState('全部')
  const [selected, setSelected] = useState<Teacher | null>(null)

  useEffect(() => {
    fetch('/api/teachers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTeachers(data)
          setFiltered(data)
        }
      })
  }, [])

  useEffect(() => {
    let list = teachers
    if (subject !== '全部') list = list.filter(t => t.subjects?.includes(subject))
    if (grade !== '全部') list = list.filter(t => t.grades?.includes(grade))
    if (tier !== '全部') {
      const tierMap: Record<string, number> = { '⭐⭐⭐ 精英档': 3, '⭐⭐ 进阶档': 2, '⭐ 基础档': 1 }
      list = list.filter(t => t.tier === tierMap[tier])
    }
    setFiltered(list)
  }, [subject, grade, tier, teachers])

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">家师有约</h1>
          <p className="text-sm text-gray-500">严选师资 · 专业匹配 · 放心托付</p>
        </div>
      </div>

      <div className="bg-gradient-to-b from-orange-500 to-orange-400 text-white">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <h2 className="text-2xl font-bold mb-2">严选好老师，免费试课</h2>
          <p className="text-orange-100 mb-6">试课满意再付费 · 教务全程跟进 · 不满意随时退</p>
          <button
            onClick={() => document.getElementById('teacher-list')?.scrollIntoView({ behavior: 'smooth' })}
            className="bg-white text-orange-500 font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-xl transition-all text-lg"
          >
            立即预约试课
          </button>
        </div>
      </div>

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
        </div>
      </div>

      <div id="teacher-list" className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {filtered.length === 0 ? (
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
              <p className="font-medium text-sm text-gray-800 mb-1">免费试课</p>
              <p className="text-xs text-gray-500">首次试课不收费，满意再付费</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="font-medium text-sm text-gray-800 mb-1">资金托管</p>
              <p className="text-xs text-gray-500">课时费由平台托管，上完课再结算</p>
            </div>
            <div>
              <div className="w-12 h-12 mx-auto mb-2 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="font-medium text-sm text-gray-800 mb-1">教务跟进</p>
              <p className="text-xs text-gray-500">专属教务全程对接，课后回访保障质量</p>
            </div>
          </div>
        </div>
        <a href="/rules" className="block mt-4 text-center text-sm text-orange-500 hover:text-orange-600">
          查看平台规则 →
        </a>
      </div>

      {selected && <BookingModal teacher={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}
