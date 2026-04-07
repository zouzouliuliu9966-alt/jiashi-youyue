'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Teacher } from '@/lib/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminTeachers() {
  const router = useRouter()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newName, setNewName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('admin_auth')) {
      router.push('/admin/login'); return
    }
    supabase.from('teachers').select('*').order('tier', { ascending: false })
      .then(({ data }) => { if (data) setTeachers(data); setLoading(false) })
  }, [router])

  const createTeacher = async () => {
    if (!newEmail || !newName || !newPassword) { alert('请填写完整信息'); return }
    setCreating(true)
    // 通过API创建老师账号
    const res = await fetch('/api/admin/create-teacher', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, name: newName, password: newPassword })
    })
    const json = await res.json()
    setCreating(false)
    if (json.error) {
      alert('创建失败：' + json.error)
    } else {
      setAdding(false)
      setNewEmail(''); setNewName(''); setNewPassword('')
      const { data } = await supabase.from('teachers').select('*').order('tier', { ascending: false })
      if (data) setTeachers(data)
    }
  }

  const updateTier = async (id: string, tier: number) => {
    await supabase.from('teachers').update({ tier }).eq('id', id)
    setTeachers(ts => ts.map(t => t.id === id ? { ...t, tier: tier as 1 | 2 | 3 } : t))
  }

  const toggleVisible = async (id: string, current: boolean) => {
    await supabase.from('teachers').update({ is_visible: !current }).eq('id', id)
    setTeachers(ts => ts.map(t => t.id === id ? { ...t, is_visible: !current } : t))
  }

  const logout = () => { localStorage.removeItem('admin_auth'); router.push('/admin/login') }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-gray-900">管理后台</h1>
            <Link href="/admin/bookings" className="text-sm text-gray-500 hover:text-gray-700">预约管理</Link>
            <Link href="/admin/teachers" className="text-sm text-orange-500 font-medium">老师管理</Link>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">退出</button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900">老师列表（{teachers.length}位）</h2>
          <button onClick={() => setAdding(!adding)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium">
            + 新增老师
          </button>
        </div>

        {/* 新增老师表单 */}
        {adding && (
          <div className="bg-white rounded-2xl p-4 space-y-3 border-2 border-orange-200">
            <h3 className="font-medium text-gray-900">新增老师账号</h3>
            <input value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="老师称呼（如：张老师）" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            <input value={newEmail} onChange={e => setNewEmail(e.target.value)}
              placeholder="登录邮箱" type="email" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            <input value={newPassword} onChange={e => setNewPassword(e.target.value)}
              placeholder="初始密码（至少6位）" type="password" className="w-full border rounded-xl px-3 py-2.5 text-sm" />
            <div className="flex gap-2">
              <button onClick={createTeacher} disabled={creating}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-2.5 text-sm font-medium">
                {creating ? '创建中...' : '创建账号'}
              </button>
              <button onClick={() => setAdding(false)}
                className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm">
                取消
              </button>
            </div>
          </div>
        )}

        {teachers.length === 0 ? (
          <div className="text-center text-gray-400 py-16">暂无老师，点击新增</div>
        ) : teachers.map(t => (
          <div key={t.id} className="bg-white rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{t.name}</span>
                <span className={`text-xs ${!t.is_visible ? 'text-gray-400 line-through' : 'text-gray-500'}`}>
                  {t.email}
                </span>
              </div>
              <button onClick={() => toggleVisible(t.id, t.is_visible)}
                className={`text-xs px-2 py-1 rounded-full ${t.is_visible ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.is_visible ? '展示中' : '已隐藏'}
              </button>
            </div>

            <div className="text-sm text-gray-500 mb-3">
              {t.subjects?.join('·')} · {t.grades?.join('/')} · {t.price}元/时 · 教龄{t.years_exp}年
            </div>

            {/* 档位调整 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">档位：</span>
              {[3, 2, 1].map(tier => (
                <button key={tier}
                  onClick={() => updateTier(t.id, tier)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    t.tier === tier
                      ? tier === 3 ? 'bg-yellow-400 text-white' : tier === 2 ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}>
                  {tier === 3 ? '⭐⭐⭐ 精英' : tier === 2 ? '⭐⭐ 进阶' : '⭐ 基础'}
                </button>
              ))}
            </div>

            {/* 最后更新时间 */}
            <p className="text-xs text-gray-400 mt-2">
              最后更新：{new Date(t.last_updated_at).toLocaleDateString('zh-CN')}
              {Math.floor((Date.now() - new Date(t.last_updated_at).getTime()) / 86400000) >= 7 && (
                <span className="text-yellow-500 ml-1">⚠️ 超过7天未更新</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
