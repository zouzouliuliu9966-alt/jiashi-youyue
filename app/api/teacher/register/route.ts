import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { name, email, phone, password } = await req.json()
  if (!name || !email || !password) {
    return NextResponse.json({ error: '参数不完整' }, { status: 400 })
  }

  // 创建 auth 用户
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // 创建 teachers 表记录
  const { error: dbError } = await supabaseAdmin.from('teachers').insert({
    name,
    email,
    phone: phone || null,
    tier: 1,
    is_visible: false,
  })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: authData.user?.id })
}
