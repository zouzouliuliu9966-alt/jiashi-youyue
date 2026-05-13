import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

const TOKEN_TTL_HOURS = 24

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  const body = await req.json()
  const action: 'approve' | 'reject' = body.action

  const { data: request, error: reqErr } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id, teacher_id, status, reset_token, token_used_at, token_expires_at')
    .eq('id', id)
    .single()

  if (reqErr || !request) {
    return NextResponse.json({ error: '申请不存在' }, { status: 404 })
  }
  if (request.status !== 'pending') {
    return NextResponse.json({ error: '该申请已处理' }, { status: 400 })
  }

  if (action === 'reject') {
    const { error } = await supabaseAdmin
      .from('password_reset_requests')
      .update({ status: 'rejected', note: body.note || null, processed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action === 'approve') {
    // 如果已有未过期的 token，直接复用；否则生成新的
    const now = Date.now()
    const stillValid =
      request.reset_token &&
      !request.token_used_at &&
      request.token_expires_at &&
      new Date(request.token_expires_at).getTime() > now

    let token = request.reset_token
    let expiresAt = request.token_expires_at

    if (!stillValid) {
      token = crypto.randomUUID()
      expiresAt = new Date(now + TOKEN_TTL_HOURS * 3600_000).toISOString()
      const { error: updErr } = await supabaseAdmin
        .from('password_reset_requests')
        .update({ reset_token: token, token_expires_at: expiresAt, token_used_at: null })
        .eq('id', id)
      if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    const origin = new URL(req.url).origin
    const resetUrl = `${origin}/teacher/reset-password?token=${token}`

    return NextResponse.json({ success: true, resetUrl, expiresAt })
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 })
}
