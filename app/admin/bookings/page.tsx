'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Booking, Teacher, Match } from '@/lib/types'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type BookingWithTeacher = Booking & { teachers: Teacher | null }
type MatchWithDetails = Match & { bookings: Booking; teachers: Teacher }

export default function AdminBookings() {
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingWithTeacher[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [pendingPayments, setPendingPayments] = useState<MatchWithDetails[]>([])
  // 待核销：已收到信息费，等这一单真的开课了才算平台的；没成单就退给老师
  const [pendingClearing, setPendingClearing] = useState<MatchWithDetails[]>([])
  const [clearingUnavailable, setClearingUnavailable] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pushingId, setPushingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'bookings' | 'payments' | 'clearing'>('bookings')

  const adminHeaders = useCallback((): HeadersInit => {
    const pw = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') || '' : ''
    return { 'x-admin-password': pw }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('admin_auth')
    router.push('/admin/login')
  }, [router])

  // 请求序号：确认收款/核销后会立刻再 load 一次，
  // 若更早发出的那次请求晚返回，会用旧快照覆盖列表，把已经处理掉的行重新显示出来。
  const loadSeq = useRef(0)

  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    const res = await fetch('/api/admin/bookings', { headers: adminHeaders() })
    if (res.status === 401) { logout(); return }
    if (!res.ok) { setLoading(false); return }
    const json = await res.json()
    setBookings(json.bookings || [])
    setTeachers(json.teachers || [])
    if (seq !== loadSeq.current) return   // 有更新的请求在跑，丢弃这次的旧结果
    setPendingPayments(json.pendingPayments || [])
    setPendingClearing(json.pendingClearing || [])
    setClearingUnavailable(!!json.clearingUnavailable)
    setLoading(false)
  }, [adminHeaders, logout])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('admin_auth')) {
      router.push('/admin/login')
      return
    }
    load()
  }, [router, load])

  const pushToTeacher = async (booking: BookingWithTeacher, teacherId: string) => {
    setPushingId(booking.id)
    const res = await fetch('/api/admin/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ booking_id: booking.id, teacher_id: teacherId }),
    })
    setPushingId(null)
    if (res.status === 401) { logout(); return }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert('推送失败：' + (json.error || '未知错误'))
      return
    }
    setBookings(bs => bs.map(b => b.id === booking.id ? { ...b, status: 'sent' } : b))
    alert('已推送给老师，等待老师回复')
  }

  const confirmPayment = async (matchId: string, bookingId: string) => {
    const res = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ action: 'confirm_payment' }),
    })
    if (res.status === 401) { logout(); return }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert('确认失败：' + (json.error || '未知错误'))
      return
    }
    setPendingPayments(ps => ps.filter(p => p.id !== matchId))
    setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, status: 'matched' } : b))
    // 待核销列表以服务端为准重新拉一次，别用本地记录拼 ——
    // 另一个教务同时在处理时，本地拼出来的条目实际上已经不存在了
    load()
  }

  // 核销 / 退款。退款要填原因，教务自己心里有数，也让老师看得到备注
  const settleFee = async (matchId: string, action: 'clear_fee' | 'refund_fee') => {
    let note: string | null = null
    if (action === 'refund_fee') {
      note = prompt('退款原因（会显示给老师，可留空）\n例：家长临时取消，已微信转回', '')
      if (note === null) return          // 点了取消
      if (!confirm('确认这笔信息费已经退回给老师了吗？\n（系统只记账，实际转账要你手动操作）')) return
    } else {
      if (!confirm('确认核销？表示这一单确实开课了，这笔信息费算平台收入。')) return
    }
    const res = await fetch(`/api/admin/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ action, note: note || undefined }),
    })
    if (res.status === 401) { logout(); return }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert('操作失败：' + (json.error || '未知错误'))
      return
    }
    setPendingClearing(ps => ps.filter(p => p.id !== matchId))
  }

  const updateStatus = async (id: string, status: Booking['status']) => {
    const res = await fetch(`/api/admin/bookings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders() },
      body: JSON.stringify({ status }),
    })
    if (res.status === 401) { logout(); return }
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      alert('更新失败：' + (json.error || '未知错误'))
      return
    }
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b))
  }

  const statusLabel: Record<string, string> = {
    pending: '待处理', sent: '已推送', matched: '已匹配', closed: '已关闭'
  }
  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    sent: 'bg-blue-100 text-blue-700',
    matched: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500'
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="font-bold text-gray-900">管理后台</h1>
            <Link href="/admin" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">看板</Link>
            <Link href="/admin/bookings" className="text-sm text-orange-500 font-medium">预约</Link>
            <Link href="/admin/teachers" className="text-sm text-gray-500 hover:text-gray-700">老师</Link>
            <Link href="/admin/lessons" className="text-sm text-gray-500 hover:text-gray-700">课时</Link>
            <Link href="/admin/password-resets" className="text-sm text-gray-500 hover:text-gray-700">密码</Link>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600">退出</button>
        </div>
      </div>

      {/* 子Tab：预约列表 / 待确认收款 */}
      <div className="max-w-3xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button onClick={() => setActiveTab('bookings')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'bookings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            预约列表
          </button>
          <button onClick={() => setActiveTab('payments')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'payments' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            待确认收款 {pendingPayments.length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 ml-1">
                {pendingPayments.length}
              </span>
            )}
          </button>
          <button onClick={() => setActiveTab('clearing')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'clearing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            待核销 {pendingClearing.length > 0 && (
              <span className="bg-amber-500 text-white text-xs rounded-full px-1.5 ml-1">
                {pendingClearing.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'clearing' && (
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {clearingUnavailable ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 leading-relaxed">
              待核销功能还没启用：数据库里缺 <code className="bg-amber-100 px-1 rounded">matches.fee_status</code> 等字段。
              去 Supabase 后台 SQL Editor 执行 <code className="bg-amber-100 px-1 rounded">supabase/fee_clearing.sql</code> 即可。
            </div>
          ) : pendingClearing.length === 0 ? (
            <div className="text-center text-gray-400 py-16">暂无待核销的信息费</div>
          ) : (
            <>
              <p className="text-xs text-gray-500 leading-relaxed bg-gray-50 rounded-xl p-3">
                这些老师已经付过信息费、也拿到了家长联系方式。
                <span className="font-medium">确实开课了就点「核销」</span>；
                <span className="font-medium">没成单就点「已退款」</span>——
                系统只记账，钱要你自己手动转回去。
              </p>
              {pendingClearing.map(p => (
                <div key={p.id} className="bg-white rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {p.teachers?.name} · 信息费 {p.payment_amount ? `¥${p.payment_amount}` : '（未记金额）'}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1 mb-3">
                    <p><span className="text-gray-400">学生：</span>{p.bookings?.student_grade} · {p.bookings?.address}</p>
                    <p><span className="text-gray-400">家长：</span>{p.bookings?.phone}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => settleFee(p.id, 'clear_fee')}
                      className="flex-1 bg-gray-800 hover:bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium">
                      核销（已开课）
                    </button>
                    <button onClick={() => settleFee(p.id, 'refund_fee')}
                      className="flex-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-medium">
                      已退款（没成单）
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {pendingPayments.length === 0 ? (
            <div className="text-center text-gray-400 py-16">暂无待确认的收款</div>
          ) : pendingPayments
              .slice()
              .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map(p => {
                const elapsedMin = Math.floor((Date.now() - new Date(p.created_at).getTime()) / 60000)
                const isOverdue = elapsedMin >= 60
                return (
                  <div key={p.id} className={`rounded-2xl p-4 ${isOverdue ? 'bg-red-50 border-2 border-red-400' : 'bg-white'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="font-medium text-gray-900">{p.teachers?.name} 接单</span>
                        {isOverdue ? (
                          <span className="text-red-700 text-xs ml-2 bg-red-100 px-2 py-0.5 rounded-full font-medium">
                            ⚠ 已超时 {elapsedMin} 分钟，请主动退款
                          </span>
                        ) : (
                          <span className="text-orange-600 text-xs ml-2 bg-orange-50 px-2 py-0.5 rounded-full">
                            待确认（剩余 {60 - elapsedMin} 分钟）
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1 mb-3">
                      <p><span className="text-gray-400">学生：</span>{p.bookings?.student_grade} · {p.bookings?.address}</p>
                      <p><span className="text-gray-400">学生情况：</span>{p.bookings?.student_intro}</p>
                      <p><span className="text-gray-400">家长手机：</span>{p.bookings?.phone}</p>
                      <p><span className="text-gray-400">家长微信：</span>{p.bookings?.wechat}</p>
                      <p><span className="text-gray-400">老师课时费：</span><span className="text-orange-600 font-medium">{p.payment_amount || p.teachers?.price || '未设置'}</span></p>
                    </div>
                    <button onClick={() => confirmPayment(p.id, p.booking_id)}
                      className={`w-full text-white rounded-xl py-2.5 text-sm font-medium ${isOverdue ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                      {isOverdue ? '已超时 · 请确认或主动退款' : '确认已收款'}
                    </button>
                  </div>
                )
              })}
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-gray-900">预约列表（{bookings.length}条）</h2>
            <span className="text-xs text-gray-400">待处理：{bookings.filter(b => b.status === 'pending').length}条</span>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center text-gray-400 py-16">暂无预约记录</div>
          ) : bookings.map(b => (
            <div key={b.id} className="bg-white rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{b.student_grade}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[b.status]}`}>
                      {statusLabel[b.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{new Date(b.created_at).toLocaleString('zh-CN')}</p>
                </div>
                {b.teachers && (
                  <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-lg">
                    意向：{b.teachers.name}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-3">
                <p><span className="text-gray-400">手机：</span><span className="font-medium">{b.phone}</span></p>
                <p><span className="text-gray-400">微信：</span><span className="font-medium">{b.wechat}</span></p>
                <p className="col-span-2"><span className="text-gray-400">地址：</span>{b.address}</p>
                <p className="col-span-2"><span className="text-gray-400">时间：</span>{b.available_time}</p>
                <p className="col-span-2"><span className="text-gray-400">学生情况：</span>{b.student_intro}</p>
              </div>

              {b.status === 'pending' && (
                <div className="border-t pt-3 mt-1">
                  <p className="text-xs text-gray-500 mb-2">推送给老师：</p>
                  <div className="flex flex-wrap gap-2">
                    {teachers.map(t => (
                      <button key={t.id}
                        onClick={() => pushToTeacher(b, t.id)}
                        disabled={pushingId === b.id}
                        className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50">
                        {t.name}（{['', '基础', '进阶', '精英'][t.tier]}）
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {b.status !== 'matched' && (
                  <button onClick={() => updateStatus(b.id, 'matched')}
                    className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                    标记已匹配
                  </button>
                )}
                {b.status !== 'closed' && (
                  <button onClick={() => updateStatus(b.id, 'closed')}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg text-xs font-medium">
                    关闭
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
