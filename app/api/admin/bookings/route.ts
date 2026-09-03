import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

// GET /api/admin/bookings —— 一次性返回 bookings、可见老师、待付款 matches
export async function GET(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const [bookingsRes, teachersRes, pendingRes, clearingRes] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('*, teachers(*)')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('teachers')
      .select('*')
      .eq('is_visible', true)
      .order('tier', { ascending: false }),
    supabaseAdmin
      .from('matches')
      .select('*, bookings(*), teachers(*)')
      .eq('teacher_response', 'accepted')
      .eq('payment_confirmed', false)
      .order('created_at', { ascending: false }),
    // 已收到信息费、还没核销的。老师那边看到的是「待核销」，
    // 教务在这里决定：这一单确实开课了就核销，没成单就退给老师。
    supabaseAdmin
      .from('matches')
      .select('*, bookings(*), teachers(*)')
      .eq('payment_confirmed', true)
      // 也要捞 fee_status 为 null 的：老师端把 null 当「待核销」显示，
      // 这里只认字符串 'pending' 的话，那些行老师看得到、教务却找不到。
      .or('fee_status.eq.pending,fee_status.is.null')
      .order('created_at', { ascending: false }),
  ])

  if (bookingsRes.error) return NextResponse.json({ error: bookingsRes.error.message }, { status: 500 })
  if (teachersRes.error) return NextResponse.json({ error: teachersRes.error.message }, { status: 500 })
  if (pendingRes.error) return NextResponse.json({ error: pendingRes.error.message }, { status: 500 })
  // 核销这块是后加的，字段还没建时不该让整个后台打不开。
  // 但只对「列不存在」降级 —— 权限、连接、超时这些真故障必须报出来，
  // 否则台账坏了却在界面上写着「功能未启用」，会被当成正常状态忽略掉。
  const e = clearingRes.error
  const clearingMissing = !!e
    && (e.code === 'PGRST204' || e.code === '42703')
    && /fee_status/.test(`${e.message} ${e.details ?? ''}`)
  if (e && !clearingMissing) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
  if (clearingMissing) {
    console.error('[admin/bookings] fee_status 列还没建，待核销功能未启用')
  }

  return NextResponse.json({
    bookings: bookingsRes.data || [],
    teachers: teachersRes.data || [],
    pendingPayments: pendingRes.data || [],
    pendingClearing: clearingRes.data || [],
    clearingUnavailable: clearingMissing,
  })
}
