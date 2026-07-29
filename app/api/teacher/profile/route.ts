import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/auth-helpers'

// 获取教师资料和匹配记录
export async function GET(req: Request) {
  const teacherId = new URL(req.url).searchParams.get('id')
  if (!teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const unauth = await requireTeacher(req, teacherId)
  if (unauth) return unauth

  const { data: teacher } = await supabaseAdmin.from('teachers').select('*').eq('id', teacherId).single()
  if (!teacher) {
    return NextResponse.json({ error: '教师不存在' }, { status: 404 })
  }

  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('*, bookings(*)')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  // 家长联系方式是平台的收费点：老师接单并付过信息费、后台确认收款之后才能拿到。
  // 只靠前端隐藏是没用的——老师打开开发者工具看这个接口的返回就全拿到了，
  // 所以必须在服务端抹掉。
  const safeMatches = (matches || []).map(m => {
    if (m.payment_confirmed) return m
    const b = m.bookings
    if (!b) return m
    return { ...m, bookings: { ...b, phone: null, wechat: null } }
  })

  return NextResponse.json({ teacher, matches: safeMatches })
}

// 老师能自己改的字段。tier（档位）、is_visible（是否展示）、email 必须由后台控制，
// 否则老师提交 {tier:3, is_visible:true} 就能自己升到精英档并上架
const TEACHER_EDITABLE_FIELDS = [
  'name', 'photo_url', 'bio', 'highlight', 'subjects', 'grades',
  'price', 'years_exp', 'teacher_type', 'teaching_mode',
  'service_areas', 'studio_address', 'available_time',
] as const

// 保存教师资料
export async function PUT(req: Request) {
  const { teacherId, form } = await req.json()
  if (!teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const unauth = await requireTeacher(req, teacherId)
  if (unauth) return unauth

  const payload: Record<string, unknown> = { last_updated_at: new Date().toISOString() }
  for (const key of TEACHER_EDITABLE_FIELDS) {
    if (form && key in form) payload[key] = form[key]
  }

  const { error } = await supabaseAdmin
    .from('teachers')
    .update(payload)
    .eq('id', teacherId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
