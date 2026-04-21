'use client'

import { useState } from 'react'
import { Teacher } from '@/lib/types'

export default function BookingModal({ teacher, onClose }: { teacher: Teacher; onClose: () => void }) {
  const [form, setForm] = useState({
    student_grade: '',
    phone: '',
    wechat: '',
    student_intro: '',
    available_time: '',
    address: '',
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.student_grade || !form.phone || !form.wechat || !form.student_intro || !form.available_time || !form.address) {
      alert('请填写所有必填项')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: teacher.id, ...form })
      })
      const json = await res.json()
      setLoading(false)
      if (json.error) {
        alert('提交失败，请重试')
      } else {
        setDone(true)
      }
    } catch {
      setLoading(false)
      alert('网络连接失败，请重试')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-4 pt-4 pb-3 border-b flex items-center justify-between">
          <h2 className="font-bold text-gray-900">预约 {teacher.name}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {done ? (
          <div className="px-4 py-12 text-center">
            <div className="text-4xl mb-4">✅</div>
            <p className="font-bold text-gray-900 text-lg mb-2">预约已提交！</p>
            <p className="text-gray-500 text-sm">教务老师将在 24 小时内添加您的微信为您匹配，请留意好友申请。</p>
            <button onClick={onClose} className="mt-6 px-8 py-2.5 bg-orange-500 text-white rounded-xl text-sm">
              好的
            </button>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            <Field label="学生年级" required>
              <select value={form.student_grade} onChange={e => set('student_grade', e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm">
                <option value="">请选择</option>
                {['一年级','二年级','三年级','四年级','五年级','六年级',
                  '初一','初二','初三','高一','高二','高三','其他'].map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>

            <Field label="手机号" required>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                placeholder="请输入手机号" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            </Field>

            <Field label="微信号" required>
              <input value={form.wechat} onChange={e => set('wechat', e.target.value)}
                placeholder="请输入微信号" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            </Field>

            <Field label="学生简介" required hint="请填写：年级+性别、就读学校、性格特点、目前学情（基础薄弱/想提分等）、其他需老师注意的">
              <textarea value={form.student_intro} onChange={e => set('student_intro', e.target.value)}
                rows={4} placeholder="例：初二男生，板桥中学，偏外向，数学基础薄弱，需要从头梳理..."
                className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none" />
            </Field>

            <Field label="可上课时间" required>
              <input value={form.available_time} onChange={e => set('available_time', e.target.value)}
                placeholder="例：周一三五晚上、周末全天" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            </Field>

            <Field label="上课地址" required>
              <input value={form.address} onChange={e => set('address', e.target.value)}
                placeholder="例：雨花台区板桥中学附近" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            </Field>

            <button onClick={submit} disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
              {loading ? '提交中...' : '提交预约'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
      {children}
    </div>
  )
}
