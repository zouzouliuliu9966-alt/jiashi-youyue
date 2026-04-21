import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  const { matchId, response, paymentAmount } = await req.json()
  if (!matchId || !response) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const updateData: Record<string, unknown> = { teacher_response: response }
  if (response === 'accepted' && paymentAmount) {
    updateData.payment_amount = paymentAmount
  }

  const { error } = await supabaseAdmin.from('matches').update(updateData).eq('id', matchId)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
