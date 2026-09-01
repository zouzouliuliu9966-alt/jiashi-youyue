import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { rateLimit } from '@/lib/rate-limit'
import { notifyWecomText, bookingMessage } from '@/lib/notify'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  // 防止有人灌垃圾预约把教务淹了
  const limited = rateLimit(req, 'booking', 5, 60 * 60 * 1000)
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
  const { teacher_id, student_grade, course_type, phone, wechat, student_intro, available_time, address, agreed } = body

  // 只做即时校验，不落库（运营者已决定不保存同意记录）。
  // 说清楚它能干什么：它保证请求必须显式携带这个布尔值，挡住漏传和误调用，
  // 让「不勾选就不能提交」在服务端也成立。
  // 它挡不住什么：故意构造请求的人照样能传 true —— 这道校验不构成同意的证明。
  if (agreed !== true) {
    return NextResponse.json({ error: '请先阅读并勾选协议同意' }, { status: 400 })
  }
  if (!teacher_id || !student_grade || !phone || !wechat || !student_intro || !available_time || !address) {
    return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 })
  }

  // 服务端限长。前端 maxlength 挡不住 curl，而超长的内容会在推企微时被静默截断，
  // 教务丢掉地址那一截却毫不知情。按字节算，中文一个字 3 字节。
  const tooLong = ([
    ['student_intro', student_intro, 900],
    ['address', address, 300],
    ['available_time', available_time, 300],
    ['wechat', wechat, 120],
    ['phone', phone, 40],
    ['student_grade', student_grade, 60],
  ] as [string, string, number][]).find(([, v, max]) => Buffer.byteLength(String(v), 'utf8') > max)
  if (tooLong) {
    return NextResponse.json({ error: '填写内容太长了，请精简一下' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('bookings').insert({
    teacher_id, student_grade, course_type: course_type || '一对一', phone, wechat, student_intro, available_time, address,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 推一条到教务的企业微信，省得人工刷后台。
  // 推送失败不影响家长这边 —— notifyWecomText 内部吞异常，这里也 await 掉，
  // 否则 serverless 函数返回后请求可能被掐断
  const { data: teacher } = await supabaseAdmin
    .from('teachers').select('name').eq('id', teacher_id).single()
  await notifyWecomText(bookingMessage({
    student_grade, course_type, phone, wechat, student_intro, available_time, address,
    teacher_name: teacher?.name,
  }))

  return NextResponse.json({ success: true })
}
