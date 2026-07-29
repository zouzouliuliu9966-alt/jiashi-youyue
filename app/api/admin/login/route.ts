import { NextResponse } from 'next/server'
import { getAdminPassword, adminPasswordMatches } from '@/lib/admin-password'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: Request) {
  // 后台密码只有一个，被暴力破解就全丢了，卡得严一点
  const limited = rateLimit(req, 'admin-login', 5, 10 * 60 * 1000)
  if (limited) return limited

  const { password } = await req.json()
  if (!getAdminPassword()) {
    return NextResponse.json({ error: '后台未配置密码，请联系管理员' }, { status: 500 })
  }
  if (adminPasswordMatches(password)) {
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: '密码错误' }, { status: 401 })
}
