'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
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
  const [loading, setLoading] = useState(true)
  const [pushingId, setPushingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'bookings' | 'payments'>('bookings')

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('admin_auth')) {
      router.push('/admin/login')
      return
    }
    Promise.all([
      supabase.from('bookings').select('*, teachers(*)').order('created_at', { ascending: false }),
      supabase.from('teachers').select('*').eq('is_visible', true).order('tier', { ascending: false }),
      supabase.from('matches').select('*, bookings(*), teachers(*)').eq('teacher_response', 'accepted').eq('payment_confirmed', false).order('created_at', { ascending: false }),
    ]).then(([{ data: b }, { data: t }, { data: p }]) => {
      if (b) setBookings(b as BookingWithTeacher[])
      if (t) setTeachers(t)
      if (p) setPendingPayments(p as MatchWithDetails[])
      setLoading(false)
    })
  }, [router])

  const pushToTeacher = async (booking: BookingWithTeacher, teacherId: string) => {
    setPushingId(booking.id)
    const { data: existing } = await supabase.from('matches')
      .select('id').eq('booking_id', booking.id).eq('teacher_id', teacherId).single()
    if (!existing) {
      await supabase.from('matches').insert({ booking_id: booking.id, teacher_id: teacherId })
      await supabase.from('bookings').update({ status: 'sent' }).eq('id', booking.id)
      setBookings(bs => bs.map(b => b.id === booking.id ? { ...b, status: 'sent' } : b))
    }
    setPushingId(null)
    alert('已推送给老师，等待老师回复')
  }

  const confirmPayment = async (matchId: string, bookingId: string) => {
    await supabase.from('matches').update({ payment_confirmed: true }).eq('id', matchId)
    await supabase.from('bookings').update({ status: 'matched' }).eq('id', bookingId)
    setPendingPayments(ps => ps.filter(p => p.id !== matchId))
    setBookings(bs => bs.map(b => b.id === bookingId ? { ...b, status: 'matched' } : b))
  }

  const updateStatus = async (id: string, status: Booking['status']) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(bs => bs.map(b => b.id === id ? { ...b, status } : b))
  }

  const logout = () => { localStorage.removeItem('admin_auth'); router.push('/admin/login') }

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
            <Link href="/admin/bookings" className="text-sm text-orange-500 font-medium">预约管理</Link>
            <Link href="/admin/teachers" className="text-sm text-gray-500 hover:text-gray-700">老师管理</Link>
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
        </div>
      </div>

      {activeTab === 'payments' && (
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          {pendingPayments.length === 0 ? (
            <div className="text-center text-gray-400 py-16">暂无待确认的收款</div>
          ) : pendingPayments.map(p => (
            <div key={p.id} className="bg-white rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-medium text-gray-900">{p.teachers?.name} 接单</span>
                  <span className="text-orange-500 text-xs ml-2 bg-orange-50 px-2 py-0.5 rounded-full">待确认收款</span>
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
                className="w-full bg-green-500 hover:bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium">
                确认已收款
              </button>
            </div>
          ))}
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
