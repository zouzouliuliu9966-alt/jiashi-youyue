// 往企业微信群机器人推消息。
// webhook 地址存在环境变量 WECOM_WEBHOOK_URL 里，绝不能写进代码 ——
// 本仓库是公开的，谁拿到那条地址就能往群里发东西。
//
// 群机器人地址怎么拿：企业微信里建个群 → 群设置 → 群机器人 → 添加 → 复制 Webhook 地址

const WEBHOOK = process.env.WECOM_WEBHOOK_URL

// 原来这里有个 notifyWecom() 发 markdown 消息，已删。
// 所有消息都含用户自由输入，一律走下面的 notifyWecomText 纯文本，
// 留着 markdown 版本迟早有人改回去。要找回去 git 历史里有。

// 完整显示手机号：这是教务自己的通知群，看到就能直接打电话，
// 不用再去后台查一遍。别用 * 打码。
function fmtPhone(p?: string | null): string {
  return p || '—'
}

// 🔴 下面三条消息都含用户自由输入（学生情况、地址、微信号、老师称呼），
// 一律走 notifyWecomText 的纯文本，不要再改回 markdown。
// 注入面是「自由文本进 markdown 解析器」，不是「举报」这一个入口 ——
// 家长在「学生情况」里写 [点这里](http://坏站) 一样能在教务群伪造可点链接。
// 代价只是没了加粗，用「学生：」这种纯文本标签代替，可读性几乎不受影响。
export function bookingMessage(b: {
  student_grade?: string | null
  subject?: string | null
  course_type?: string | null
  phone?: string | null
  wechat?: string | null
  student_intro?: string | null
  available_time?: string | null
  address?: string | null
  teacher_name?: string | null
}): string {
  const lines = [
    '🔔 新预约',
    `学生：${b.student_grade || '—'}${b.course_type ? ` · ${b.course_type}` : ''}`,
    `家长：${fmtPhone(b.phone)}${b.wechat ? ` · 微信 ${b.wechat}` : ''}`,
  ]
  if (b.teacher_name) lines.push(`意向老师：${b.teacher_name}`)
  if (b.available_time) lines.push(`可上课时间：${b.available_time}`)
  if (b.address) lines.push(`地址：${b.address}`)
  if (b.student_intro) lines.push(`学生情况：${b.student_intro}`)
  lines.push('', '去后台处理：jiashiyouyue.com/admin/bookings')
  return lines.join('\n')
}

export function teacherPaidMessage(m: {
  teacher_name?: string | null
  amount?: string | null
  student_grade?: string | null
}): string {
  return [
    '💰 老师已付信息费，待确认',
    `老师：${m.teacher_name || '—'}`,
    `金额：${m.amount || '—'}`,
    m.student_grade ? `学生：${m.student_grade}` : '',
    '',
    '确认后老师才能看到家长联系方式，请尽快处理',
    'jiashiyouyue.com/admin/bookings',
  ].filter(Boolean).join('\n')
}

// 举报正文是用户自由输入，绝不能进 markdown 解析器：
// 转义永远补不全（`[文字](链接)` 就能在教务群里伪造出一条可点的假通知），
// 而且往手机号、微信号里插转义字符会让教务复制出来搜不到人。
// text 类型的企微消息完全不解析 markdown，从根上绕开这个问题。
const WECOM_TEXT_LIMIT = 2048 // 企微 text 消息上限 2048 字节
const TRUNC_SUFFIX = '\n…（内容过长已截断）'

export async function notifyWecomText(content: string): Promise<boolean> {
  if (!WEBHOOK) return false
  try {
    const buf = Buffer.from(content, 'utf8')
    const body = buf.length > WECOM_TEXT_LIMIT
      // 预算必须按后缀真实字节算：写死 30 而后缀是 31 字节，
      // 会让「内容过长已截断」这条消息自己因为超长被企微拒收。
      // 末尾截断的多字节序列可能产生多个 U+FFFD，用 + 全剥掉。
      ? buf.subarray(0, WECOM_TEXT_LIMIT - Buffer.byteLength(TRUNC_SUFFIX, 'utf8'))
          .toString('utf8').replace(/�+$/, '') + TRUNC_SUFFIX
      : content
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'text', text: { content: body } }),
      signal: AbortSignal.timeout(5000),
    })
    const json = await res.json().catch(() => ({}))
    if (json.errcode !== 0) {
      console.error('[notify] 企业微信推送失败:', JSON.stringify(json))
      return false
    }
    return true
  } catch (e) {
    console.error('[notify] 企业微信推送异常:', e instanceof Error ? e.message : e)
    return false
  }
}

export function reportMessage(r: {
  type: string
  detail: string
  contact?: string | null
}): string {
  return [
    '⚠️ 收到投诉举报',
    `类型：${r.type}`,
    `联系方式：${r.contact || '未留（匿名）'}`,
    '',
    '具体情况：',
    r.detail,
    '',
    '（留了联系方式的记得回复）',
  ].join('\n')
}

export function newTeacherMessage(t: { name?: string | null; phone?: string | null }): string {
  return [
    '👩‍🏫 新老师注册，待审核',
    `称呼：${t.name || '—'}`,
    `手机：${fmtPhone(t.phone)}`,
    '',
    '审核后记得设置档位并开启展示',
    'jiashiyouyue.com/admin/teachers',
  ].join('\n')
}
