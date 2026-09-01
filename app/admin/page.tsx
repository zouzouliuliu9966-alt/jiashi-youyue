'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Stats = {
  month: string
  bookingsThisMonth: number
  bookingsTotal: number
  teachersVisible: number
  teachersPending: number
  todo: {
    matchesAwaitingPayment: number
    lessonsAwaitingPayment: number
    lessonsAwaitingSettle: number
  }
  revenueThisMonth: number
  platformFeeThisMonth: number
  platformFeeTotal: number
}

function Stat({ label, value, unit, hint }: { label: string; value: number | string; unit?: string; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">
        {value}
        {unit && <span className="text-sm font-normal text-gray-400 ml-0.5">{unit}</span>}
      </p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function AdminHome() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  const adminHeaders = useCallback((): HeadersInit => {
    const pw = typeof window !== 'undefined' ? localStorage.getItem('admin_auth') || '' : ''
    return { 'x-admin-password': pw }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('admin_auth')) {
      router.push('/admin/login')
      return
    }
    fetch('/api/admin/stats', { headers: adminHeaders() })
      .then(async res => {
        if (res.status === 401) {
          localStorage.removeItem('admin_auth')
          router.push('/admin/login')
          return null
        }
        return res.json()
      })
      .then(json => { if (json && !json.error) setStats(json) })
      .finally(() => setLoading(false))
  }, [router, adminHeaders])

  const logout = () => {
    localStorage.removeItem('admin_auth')
    router.push('/admin/login')
  }

  const todoTotal = stats
    ? stats.todo.matchesAwaitingPayment + stats.todo.lessonsAwaitingPayment + stats.todo.lessonsAwaitingSettle
    : 0

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 overflow-x-auto">
            <h1 className="font-bold text-gray-900 shrink-0">管理后台</h1>
            <Link href="/admin" className="text-sm text-orange-500 font-medium shrink-0">看板</Link>
            <Link href="/admin/bookings" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">预约</Link>
            <Link href="/admin/teachers" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">老师</Link>
            <Link href="/admin/lessons" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">课时</Link>
            <Link href="/admin/password-resets" className="text-sm text-gray-500 hover:text-gray-700 shrink-0">密码</Link>
          </div>
          <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-600 shrink-0 ml-2">退出</button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-400 py-16">加载中...</div>
        ) : !stats ? (
          <div className="text-center text-gray-400 py-16">数据加载失败</div>
        ) : (
          <>
            {/* 待办 —— 放最上面，这些是要你动手的 */}
            <div className={`rounded-2xl p-4 ${todoTotal > 0 ? 'bg-orange-50 border border-orange-200' : 'bg-white'}`}>
              <p className={`text-sm font-medium mb-3 ${todoTotal > 0 ? 'text-orange-800' : 'text-gray-900'}`}>
                {todoTotal > 0 ? `待处理 ${todoTotal} 项` : '暂无待处理事项'}
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Link href="/admin/bookings" className="bg-white rounded-xl p-3 hover:shadow-sm transition-shadow">
                  <p className="text-xs text-gray-400 mb-1">待确认老师已付信息费</p>
                  <p className={`text-xl font-bold ${stats.todo.matchesAwaitingPayment > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                    {stats.todo.matchesAwaitingPayment}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">老师在等联系方式</p>
                </Link>
                <Link href="/admin/lessons" className="bg-white rounded-xl p-3 hover:shadow-sm transition-shadow">
                  <p className="text-xs text-gray-400 mb-1">课时待付款</p>
                  <p className={`text-xl font-bold ${stats.todo.lessonsAwaitingPayment > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                    {stats.todo.lessonsAwaitingPayment}
                  </p>
                </Link>
                <Link href="/admin/lessons" className="bg-white rounded-xl p-3 hover:shadow-sm transition-shadow">
                  <p className="text-xs text-gray-400 mb-1">待对账</p>
                  <p className={`text-xl font-bold ${stats.todo.lessonsAwaitingSettle > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                    {stats.todo.lessonsAwaitingSettle}
                  </p>
                </Link>
              </div>
            </div>

            <h2 className="font-medium text-gray-900 pt-2">{stats.month}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Stat label="本月新增预约" value={stats.bookingsThisMonth} unit="条" hint={`累计 ${stats.bookingsTotal} 条`} />
              <Stat label="本月课时费（老师直收）" value={stats.revenueThisMonth} unit="元" />
              <Stat label="本月平台抽成（应为 0）" value={stats.platformFeeThisMonth} unit="元" hint={`累计 ${stats.platformFeeTotal} 元`} />
              <Stat label="展示中老师" value={stats.teachersVisible} unit="位" hint={`另有 ${stats.teachersPending} 位未展示`} />
            </div>

            <p className="text-xs text-gray-400 pt-2">
              金额按「已对账」的课时记录统计；课时费不经过平台，这里只是台账。平台已承诺不从课时费抽点，所以抽成正常应为 0；
              真正的收入是接单信息费，目前系统没记录金额，不在这里统计。
            </p>
          </>
        )}
      </div>
    </main>
  )
}
