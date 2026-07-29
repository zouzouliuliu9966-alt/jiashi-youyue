import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { notifyWecom, bookingMessage } from '@/lib/notify'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  // 防止有人灌垃圾预约把教务淹了
  const limited = rateLimit(req, 'booking', 5, 60 * 60 * 1000)
  if (limited) return limited

  const body = await req.json()
  const { teacher_id, student_grade, course_type, phone, wechat, student_intro, available_time, address } = body

  if (!teacher_id || !student_grade || !phone || !wechat || !student_intro || !available_time || !address) {
    return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('bookings').insert({
    teacher_id, student_grade, course_type: course_type || '一对一', phone, wechat, student_intro, available_time, address,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 推一条到教务的企业微信，省得人工刷后台。
  // 推送失败不影响家长这边 —— notifyWecom 内部吞异常，这里也 await 掉，
  // 否则 serverless 函数返回后请求可能被掐断
  const { data: teacher } = await supabaseAdmin
    .from('teachers').select('name').eq('id', teacher_id).single()
  await notifyWecom(bookingMessage({
    student_grade, course_type, phone, wechat, student_intro, available_time, address,
    teacher_name: teacher?.name,
  }))

  return NextResponse.json({ success: true })
}
