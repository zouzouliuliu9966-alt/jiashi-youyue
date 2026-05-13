'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ResetRequest = {
  id: string
  teacher_id: string
  contact: string
  contact_type: 'phone' | 'email'
  status: 'pending' | 'done' | 'rejected'
  note: string | null
  reset_token: string | null
  token_expires_at: string | null
  token_used_at: string | null
  created_at: string
  processed_at: string | null
  teachers: { name: string; email: string } | null
}

export default function AdminPasswordResets() {
  const router = useRouter()
  const [requests, setRequests] = useState<ResetRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const adminHeaders = useCallback((): HeadersInit => {
    const pw = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') || '' : ''
    return { 'x-admin-password': pw }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_auth')
    router.push('/admin/login')
  }, [router])

  const reload = useCallback(async () => {
    const res = await fetch('/api/admin/password-resets', { headers: adminHeaders() })
    if (res.status === 401) { logout(); return }
    const data = await res.json()
    if (Array.isArray(data)) setRequests(data)
  }, [adminHeaders, logout])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('admin_auth')) {
      router.push('/admin/login'); return
    }
    reload().finally(() => setLoading(false))
  }, [router, reload])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 兜底
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy'); document.body.removeChild(ta); return true }
      catch { document.body.removeChild(ta); return false }
    }
  }

  const approve = async (r: ResetRequest) => {
    setBusyId(r.id)
    const res = await fetch(`/api/admin/password-resets/${r.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ action: 'approve' }),
    })
    setBusyId(null)
    if (res.status === 401) { logout(); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { alert('生成失败：' + (json.error || '未知错误')); return }

    const ok = await copyToClipboard(json.resetUrl)
    showToast(ok ? `链接已复制，去微信粘贴给「${r.teachers?.name || '老师'}」` : '链接已生成（复制失败，请手动复制）')
    reload()
  }

  const copyExisting = async (r: ResetRequest) => {
    if (!r.reset_token) return
    const url = `${window.location.origin}/teacher/reset-password?token=${r.reset_token}`
    const ok = await copyToClipboard(url)
    showToast(ok ? '链接已重新复制到剪贴板' : '复制失败，请手动复制')
  }

  const reject = async (id: string) => {
    if (!confirm('确认拒绝该申请？')) return
    setBusyId(id)
    const res = await fetch(`/api/admin/password-resets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ action: 'reject' }),
    })
    setBusyId(null)
    if (res.status === 401) { logout(); return }
    const json = await res.json().catch(() => ({}))
    if (!res.ok) { alert('操作失败：' + (json.error || '未知错误')); return }
    reload()
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>

  const pending = requests.filter(r => r.status === 'pending')
  const processed = requests.filter(r => r.status !== 'pending')

  const tokenStillValid = (r: ResetRequest) =>
    !!r.reset_token && !r.token_used_at && !!r.token_expires_at && new Date(r.token_expires_at).getTime() > Date.now()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4 overflow-x-auto">
          <h1 className="font-bold text-gray-900 shrink-0">管理后台</h1>
          <Link href="/admin/bookings" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">预约管理</Link>
          <Link href="/admin/teachers" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">老师管理</Link>
          <Link href="/admin/lessons" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">课时管理</Link>
          <Link href="/admin/password-resets" className="text-sm text-orange-500 font-medium shrink-0">密码重置</Link>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600 ml-auto shrink-0">退出</button>
        </div>
      </div>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-20 bg-gray-900 text-white text-sm px-4 py-2 rounded-xl shadow-lg max-w-[90vw] text-center">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-6">
        <section>
          <h2 className="font-medium text-gray-900 mb-3">待处理申请（{pending.length}）</h2>
          {pending.length === 0 ? (
            <div className="text-center text-gray-400 py-8 bg-white rounded-2xl">暂无待处理申请</div>
          ) : (
            <div className="space-y-3">
              {pending.map(r => {
                const valid = tokenStillValid(r)
                return (
                  <div key={r.id} className="bg-white rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">{r.teachers?.name || '(未知教师)'}</span>
                        <span className="text-xs text-gray-400 ml-2">{r.teachers?.email}</span>
                      </div>
                      {valid ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">链接已发，待老师改密</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">待处理</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mb-2">
                      申请时填写的{r.contact_type === 'phone' ? '手机号' : '邮箱'}：<span className="text-gray-900">{r.contact}</span>
                    </div>
                    <div className="text-xs text-gray-400 mb-3">
                      提交于 {new Date(r.created_at).toLocaleString('zh-CN')}
                      {valid && r.token_expires_at && (
                        <> · 链接 {new Date(r.token_expires_at).toLocaleString('zh-CN')} 过期</>
                      )}
                    </div>

                    {valid ? (
                      <div className="flex gap-2">
                        <button onClick={() => copyExisting(r)}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-sm font-medium">
                          再次复制链接
                        </button>
                        <button onClick={() => approve(r)} disabled={busyId === r.id}
                          className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm">
                          重新生成
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => approve(r)} disabled={busyId === r.id}
                          className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-xl py-2 text-sm font-medium">
                          {busyId === r.id ? '生成中...' : '生成链接并复制'}
                        </button>
                        <button onClick={() => reject(r.id)} disabled={busyId === r.id}
                          className="px-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm">
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {processed.length > 0 && (
          <section>
            <h2 className="font-medium text-gray-900 mb-3">历史记录（{processed.length}）</h2>
            <div className="space-y-2">
              {processed.map(r => (
                <div key={r.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className="font-medium text-gray-900">{r.teachers?.name || '(未知教师)'}</span>
                      <span className="text-xs text-gray-400 ml-2">{r.contact}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      r.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {r.status === 'done' ? '已重置' : '已拒绝'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {r.processed_at ? `处理于 ${new Date(r.processed_at).toLocaleString('zh-CN')}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
