import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET /api/admin/lessons?status=pending|paid|completed|settled&teacher_id=&phone=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const teacherId = searchParams.get('teacher_id')
  const phone = searchParams.get('phone')

  let query = supabaseAdmin
    .from('lesson_orders')
    .select('*, teachers(id, name, tier), bookings(id, student_grade, address, available_time)')
    .order('created_at', { ascending: false })

  if (status === 'pending') {
    query = query.eq('payment_status', 'pending')
  } else if (status === 'paid') {
    // 已付款但未完课
    query = query.eq('payment_status', 'paid').eq('lesson_status', 'pending')
  } else if (status === 'completed') {
    // 已完课但未结算
    query = query.eq('lesson_status', 'completed').eq('settled', false)
  } else if (status === 'settled') {
    query = query.eq('settled', true)
  }

  if (teacherId) query = query.eq('teacher_id', teacherId)
  if (phone) query = query.ilike('parent_phone', `%${phone}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST /api/admin/lessons — 后台手工创建
export async function POST(req: Request) {
  const body = await req.json()
  const {
    booking_id,
    teacher_id,
    parent_phone,
    parent_wechat,
    parent_name,
    student_grade,
    subject,
    price_per_lesson,
    notes,
  } = body

  if (!teacher_id || !parent_phone || price_per_lesson === undefined || price_per_lesson === null || price_per_lesson === '') {
    return NextResponse.json({ error: '老师、家长手机、单价为必填项' }, { status: 400 })
  }

  // 从 teachers 表读出 name 填入 teacher_name
  const { data: teacher, error: tErr } = await supabaseAdmin
    .from('teachers')
    .select('name')
    .eq('id', teacher_id)
    .single()

  if (tErr || !teacher) {
    return NextResponse.json({ error: '老师不存在' }, { status: 400 })
  }

  const insertPayload: Record<string, unknown> = {
    teacher_id,
    teacher_name: teacher.name,
    parent_phone,
    parent_wechat: parent_wechat || null,
    parent_name: parent_name || null,
    student_grade: student_grade || null,
    subject: subject || null,
    price_per_lesson: Number(price_per_lesson),
    notes: notes || null,
  }
  if (booking_id) insertPayload.booking_id = booking_id

  const { data, error } = await supabaseAdmin
    .from('lesson_orders')
    .insert(insertPayload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, lesson: data })
}
