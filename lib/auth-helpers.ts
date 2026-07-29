import { NextResponse } from 'next/server'
import { supabaseAdmin } from './supabase-admin'
import { getAdminPassword, adminPasswordMatches } from './admin-password'

export function requireAdmin(req: Request): NextResponse | null {
  if (!getAdminPassword()) {
    return NextResponse.json({ error: '后台未配置密码' }, { status: 500 })
  }
  if (!adminPasswordMatches(req.headers.get('x-admin-password'))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }
  return null
}

export async function requireTeacher(
  req: Request,
  teacherId: string,
): Promise<NextResponse | null> {
  const auth = req.headers.get('authorization')
  const token = auth?.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
  if (userErr || !userData.user?.email) {
    return NextResponse.json({ error: '登录已失效，请重新登录' }, { status: 401 })
  }
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id')
    .eq('email', userData.user.email)
    .single()
  if (!teacher || teacher.id !== teacherId) {
    return NextResponse.json({ error: '无权操作' }, { status: 403 })
  }
  return null
}
