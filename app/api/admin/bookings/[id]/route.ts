import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

const VALID_STATUS = ['pending', 'sent', 'matched', 'closed'] as const

// PATCH /api/admin/bookings/[id] —— 修改 booking 状态
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const { status } = await req.json()
  if (!VALID_STATUS.includes(status)) {
    return NextResponse.json({ error: '无效状态' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('bookings')
    .update({ status })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
