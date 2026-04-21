'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const justRegistered = searchParams.get('registered') === '1'
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async () => {
    if (!account || !password) { setError('请填写账号和密码'); return }
    setLoading(true)
    setError('')

    // 如果输入的是手机号，转换成邮箱格式
    const email = /^\d{11}$/.test(account) ? `${account}@phone.jiashiyouyue.cn` : account

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const json = await res.json()
      setLoading(false)

      if (!res.ok || json.error) {
        setError(json.error || '登录失败，请重试')
      } else {
        // 存储登录信息到 localStorage
        localStorage.setItem('teacher_token', json.token)
        localStorage.setItem('teacher_id', json.teacher.id)
        localStorage.setItem('teacher_name', json.teacher.name)
        router.push('/teacher/dashboard')
      }
    } catch {
      setLoading(false)
      setError('网络连接失败，请重试')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">老师登录</h1>
        <p className="text-sm text-gray-500 mb-6">家师有约 · 教师端</p>

        {justRegistered && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700 mb-4">
            注册成功！请用刚才的账号密码登录。
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号或邮箱</label>
            <input value={account} onChange={e => setAccount(e.target.value)}
              placeholder="请输入手机号或邮箱" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码" className="w-full border rounded-xl px-3 py-2.5 text-sm"
              onKeyDown={e => e.key === 'Enter' && login()} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={login} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
            {loading ? '登录中...' : '登录'}
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          还没有账号？<Link href="/teacher/register" className="text-orange-500 hover:text-orange-600">立即注册</Link>
        </p>
      </div>
    </main>
  )
}

export default function TeacherLogin() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>}>
      <LoginForm />
    </Suspense>
  )
}
