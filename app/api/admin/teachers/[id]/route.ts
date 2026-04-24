import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

// PATCH /api/admin/teachers/[id] —— 更新 tier 或 is_visible
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { id } = await params
  if (!id) return NextResponse.json({ error: '缺少 id' }, { status: 400 })

  const body = await req.json()
  const update: Record<string, unknown> = {}

  if (body.tier !== undefined) {
    const tier = Number(body.tier)
    if (![1, 2, 3].includes(tier)) {
      return NextResponse.json({ error: '档位必须是 1/2/3' }, { status: 400 })
    }
    update.tier = tier
  }

  if (body.is_visible !== undefined) {
    update.is_visible = !!body.is_visible
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: '无操作' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('teachers')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
