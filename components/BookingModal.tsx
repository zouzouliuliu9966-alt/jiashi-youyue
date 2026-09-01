'use client'

import { useEffect, useState } from 'react'
import { Teacher } from '@/lib/types'
import { LEGAL } from '@/lib/legal'

// 用户在微信里点《用户协议》会触发整页硬导航，这个弹窗连同已填内容一起销毁，
// 回来要重填 7 个字段 —— 家长直接就走了。所以边填边暂存，提交成功后清掉。
//
// 🔴 两条铁规矩，别改：
// 1) key 必须带 teacher.id。用全局 key 的话，给张老师填的手机号、学生情况
//    会原样出现在李老师的预约表单里。
// 2) 勾选状态**永远不进草稿**。自动替用户勾上的同意不是同意，
//    每次都得他自己点一下。
const draftKey = (teacherId: string) => `booking_draft:${teacherId}`

const EMPTY = {
  student_grade: '',
  course_type: '一对一',
  phone: '',
  wechat: '',
  student_intro: '',
  available_time: '',
  address: '',
}

export default function BookingModal({ teacher, onClose, onSubmitted }: {
  teacher: Teacher
  onClose: () => void
  /** 提交成功后通知首页把「继续填写」横幅撤掉，否则它会一直挂着、点开是空表单 */
  onSubmitted?: () => void
}) {
  // 惰性初始化直接把草稿读进初始 state，不走 effect ——
  // 用 effect 恢复会和保存 effect 抢顺序（保存那个拿旧闭包把空表单写回去，
  // 把刚恢复的草稿清掉），dev 的 StrictMode 双跑能稳定复现。
  // 这个组件只在用户点「预约」后才挂载，不参与 SSR，读 sessionStorage 是安全的。
  // 注意：外层必须给 <BookingModal key={teacher.id}>，否则换老师时 React 复用实例，
  // 初始化不会重跑，上一位老师的草稿会留在表单里。
  const [form, setForm] = useState<typeof EMPTY>(() => {
    try {
      const raw = sessionStorage.getItem(draftKey(teacher.id))
      if (raw) {
        const d = JSON.parse(raw)
        if (d.form) return { ...EMPTY, ...d.form }
      }
    } catch { /* 存储被禁用就当没暂存过 */ }
    return EMPTY
  })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  // 2026-09-01 按运营者要求简化成单个勾选（此前拆成协议/监护人/信息出境三个，
  // 手机上占大半屏，家长嫌烦）。监护人身份与信息出境的告知挪进《隐私政策》正文。
  const [agreeTerms, setAgreeTerms] = useState(false)

  // 勾选一律从未勾开始（useState 初值 false），草稿里也不存 ——
  // 自动替用户勾上的不算同意。
  // 存储可能被禁用（隐私模式、配额满）。写不进去就把"会暂存"那句提示撤掉，
  // 不能一边静默失败一边跟用户承诺内容不会丢。
  // 初始化时探一次，不放 effect 里 setState（会触发级联渲染，也被 lint 拦）。
  const [storageOk] = useState(() => {
    try {
      sessionStorage.setItem('__probe__', '1')
      sessionStorage.removeItem('__probe__')
      return true
    } catch { return false }
  })

  useEffect(() => {
    // 一个字没填就别落草稿 —— 只是点开看看的用户会留下一堆空记录，
    // 清不掉也没用。内容被清空时同样把那条删掉。
    const hasContent = Object.entries(form)
      .some(([k, v]) => k !== 'course_type' && typeof v === 'string' && v.trim())
    try {
      if (!hasContent) {
        sessionStorage.removeItem(draftKey(teacher.id))
        return
      }
      sessionStorage.setItem(draftKey(teacher.id), JSON.stringify({
        form,
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        saved_at: Date.now(),   // 多份草稿时首页取最近的一份
      }))
    } catch { /* 写不进去也不影响填写，提示已按 storageOk 撤掉 */ }
  }, [form, teacher.id, teacher.name])

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async () => {
    // 勾选校验放在字段校验前面：按钮变灰就是因为没勾选，
    // 点下去先报「请填写必填项」会让用户以为灰是别的原因。
    if (!agreeTerms) {
      alert('请先阅读并勾选下方的协议同意')
      return
    }
    if (!form.student_grade || !form.phone || !form.wechat || !form.student_intro || !form.available_time || !form.address) {
      alert('请填写所有必填项')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: teacher.id, ...form, agreed: agreeTerms }),
      })
      const json = await res.json().catch(() => ({}))
      setLoading(false)
      if (!res.ok || json.error) {
        // 4xx 是我们自己写的中文提示，可以直接给用户看；
        // 5xx 是数据库/服务端原文（英文、含表名列名），不能甩给家长
        alert(res.status >= 500 || !json.error
          ? `提交失败，请稍后重试，或直接加教务企业微信 ${LEGAL.contactWecom}`
          : json.error)
        return
      } else {
        try { sessionStorage.removeItem(draftKey(teacher.id)) } catch { /* 忽略 */ }
        onSubmitted?.()
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
            <p className="text-gray-500 text-sm">教务将在 24 小时内加您微信，根据需求为您推荐老师并对接首次课程，请留意好友申请。</p>
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

            <Field label="课程类型" required>
              <div className="flex gap-3">
                {['一对一', '小组课'].map(t => (
                  <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="course_type" value={t} checked={form.course_type === t}
                      onChange={e => set('course_type', e.target.value)}
                      className="accent-orange-500" />
                    <span className="text-sm text-gray-700">{t}</span>
                    {t === '一对一' && <span className="text-xs text-orange-500">推荐</span>}
                    {t === '小组课' && <span className="text-xs text-gray-400">名额有限</span>}
                  </label>
                ))}
              </div>
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

            <label className="flex items-start gap-2 text-xs text-gray-600 leading-relaxed pt-1">
              <input type="checkbox" checked={agreeTerms}
                onChange={e => setAgreeTerms(e.target.checked)} className="mt-0.5 shrink-0 w-4 h-4" />
              <span>
                我已阅读并同意
                <a href="/terms" target="_blank" rel="noopener noreferrer"
                  className="text-orange-600 font-medium">《用户协议》</a>
                和
                <a href="/privacy" target="_blank" rel="noopener noreferrer"
                  className="text-orange-600 font-medium">《隐私政策》</a>
                {storageOk && '（已填内容会暂存，点开不会丢）'}
              </span>
            </label>

            {/* 按钮不能 disabled：disabled 的按钮不触发 onClick，家长点了毫无反馈，
                会以为网卡了反复点然后走人。让它可点，由 submit() 给出明确提示。 */}
            <button onClick={submit} disabled={loading}
              className={`w-full text-white rounded-xl py-3 font-medium text-sm transition-colors ${
                agreeTerms ? 'bg-orange-500 hover:bg-orange-600' : 'bg-gray-300 hover:bg-gray-400'
              } disabled:bg-orange-300`}>
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
