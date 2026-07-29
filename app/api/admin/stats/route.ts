import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { DONE_STATUSES } from '@/lib/lesson-status'

// 后台数据看板：本月关键指标 + 需要处理的待办数
export async function GET(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const count = async (
    table: string,
    build: (q: ReturnType<typeof supabaseAdmin.from>) => unknown,
  ): Promise<number> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q: any = build(supabaseAdmin.from(table))
    const { count: c } = await q
    return c ?? 0
  }

  const [
    bookingsThisMonth,
    bookingsTotal,
    teachersVisible,
    teachersPending,
    matchesAwaitingPayment,
    lessonsAwaitingPayment,
    lessonsAwaitingSettle,
  ] = await Promise.all([
    count('bookings', q => q.select('id', { count: 'exact', head: true }).gte('created_at', monthStart)),
    count('bookings', q => q.select('id', { count: 'exact', head: true })),
    count('teachers', q => q.select('id', { count: 'exact', head: true }).eq('is_visible', true)),
    count('teachers', q => q.select('id', { count: 'exact', head: true }).eq('is_visible', false)),
    // 老师已接单但教务还没确认收款 —— 老师在干等着，最该优先处理
    count('matches', q => q.select('id', { count: 'exact', head: true })
      .eq('teacher_response', 'accepted').eq('payment_confirmed', false)),
    count('lesson_orders', q => q.select('id', { count: 'exact', head: true }).eq('payment_status', 'pending')),
    count('lesson_orders', q => q.select('id', { count: 'exact', head: true })
      .in('lesson_status', DONE_STATUSES).eq('settled', false)),
  ])

  // 流水要算金额，得把行读出来
  const { data: settledRows } = await supabaseAdmin
    .from('lesson_orders')
    .select('price_per_lesson, platform_fee, settled_at')
    .eq('settled', true)

  let revenueThisMonth = 0
  let platformFeeThisMonth = 0
  let platformFeeTotal = 0
  for (const r of settledRows || []) {
    const fee = Number(r.platform_fee || 0)
    platformFeeTotal += fee
    if (r.settled_at && r.settled_at >= monthStart) {
      revenueThisMonth += Number(r.price_per_lesson || 0)
      platformFeeThisMonth += fee
    }
  }

  return NextResponse.json({
    month: `${now.getFullYear()}年${now.getMonth() + 1}月`,
    bookingsThisMonth,
    bookingsTotal,
    teachersVisible,
    teachersPending,
    todo: {
      matchesAwaitingPayment,
      lessonsAwaitingPayment,
      lessonsAwaitingSettle,
    },
    revenueThisMonth: +revenueThisMonth.toFixed(2),
    platformFeeThisMonth: +platformFeeThisMonth.toFixed(2),
    platformFeeTotal: +platformFeeTotal.toFixed(2),
  })
}
