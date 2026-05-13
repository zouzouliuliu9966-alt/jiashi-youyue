'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPassword() {
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<null | { alreadyPending: boolean }>(null)

  const submit = async () => {
    if (!contact.trim()) { setError('请填写手机号或邮箱'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/teacher/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim() })
      })
      const json = await res.json()
      setLoading(false)
      if (!res.ok || json.error) {
        setError(json.error || '提交失败，请重试')
        return
      }
      setDone({ alreadyPending: !!json.alreadyPending })
    } catch {
      setLoading(false)
      setError('网络连接失败，请重试')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">找回密码</h1>
        <p className="text-sm text-gray-500 mb-6">家师有约 · 教师端</p>

        {done ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              {done.alreadyPending
                ? '你已有一个待处理的重置申请，管理员处理后会通过手机/邮箱通知你。'
                : '申请已提交，管理员会在工作时间内处理并通过手机/邮箱通知你新密码。'}
            </div>
            <Link href="/teacher/login"
              className="block text-center w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-medium text-sm">
              返回登录
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">注册时使用的手机号或邮箱</label>
              <input value={contact} onChange={e => setContact(e.target.value)}
                placeholder="请输入手机号或邮箱"
                className="w-full border rounded-xl px-3 py-2.5 text-sm"
                onKeyDown={e => e.key === 'Enter' && submit()} />
              <p className="text-xs text-gray-400 mt-2">提交后管理员会人工核实并重置密码，新密码会通过手机/邮箱告知。</p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button onClick={submit} disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
              {loading ? '提交中...' : '提交申请'}
            </button>

            <p className="text-sm text-gray-500 text-center">
              想起来了？<Link href="/teacher/login" className="text-orange-500 hover:text-orange-600">返回登录</Link>
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
