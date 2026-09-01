import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { notifyWecomText, newTeacherMessage } from '@/lib/notify'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const limited = rateLimit(req, 'teacher-register', 5, 60 * 60 * 1000)
  if (limited) return limited

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: '请求格式不正确' }, { status: 400 })
  }
  // req.json() 对合法的 JSON `null` 不抛错，但紧接着解构 null 会 TypeError → 未处理的 500。
  // 必须先确认是个普通对象再解构。
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: '请求格式不正确' }, { status: 400 })
  }
  const { name, email, phone, password, agreed } = body
  // 只做即时校验，不落库（运营者已决定不保存同意记录）。
  // 说清楚它能干什么：它保证请求必须显式携带这个布尔值，挡住漏传和误调用，
  // 让「不勾选就不能提交」在服务端也成立。
  // 它挡不住什么：故意构造请求的人照样能传 true —— 这道校验不构成同意的证明。
  if (agreed !== true) {
    return NextResponse.json({ error: '请先阅读并勾选协议同意' }, { status: 400 })
  }
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
      // supabase-js v2 的 admin API 返回 {data,error} 而不是 throw，
      // 光挂 .catch() 接不住失败 —— 回滚没成功就会留下孤儿账号：
      // 老师再注册被告知「已注册」，登录又查不到教师信息，彻底卡死。
      const { error: rollbackError } = await supabaseAdmin.auth.admin
        .deleteUser(authData.user.id)
      if (rollbackError) {
        console.error('[register] 回滚 auth 用户失败，可能留下孤儿账号:',
          authData.user.id, rollbackError.message)
        // 只写日志在 serverless 上等于没写。孤儿账号会让这位老师
        // 「注册说已存在、登录说查无此人」彻底卡死，必须当天能看到。
        await notifyWecomText([
          '🚨 教师注册回滚失败，可能产生孤儿账号',
          `auth user id：${authData.user.id}`,
          `手机号：${phone || '—'}`,
          `原因：${rollbackError.message}`,
          '',
          '请去 Supabase Auth 手动删除该用户，否则这位老师无法注册也无法登录',
        ].join('\n'))
      }
    }
    return NextResponse.json({ error: dbError.message }, { status: 400 })
  }

  await notifyWecomText(newTeacherMessage({ name, phone }))

  return NextResponse.json({ success: true, userId: authData.user?.id })
}
