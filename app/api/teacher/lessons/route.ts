import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/auth-helpers'

// 获取当前老师的所有课时订单
export async function GET(req: Request) {
  const teacherId = new URL(req.url).searchParams.get('teacherId')
  if (!teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const unauth = await requireTeacher(req, teacherId)
  if (unauth) return unauth

  // 老师看得到自己的结算金额和抽成，但 notes 是后台内部备注，不下发
  const { data, error } = await supabaseAdmin
    .from('lesson_orders')
    .select(
      'id, booking_id, teacher_id, teacher_name, parent_phone, parent_wechat, ' +
      'parent_name, student_grade, subject, price_per_lesson, platform_rate, ' +
      'payment_status, payment_confirmed_at, lesson_status, teacher_marked_at, ' +
      'parent_confirmed_at, settled, settled_at, settle_amount, platform_fee, created_at'
    )
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ lessons: data || [] })
}
