import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 老师标记完课后，家长迟迟不点确认，订单就永远卡在 teacher_done、结算走不下去。
// 这个定时任务把超期未确认的订单置为 auto_confirmed，后台就能正常结算了。
// 由 vercel.json 里的 cron 每天触发一次。

const AUTO_CONFIRM_AFTER_DAYS = 7

export async function GET(req: Request) {
  // Vercel cron 会带 CRON_SECRET；本地或手动调用时也要带，否则谁都能触发
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }
  }

  const cutoff = new Date(Date.now() - AUTO_CONFIRM_AFTER_DAYS * 86400000).toISOString()

  const { data, error } = await supabaseAdmin
    .from('lesson_orders')
    .update({
      lesson_status: 'auto_confirmed',
      parent_confirmed_at: new Date().toISOString(),
    })
    .eq('lesson_status', 'teacher_done')
    .lt('teacher_marked_at', cutoff)
    .select('id, teacher_name, parent_phone, teacher_marked_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    autoConfirmed: data?.length ?? 0,
    afterDays: AUTO_CONFIRM_AFTER_DAYS,
    orders: data ?? [],
  })
}
