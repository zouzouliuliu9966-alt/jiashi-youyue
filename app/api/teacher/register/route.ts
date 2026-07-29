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
  if (phone && !/^\d{11}$/.test(phone)) {
    return NextResponse.json({ error: '手机号格式不对' }, { status: 400 })
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

  // 创建 teachers 表记录。phone 一定要存下来 —— 后台要靠它联系老师做审核，
  // 之前这里漏掉了 phone，老师注册时填的手机号直接丢了。
  const { error: dbError } = await supabaseAdmin.from('teachers').insert({
    name,
    email,
    phone: phone || null,
    tier: 1,
    is_visible: false,
  })

  if (dbError) {
    // teachers 记录没建成，auth 用户要回滚掉，否则会留下一个孤儿账号：
    // 老师重新注册会被告知"已注册"，但登录又找不到教师信息，卡死在中间态
    if (authData.user?.id) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id).catch(() => {})
    }
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, userId: authData.user?.id })
}
