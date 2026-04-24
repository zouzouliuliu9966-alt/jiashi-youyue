import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 获取当前老师的所有课时订单
export async function GET(req: Request) {
  const teacherId = new URL(req.url).searchParams.get('teacherId')
  if (!teacherId) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('lesson_orders')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ lessons: data || [] })
}
