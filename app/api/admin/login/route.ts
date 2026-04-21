import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { password } = await req.json()
  const adminPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'jiashi2026'
  if (password === adminPassword) {
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: '密码错误' }, { status: 401 })
}
