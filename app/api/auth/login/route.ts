import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const limited = rateLimit(req, 'teacher-login', 10, 10 * 60 * 1000)
  if (limited) return limited

  const { email, password } = await req.json()
  if (!email || !password) {
    return NextResponse.json({ error: '请填写账号和密码' }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ error: '账号或密码错误', detail: error.message }, { status: 401 })
  }

  // 获取教师信息。走白名单而不是 select('*') —— 这里返回的整个对象会进浏览器，
  // 用 * 的话以后往 teachers 表加任何后台内部字段（审核意见、风控标记之类）
  // 都会自动泄露给老师。目前登录页和注册后自动登录只用到 id 和 name，
  // 其余字段留给教师端资料页自己去 /api/teacher/profile 取。
  const { data: teacher } = await supabaseAdmin
    .from('teachers')
    .select('id, name')
    .eq('email', email)
    .single()
  if (!teacher) {
    return NextResponse.json({ error: '未找到教师信息' }, { status: 404 })
  }

  return NextResponse.json({
    token: data.session?.access_token,
    teacher,
  })
}
