'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TeacherRegister() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const register = async () => {
    if (!name || !password) { setError('请填写称呼和密码'); return }
    if (!email && !phone) { setError('请填写邮箱或手机号（至少填一个）'); return }
    if (password.length < 6) { setError('密码至少6位'); return }

    // 用邮箱注册；如果只填了手机号，用手机号生成一个邮箱格式
    const loginEmail = email || `${phone}@phone.jiashiyouyue.cn`

    setLoading(true)
    setError('')
    const res = await fetch('/api/teacher/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email: loginEmail, phone, password })
    })
    const json = await res.json()
    setLoading(false)

    if (json.error) {
      if (json.error.includes('already')) {
        setError('该邮箱或手机号已注册，请直接登录')
      } else {
        setError('注册失败：' + json.error)
      }
    } else {
      router.push('/teacher/login?registered=1')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">教师注册</h1>
        <p className="text-sm text-gray-500 mb-6">家师有约 · 教师端</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">称呼 <span className="text-red-500">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="如：张老师" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="请输入手机号" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="请输入邮箱" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <p className="text-xs text-gray-400">手机号和邮箱填一个即可，用于登录</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设置密码 <span className="text-red-500">*</span></label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="至少6位" className="w-full border rounded-xl px-3 py-2.5 text-sm"
              onKeyDown={e => e.key === 'Enter' && register()} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={register} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
            {loading ? '注册中...' : '注册'}
          </button>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          已有账号？<Link href="/teacher/login" className="text-orange-500 hover:text-orange-600">去登录</Link>
        </p>
      </div>
    </main>
  )
}
