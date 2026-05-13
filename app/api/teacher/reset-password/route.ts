import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET: 用 token 校验链接是否有效（页面加载时调用）
export async function GET(req: Request) {
  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: '链接无效' }, { status: 400 })

  const { data: request } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id, status, token_used_at, token_expires_at, teachers(name)')
    .eq('reset_token', token)
    .maybeSingle()

  if (!request) return NextResponse.json({ error: '链接无效' }, { status: 404 })
  if (request.token_used_at) return NextResponse.json({ error: '该链接已使用过' }, { status: 400 })
  if (request.status !== 'pending') return NextResponse.json({ error: '该申请已处理' }, { status: 400 })
  if (!request.token_expires_at || new Date(request.token_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: '链接已过期' }, { status: 400 })
  }

  const teacherName = (request.teachers as unknown as { name: string } | null)?.name || ''
  return NextResponse.json({ ok: true, teacherName })
}

// POST: 提交新密码
export async function POST(req: Request) {
  const { token, newPassword } = await req.json()
  if (!token) return NextResponse.json({ error: '链接无效' }, { status: 400 })
  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: '新密码至少6位' }, { status: 400 })
  }

  const { data: request } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id, status, token_used_at, token_expires_at, teachers(email)')
    .eq('reset_token', token)
    .maybeSingle()

  if (!request) return NextResponse.json({ error: '链接无效' }, { status: 404 })
  if (request.token_used_at) return NextResponse.json({ error: '该链接已使用过' }, { status: 400 })
  if (request.status !== 'pending') return NextResponse.json({ error: '该申请已处理' }, { status: 400 })
  if (!request.token_expires_at || new Date(request.token_expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: '链接已过期' }, { status: 400 })
  }

  const teacherEmail = (request.teachers as unknown as { email: string } | null)?.email
  if (!teacherEmail) return NextResponse.json({ error: '未找到教师信息' }, { status: 404 })

  const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })
  const authUser = list.users.find(u => u.email === teacherEmail)
  if (!authUser) return NextResponse.json({ error: '未找到登录账号' }, { status: 404 })

  const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
    password: newPassword,
  })
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const nowIso = new Date().toISOString()
  await supabaseAdmin
    .from('password_reset_requests')
    .update({ status: 'done', token_used_at: nowIso, processed_at: nowIso })
    .eq('id', request.id)

  return NextResponse.json({ success: true })
}
