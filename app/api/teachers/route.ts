import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 这是家长端公开接口，任何人不登录就能调。只回展示需要的字段，
// 不能 select('*')——那会连老师登录邮箱和以后新增的内部字段一起吐出去
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('teachers')
    .select(
      'id, name, photo_url, tier, bio, highlight, subjects, grades, price, ' +
      'years_exp, teacher_type, teaching_mode, service_areas, studio_address, ' +
      'available_time, last_updated_at'
    )
    .eq('is_visible', true)
    .order('tier', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
