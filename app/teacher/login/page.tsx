'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function TeacherLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async () => {
    if (!email || !password) { setError('请填写邮箱和密码'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('邮箱或密码错误，请重试')
    } else {
      router.push('/teacher/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">老师登录</h1>
        <p className="text-sm text-gray-500 mb-6">家师有约 · 教师端</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="请输入邮箱" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
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

        <p className="text-xs text-gray-400 text-center mt-6">
          账号由平台管理员创建，如有问题请联系教务
        </p>
      </div>
    </main>
  )
}
