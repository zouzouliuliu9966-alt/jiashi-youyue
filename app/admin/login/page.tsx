'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const login = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      localStorage.setItem('admin_auth', '1')
      router.push('/admin/bookings')
    } else {
      setError('密码错误')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">管理后台</h1>
        <p className="text-sm text-gray-500 mb-6">家师有约 · 教务端</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">管理密码</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              placeholder="请输入管理密码" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button onClick={login}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 font-medium text-sm">
            进入后台
          </button>
        </div>
      </div>
    </main>
  )
}
