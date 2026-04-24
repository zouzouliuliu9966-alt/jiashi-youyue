import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 老师标记某节课已完成
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { teacherId } = await req.json().catch(() => ({}))

  if (!id || !teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  // 校验该订单 teacher_id 必须是当前老师
  const { data: lesson, error: fetchError } = await supabaseAdmin
    .from('lesson_orders')
    .select('id, teacher_id, lesson_status')
    .eq('id', id)
    .single()

  if (fetchError || !lesson) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 })
  }

  if (lesson.teacher_id !== teacherId) {
    return NextResponse.json({ error: '无权操作此订单' }, { status: 403 })
  }

  const { error } = await supabaseAdmin
    .from('lesson_orders')
    .update({
      lesson_status: 'completed',
      teacher_marked_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
