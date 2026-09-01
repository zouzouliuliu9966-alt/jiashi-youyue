import { NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { notifyWecomText, reportMessage } from '@/lib/notify'
import { REPORT_TYPES } from '@/lib/report-types'

// 举报只推企业微信，不入库：举报正文常含第三方甚至未成年人信息，
// 存进境外数据库会扩大出境范围，而教务本来就在企微里处理。
//
// 代价是推送失败这条举报就没有任何副本了，所以**必须把投递结果如实告诉用户**，
// 让他知道要另外加教务微信补一刀。不能假装成功。
export async function POST(req: Request) {
  const limited = rateLimit(req, 'report', 5, 60 * 60 * 1000)
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

  const { type, detail, contact } = body

  // type 必须来自白名单。放开自由文本的话，换行 + 伪造字段就能在教务群里
  // 假冒出一条「新预约」通知，教务对自己群里的消息是天然信任的。
  if (typeof type !== 'string' || !REPORT_TYPES.includes(type as typeof REPORT_TYPES[number])) {
    return NextResponse.json({ error: '请选择问题类型' }, { status: 400 })
  }
  if (typeof detail !== 'string' || !detail.trim()) {
    return NextResponse.json({ error: '请填写具体情况' }, { status: 400 })
  }
  if (contact != null && typeof contact !== 'string') {
    return NextResponse.json({ error: '联系方式格式不正确' }, { status: 400 })
  }

  const d = detail.trim()
  const c = (contact ?? '').trim()
  // 按字节算，不按字数：企微 text 消息上限 2048 字节，中文 3 字节一个。
  // 按字数放行 2000 的话，中文写满必然超限、推送必然失败、而用户看到的是「已收到」。
  if (Buffer.byteLength(d, 'utf8') > 1500) {
    return NextResponse.json({ error: '内容太长了，请精简到 500 字以内，或直接加教务微信详谈' }, { status: 400 })
  }
  if (c.length > 60) {
    return NextResponse.json({ error: '联系方式过长' }, { status: 400 })
  }

  const delivered = await notifyWecomText(reportMessage({ type, detail: d, contact: c }))

  return NextResponse.json({ success: true, delivered })
}
