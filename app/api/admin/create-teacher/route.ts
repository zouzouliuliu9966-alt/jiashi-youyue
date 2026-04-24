import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

export async function POST(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { email, name, password } = await req.json()
  if (!email || !name || !password) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 })
  }

  // 用 admin 权限创建 auth 用户
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 在 teachers 表里创建对应记录
  const { error: dbError } = await supabaseAdmin.from('teachers').insert({
    name,
    email,
    tier: 1,
    is_visible: false,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: authData.user?.id })
}
