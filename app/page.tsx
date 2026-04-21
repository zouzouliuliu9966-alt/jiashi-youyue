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

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无符合条件的老师</div>
        ) : (
          filtered.map(teacher => (
            <TeacherCard key={teacher.id} teacher={teacher} onBook={() => setSelected(teacher)} />
          ))
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-700">
          <p className="font-medium mb-1">平台保障</p>
          <p>平台严选师资，为保障教学质量与资金安全，所有试听预约均由官方教务统一对接安排。</p>
        </div>
      </div>

      {selected && <BookingModal teacher={selected} onClose={() => setSelected(null)} />}
    </main>
  )
}
