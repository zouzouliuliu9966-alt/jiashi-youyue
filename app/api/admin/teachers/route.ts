import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

// GET /api/admin/teachers —— 后台查所有老师（含隐藏的）
export async function GET(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { data, error } = await supabaseAdmin
    .from('teachers')
    .select('*')
    .order('tier', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
