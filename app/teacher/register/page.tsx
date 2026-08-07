'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TeacherRegister() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const register = async () => {
    if (!name.trim()) { setError('请填写称呼'); return }
    if (!/^\d{11}$/.test(phone)) { setError('请填写11位手机号'); return }
    if (password.length < 6) { setError('密码至少6位'); return }

    // 手机号就是账号。Supabase Auth 需要邮箱，这里用手机号生成一个内部邮箱，
    // 老师完全感知不到；登录页输入手机号时会做同样的转换
    const loginEmail = `${phone}@phone.jiashiyouyue.cn`

    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/teacher/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: loginEmail, phone, password })
      })
      const json = await res.json()

      if (json.error) {
        setLoading(false)
        if (json.error.includes('already')) {
          setError('该手机号已注册，请直接登录')
        } else {
          setError('注册失败：' + json.error)
        }
        return
      }

      // 注册成功就直接把人送进教师端，别再要求把刚设的密码重输一遍 ——
      // 这是招募漏斗最后一步，多一道门就多一批人走掉。
      // 复用登录接口拿 token，不另开一套鉴权。
      //
      // 这里的 try/catch 必须是独立的：到这一步账号已经建好了，自动登录再出
      // 任何差错（断网、超时、限流）都只是"少走一步捷径"，绝不能落到外层
      // catch 去显示"注册失败" —— 那会让老师以为没注册成功，回头再注册一次，
      // 撞上"该手机号已注册"直接卡死在门口。
      let loggedIn = false
      try {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginEmail, password }),
        })
        const loginJson = await loginRes.json().catch(() => ({}))
        if (loginRes.ok && loginJson.token && loginJson.teacher) {
          localStorage.setItem('teacher_token', loginJson.token)
          localStorage.setItem('teacher_id', loginJson.teacher.id)
          localStorage.setItem('teacher_name', loginJson.teacher.name)
          loggedIn = true
        }
      } catch {
        // 吞掉：账号已建好，下面回退到登录页
      }

      // 这里**不要** setLoading(false)：账号已经建好了，接下来就是跳走。
      // 提前把按钮恢复成可点，慢网络下导航还没完成老师就能再点一次「注册」，
      // 第二次必然撞上「该手机号已注册」。让按钮一直 disabled 到页面切走为止。
      router.push(loggedIn ? '/teacher/dashboard?welcome=1' : '/teacher/login?registered=1')
    } catch {
      setLoading(false)
      setError('网络连接失败，请重试')
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl shadow-sm p-6 w-full max-w-sm">
        <h1 className="text-xl font-bold text-gray-900 mb-1">教师注册</h1>
        <p className="text-sm text-gray-500 mb-6">填 3 项就能提交，1 分钟搞定</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              怎么称呼您 <span className="text-red-500">*</span>
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="如：张老师"
              className="w-full border rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              手机号 <span className="text-red-500">*</span>
            </label>
            <input type="tel" inputMode="numeric" maxLength={11}
              value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="11位手机号，也是您的登录账号"
              className="w-full border rounded-xl px-3 py-2.5 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              设置密码 <span className="text-red-500">*</span>
            </label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="至少6位"
              className="w-full border rounded-xl px-3 py-2.5 text-sm"
              onKeyDown={e => e.key === 'Enter' && register()} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button onClick={register} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-3 font-medium text-sm transition-colors">
            {loading ? '注册中...' : '注册'}
          </button>

          <p className="text-xs text-gray-400 leading-relaxed">
            注册后登录教师端补充科目、年级、可上课时间等资料，教务审核通过后即可展示接单。
          </p>
        </div>

        <p className="text-sm text-gray-500 text-center mt-6">
          已有账号？<Link href="/teacher/login" className="text-orange-500 hover:text-orange-600">去登录</Link>
        </p>
      </div>
    </main>
  )
}
