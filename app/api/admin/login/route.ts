import { NextResponse } from 'next/server'
import { getAdminPassword } from '@/lib/admin-password'

export async function POST(req: Request) {
  const { password } = await req.json()
  const adminPassword = getAdminPassword()
  if (!adminPassword) {
    return NextResponse.json({ error: '后台未配置密码，请联系管理员' }, { status: 500 })
  }
  if (password === adminPassword) {
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: '密码错误' }, { status: 401 })
}
