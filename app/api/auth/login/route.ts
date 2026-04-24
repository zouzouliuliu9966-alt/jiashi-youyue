import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: '请填写账号和密码' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ error: '账号或密码错误', detail: error.message }, { status: 401 })
  }

  // 获取教师信息
  const { data: teacher } = await supabaseAdmin.from('teachers').select('*').eq('email', email).single()
  if (!teacher) {
    return NextResponse.json({ error: '未找到教师信息' }, { status: 404 })
  }

  return NextResponse.json({
    token: data.session?.access_token,
    teacher,
  })
}
