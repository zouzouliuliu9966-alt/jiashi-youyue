import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
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

  return NextResponse.json({ success: true })
}
