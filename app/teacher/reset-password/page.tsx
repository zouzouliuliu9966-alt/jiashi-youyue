'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function ResetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [validating, setValidating] = useState(true)
  const [validError, setValidError] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setValidError('链接无效'); setValidating(false); return }
    fetch(`/api/teacher/reset-password?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) setValidError(json.error)
        else setTeacherName(json.teacherName || '')
      })
      .catch(() => setValidError('网络异常，请重试'))
      .finally(() => setValidating(false))
  }, [token])

  const submit = async () => {
    if (newPassword.length < 6) { setError('新密码至少6位'); return }
    if (newPassword !== confirm) { setError('两次输入的密码不一致'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/teacher/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })
      const json = await res.json()
      setSubmitting(false)
      if (!res.ok || json.error) { setError(json.error || '设置失败，请重试'); return }
      setDone(true)
      setTimeout(() => router.push('/teacher/login'), 2000)
    } catch {
      setSubmitting(false)
      setError('网络异常，请重试')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">设置新密码</h1>
        <p className="text-sm text-gray-500 mb-6">家师有约 · 教师端</p>

        {validating ? (
          <p className="text-sm text-gray-400 text-center py-8">校验链接中...</p>
        ) : validError ? (
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {validError}。如需重新申请，请联系管理员或回到登录页重新提交。
            </div>
            <Link href="/teacher/login"
              className="block text-center w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-medium text-sm">
              返回登录
            </Link>
          </div>
        ) : done ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              密码已设置成功，正在跳转登录页...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {teacherName && <p className="text-sm text-gray-600">{teacherName}，请设置新的登录密码：</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="至少6位" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">再次输入</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="再次输入新密码" className="w-full border rounded-xl px-3 py-2.5 text-sm"
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button onClick={submit} disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
              {submitting ? '提交中...' : '设置新密码'}
            </button>
          </div>
        )}
      </div>
    </main>
  )
}

export default function ResetPassword() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>}>
      <ResetForm />
    </Suspense>
  )
}
