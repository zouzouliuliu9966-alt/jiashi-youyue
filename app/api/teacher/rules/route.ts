import { NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/auth-helpers'

// 老师须知的正文放在服务端，校验通过才返回。
// 之前这些文案直接写在客户端组件里，会被编译进公开的 JS bundle，
// 任何人不登录都能从 bundle 里读到「平台向老师收信息服务费」这些内容，
// 前端那层 localStorage 判断只是障眼法。
const TEACHER_FAQS = [
  {
    q: '怎么加入平台？',
    a: '点击"教师注册"提交资料，平台审核通过后即可展示接单。',
  },
  {
    q: '怎么接单？',
    a: '家长预约后，平台推送需求到您的教师端。您查看学生情况后选择接单或婉拒。',
  },
  {
    q: '课时费怎么结算？',
    a: '家长直接付给您本人，平台不代收、不代管、不代付课时费。具体结算节奏由您与家长沟通确认；平台内的课时记录仅用于双方对账。',
  },
  {
    q: '平台收取什么费用？',
    a: '平台向老师收取信息服务费（接单后解锁家长联系方式时支付一次），不向家长收取任何费用。具体标准在接单时会明确告知。',
  },
  {
    q: '有什么要求？',
    a: '接单后请在约定时间准时上课，每节课后及时与家长沟通反馈。平台会定期回访家长，保障双方权益。',
  },
]

export async function GET(req: Request) {
  const teacherId = new URL(req.url).searchParams.get('teacherId')
  if (!teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const unauth = await requireTeacher(req, teacherId)
  if (unauth) return unauth

  return NextResponse.json({ faqs: TEACHER_FAQS })
}
