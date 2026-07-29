// 往企业微信群机器人推消息。
// webhook 地址存在环境变量 WECOM_WEBHOOK_URL 里，绝不能写进代码 ——
// 本仓库是公开的，谁拿到那条地址就能往群里发东西。
//
// 群机器人地址怎么拿：企业微信里建个群 → 群设置 → 群机器人 → 添加 → 复制 Webhook 地址

const WEBHOOK = process.env.WECOM_WEBHOOK_URL

/**
 * 发一条 markdown 消息。通知失败绝不能影响主流程（家长照样要能提交成功），
 * 所以这里吞掉所有异常，只在服务端日志里留一行。
 */
export async function notifyWecom(markdown: string): Promise<void> {
  if (!WEBHOOK) return

  try {
    const res = await fetch(WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ msgtype: 'markdown', markdown: { content: markdown } }),
      signal: AbortSignal.timeout(8000),
    })
    const json = await res.json().catch(() => ({}))
    if (json.errcode !== 0) {
      console.error('[notify] 企业微信推送失败:', JSON.stringify(json))
    }
  } catch (e) {
    console.error('[notify] 企业微信推送异常:', e instanceof Error ? e.message : e)
  }
}

// 完整显示手机号：这是教务自己的通知群，看到就能直接打电话，
// 不用再去后台查一遍。
//
// 注意别用 * 打码 —— 企业微信按 Markdown 解析，"139****0000" 里的
// 星号会被当成加粗标记吃掉，还会让后面所有 **加粗** 全部错位。
function fmtPhone(p?: string | null): string {
  return p || '—'
}

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
    '## 🔔 新预约',
    `**学生**：${b.student_grade || '—'}${b.course_type ? ` · ${b.course_type}` : ''}`,
    `**家长**：${fmtPhone(b.phone)}${b.wechat ? ` · 微信 ${b.wechat}` : ''}`,
  ]
  if (b.teacher_name) lines.push(`**意向老师**：${b.teacher_name}`)
  if (b.available_time) lines.push(`**可上课时间**：${b.available_time}`)
  if (b.address) lines.push(`**地址**：${b.address}`)
  if (b.student_intro) lines.push(`**学生情况**：${b.student_intro}`)
  lines.push('', '> 去后台处理：jiashiyouyue.com/admin/bookings')
  return lines.join('\n')
}

export function teacherPaidMessage(m: {
  teacher_name?: string | null
  amount?: string | null
  student_grade?: string | null
}): string {
  return [
    '## 💰 老师已付信息费，待确认收款',
    `**老师**：${m.teacher_name || '—'}`,
    `**金额**：${m.amount || '—'}`,
    m.student_grade ? `**学生**：${m.student_grade}` : '',
    '',
    '> 确认后老师才能看到家长联系方式，请尽快处理',
    '> jiashiyouyue.com/admin/bookings',
  ].filter(Boolean).join('\n')
}

export function newTeacherMessage(t: { name?: string | null; phone?: string | null }): string {
  return [
    '## 👩‍🏫 新老师注册，待审核',
    `**称呼**：${t.name || '—'}`,
    `**手机**：${fmtPhone(t.phone)}`,
    '',
    '> 审核后记得设置档位并开启展示',
    '> jiashiyouyue.com/admin/teachers',
  ].join('\n')
}
