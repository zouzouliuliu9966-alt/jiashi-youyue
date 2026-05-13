import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireTeacher } from '@/lib/auth-helpers'

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: Request) {
  const { teacherId, oldPassword, newPassword } = await req.json()
  if (!teacherId || !oldPassword || !newPassword) {
    return NextResponse.json({ error: '请填写完整信息' }, { status: 400 })
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
  }
  if (oldPassword === newPassword) {
    return NextResponse.json({ error: '新密码不能与旧密码相同' }, { status: 400 })
  }

  const unauth = await requireTeacher(req, teacherId)
  if (unauth) return unauth

  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('email')
    .eq('id', teacherId)
    .single()
  if (!teacher?.email) {
    return NextResponse.json({ error: '未找到教师信息' }, { status: 404 })
  }

  const { error: signInErr } = await supabaseAnon.auth.signInWithPassword({
    email: teacher.email,
    password: oldPassword,
  })
  if (signInErr) {
    return NextResponse.json({ error: '旧密码不正确' }, { status: 401 })
  }

  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })
  const authUser = list.users.find(u => u.email === teacher.email)
  if (!authUser) return NextResponse.json({ error: '未找到登录账号' }, { status: 404 })

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  })
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
