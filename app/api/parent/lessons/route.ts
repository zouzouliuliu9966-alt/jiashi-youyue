import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 家长按手机号查自己的课时订单
export async function GET(req: Request) {
  const phone = new URL(req.url).searchParams.get('phone')
  if (!phone) {
    return NextResponse.json({ error: '请提供手机号' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('lesson_orders')
    .select('*')
    .eq('parent_phone', phone.trim())
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ lessons: data || [] })
}
