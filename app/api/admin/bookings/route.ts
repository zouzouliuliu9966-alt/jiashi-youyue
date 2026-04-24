import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

// GET /api/admin/bookings —— 一次性返回 bookings、可见老师、待付款 matches
export async function GET(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const [bookingsRes, teachersRes, pendingRes] = await Promise.all([
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
  ])

  if (bookingsRes.error) return NextResponse.json({ error: bookingsRes.error.message }, { status: 500 })
  if (teachersRes.error) return NextResponse.json({ error: teachersRes.error.message }, { status: 500 })
  if (pendingRes.error) return NextResponse.json({ error: pendingRes.error.message }, { status: 500 })

  return NextResponse.json({
    bookings: bookingsRes.data || [],
    teachers: teachersRes.data || [],
    pendingPayments: pendingRes.data || [],
  })
}
