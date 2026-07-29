import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { rateLimit } from '@/lib/rate-limit'

// 家长按手机号查自己的课时订单
export async function GET(req: Request) {
  // 家长端没有账号体系，只靠手机号识别，所以必须挡住批量枚举手机号的行为
  const limited = rateLimit(req, 'parent-lessons', 20, 10 * 60 * 1000)
  if (limited) return limited

  const phone = new URL(req.url).searchParams.get('phone')?.trim()
  if (!phone) {
    return NextResponse.json({ error: '请提供手机号' }, { status: 400 })
  }
  if (!/^\d{11}$/.test(phone)) {
    return NextResponse.json({ error: '手机号格式错误' }, { status: 400 })
  }

  // 只回家长该看到的字段。平台抽成、老师结算金额不能下发到家长浏览器；
  // notes 是后台内部备注（可能写着抽成、投诉处理等），同样不下发
  const { data, error } = await supabaseAdmin
    .from('lesson_orders')
    .select(
      'id, teacher_name, parent_phone, parent_name, student_grade, subject, ' +
      'price_per_lesson, payment_status, payment_confirmed_at, lesson_status, ' +
      'teacher_marked_at, parent_confirmed_at, settled, created_at'
    )
    .eq('parent_phone', phone)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ lessons: data || [] })
}
