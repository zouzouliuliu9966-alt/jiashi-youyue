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

  return NextResponse.json({ teacher, matches: matches || [] })
}

// 保存教师资料
export async function PUT(req: Request) {
  const { teacherId, form } = await req.json()
  if (!teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const unauth = await requireTeacher(req, teacherId)
  if (unauth) return unauth

  const { error } = await supabaseAdmin
    .from('teachers')
    .update({ ...form, last_updated_at: new Date().toISOString() })
    .eq('id', teacherId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
