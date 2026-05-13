'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ChangePassword() {
  const router = useRouter()
  const [teacherId, setTeacherId] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [token, setToken] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [oldPwdWrong, setOldPwdWrong] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const id = localStorage.getItem('teacher_id')
    const tk = localStorage.getItem('teacher_token')
    const name = localStorage.getItem('teacher_name') || ''
    if (!id || !tk) { router.push('/teacher/login'); return }
    setTeacherId(id)
    setToken(tk)
    setTeacherName(name)
  }, [router])

  const submit = async () => {
    setError('')
    setOldPwdWrong(false)
    if (!oldPassword) { setError('请输入旧密码'); return }
    if (newPassword.length < 6) { setError('新密码至少6位'); return }
    if (newPassword !== confirm) { setError('两次输入的新密码不一致'); return }
    if (oldPassword === newPassword) { setError('新密码不能与旧密码相同'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/teacher/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teacherId, oldPassword, newPassword }),
      })
      const json = await res.json()
      setSubmitting(false)
      if (!res.ok || json.error) {
        if (res.status === 401 && json.error === '旧密码不正确') {
          setOldPwdWrong(true)
          setError('旧密码不正确')
        } else {
          setError(json.error || '修改失败，请重试')
        }
        return
      }
      setDone(true)
      setTimeout(() => router.push('/teacher/dashboard'), 2000)
    } catch {
      setSubmitting(false)
      setError('网络异常，请重试')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">修改密码</h1>
        <p className="text-sm text-gray-500 mb-6">家师有约 · 教师端{teacherName && ` · ${teacherName}`}</p>

        {done ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
              密码修改成功，正在返回...
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">旧密码</label>
                <Link href="/teacher/forgot-password" className="text-xs text-orange-500 hover:text-orange-600">忘了旧密码？</Link>
              </div>
              <input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                placeholder="请输入当前密码" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                placeholder="至少6位" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">再次输入新密码</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="再次输入新密码" className="w-full border rounded-xl px-3 py-2.5 text-sm"
                onKeyDown={e => e.key === 'Enter' && submit()} />
            </div>

            {error && (
              <div className="text-red-500 text-sm">
                {error}
                {oldPwdWrong && (
                  <span className="block text-xs text-gray-500 mt-1">
                    忘记密码了？
                    <Link href="/teacher/forgot-password" className="text-orange-500 hover:text-orange-600 ml-1">点这里申请重置</Link>
                  </span>
                )}
              </div>
            )}

            <button onClick={submit} disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
              {submitting ? '提交中...' : '确认修改'}
            </button>

            <Link href="/teacher/dashboard"
              className="block text-center text-sm text-gray-500 hover:text-gray-700">
              取消，返回
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
