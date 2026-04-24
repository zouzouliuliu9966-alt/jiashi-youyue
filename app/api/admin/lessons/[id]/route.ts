import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Action = 'confirm_payment' | 'mark_completed' | 'parent_confirm' | 'settle'

// PATCH /api/admin/lessons/[id]
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const body = await req.json()
  const action: Action | undefined = body.action
  const notes: string | undefined = body.notes

  const update: Record<string, unknown> = {}
  const now = new Date().toISOString()

  if (action === 'confirm_payment') {
    update.payment_status = 'paid'
    update.payment_confirmed_at = now
  } else if (action === 'mark_completed') {
    update.lesson_status = 'completed'
    update.teacher_marked_at = now
  } else if (action === 'parent_confirm') {
    update.parent_confirmed_at = now
  } else if (action === 'settle') {
    // 需要先读出单价和平台抽成率
    const { data: lesson, error: readErr } = await supabaseAdmin
      .from('lesson_orders')
      .select('price_per_lesson, platform_rate')
      .eq('id', id)
      .single()
    if (readErr || !lesson) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 })
    }
    const price = Number(lesson.price_per_lesson)
    const rate = Number(lesson.platform_rate ?? 0.08)
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
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('lesson_orders')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
