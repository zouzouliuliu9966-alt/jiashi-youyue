import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin } from '@/lib/auth-helpers'

export async function GET(req: Request) {
  const unauth = requireAdmin(req)
  if (unauth) return unauth

  const { data, error } = await supabaseAdmin
    .from('password_reset_requests')
    .select('id, teacher_id, contact, contact_type, status, note, created_at, processed_at, teachers(name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || [])
}
