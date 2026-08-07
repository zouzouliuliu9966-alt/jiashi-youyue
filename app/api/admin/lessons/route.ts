import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'
import { DONE_STATUSES } from '@/lib/lesson-status'

// GET /api/admin/lessons?status=pending|paid|completed|settled&teacher_id=&phone=
export async function GET(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const teacherId = searchParams.get('teacher_id')
  const phone = searchParams.get('phone')

  // 分页：订单多起来以后不能一次全拉。count: 'exact' 让 Supabase 顺带返回总数
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || 20)))
  const from = (page - 1) * pageSize

  let query = supabaseAdmin
    .from('lesson_orders')
    .select('*, teachers(id, name, tier), bookings(id, student_grade, address, available_time)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })

  if (status === 'pending') {
    query = query.eq('payment_status', 'pending')
  } else if (status === 'paid') {
    // 已付款但未完课
    query = query.eq('payment_status', 'paid').eq('lesson_status', 'pending')
  } else if (status === 'completed') {
    // 已完课但未结算
    query = query.in('lesson_status', DONE_STATUSES).eq('settled', false)
  } else if (status === 'settled') {
    query = query.eq('settled', true)
  }

  if (teacherId) query = query.eq('teacher_id', teacherId)
  if (phone) query = query.ilike('parent_phone', `%${phone}%`)

  const { data, error, count } = await query.range(from, from + pageSize - 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 老前端直接把响应当数组用，所以保持返回数组，分页信息放响应头
  return NextResponse.json(data || [], {
    headers: {
      'x-total-count': String(count ?? 0),
      'x-page': String(page),
      'x-page-size': String(pageSize),
    },
  })
}

// POST /api/admin/lessons — 后台手工创建
export async function POST(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

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
    // 平台不从课时费里抽点（招募页对老师的承诺），显式写 0 不依赖数据库列默认值。
    // 字段保留，将来要对特定单子收服务费，改这里或后台单独设。
    platform_rate: 0,
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
