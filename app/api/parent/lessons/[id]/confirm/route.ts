import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 家长确认这节课确实上过
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const phone = new URL(req.url).searchParams.get('phone')

  if (!id || !phone) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  // 校验该订单 parent_phone 必须匹配 phone 参数
  const { data: lesson, error: fetchError } = await supabaseAdmin
    .from('lesson_orders')
    .select('id, parent_phone, parent_confirmed_at')
    .eq('id', id)
    .single()

  if (fetchError || !lesson) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  if (lesson.parent_phone !== phone.trim()) {
    return NextResponse.json({ error: '无权操作此订单' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('lesson_orders')
    .update({
      parent_confirmed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
