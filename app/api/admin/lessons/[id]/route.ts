import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

type Action = 'confirm_payment' | 'mark_completed' | 'parent_confirm' | 'settle'

// PATCH /api/admin/lessons/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const body = await req.json()
  const action: Action | undefined = body.action
  const notes: string | undefined = body.notes

  // 读出当前订单，用于后续状态校验和结算金额计算
  const { data: current, error: readErr } = await supabaseAdmin
    .from('lesson_orders')
    .select('lesson_status, payment_status, teacher_marked_at, settled, price_per_lesson, platform_rate')
    .eq('id', id)
    .single()

  if (readErr || !current) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  const now = new Date().toISOString()

  if (action === 'confirm_payment') {
    if (current.payment_status === 'paid') {
      return NextResponse.json({ error: '已确认收款，无需重复操作' }, { status: 400 })
    }
    update.payment_status = 'paid'
    update.payment_confirmed_at = now
  } else if (action === 'mark_completed') {
    if (current.payment_status !== 'paid') {
      return NextResponse.json({ error: '未付款的订单不能标记完课' }, { status: 400 })
    }
    if (current.lesson_status === 'completed') {
      return NextResponse.json({ error: '已完课，无需重复标记' }, { status: 400 })
    }
    update.lesson_status = 'completed'
    update.teacher_marked_at = now
  } else if (action === 'parent_confirm') {
    if (!current.teacher_marked_at) {
      return NextResponse.json({ error: '老师尚未标记完课' }, { status: 400 })
    }
    update.parent_confirmed_at = now
  } else if (action === 'settle') {
    if (current.lesson_status !== 'completed') {
      return NextResponse.json({ error: '未完课的订单不能结算' }, { status: 400 })
    }
    if (current.settled) {
      return NextResponse.json({ error: '已结算，不能重复结算' }, { status: 400 })
    }
    const price = Number(current.price_per_lesson)
    const rate = Number(current.platform_rate ?? 0.08)
    const platformFee = +(price * rate).toFixed(2)
    const settleAmount = +(price - platformFee).toFixed(2)
    update.settled = true
    update.settled_at = now
    update.platform_fee = platformFee
    update.settle_amount = settleAmount
  }

  if (notes !== undefined) update.notes = notes

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '无操作' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('lesson_orders')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, lesson: data })
}

// DELETE /api/admin/lessons/[id]
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('lesson_orders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
