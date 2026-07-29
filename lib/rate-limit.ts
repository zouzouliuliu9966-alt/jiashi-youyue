import { NextResponse } from 'next/server'

// 进程内的滑动窗口计数器。
// 注意：Vercel 是多实例的，每个实例各算各的，所以这不是精确限流，
// 但足以挡住「拿脚本狂试后台密码 / 批量枚举家长手机号」这类行为。
// 要精确限流得上 Redis（Upstash 之类），现阶段没必要。
type Hit = { count: number; resetAt: number }
const buckets = new Map<string, Hit>()

// 顺手清掉过期桶，避免长期运行的实例内存一直涨
function sweep(now: number) {
  if (buckets.size < 500) return
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k)
}

export function clientKey(req: Request): string {
  const h = req.headers
  const ip =
    h.get('x-forwarded-for')?.split(',')[0].trim() ||
    h.get('x-real-ip') ||
    'unknown'
  return ip
}

/**
 * 超出配额返回 429 响应，未超出返回 null。
 * @param scope  限流范围，不同接口用不同 scope，互不影响
 * @param limit  窗口内允许的次数
 * @param windowMs 窗口长度（毫秒）
 */
export function rateLimit(
  req: Request,
  scope: string,
  limit: number,
  windowMs: number,
  extraKey = '',
): NextResponse | null {
  const now = Date.now()
  sweep(now)

  const key = `${scope}:${clientKey(req)}${extraKey ? ':' + extraKey : ''}`
  const hit = buckets.get(key)

  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  hit.count += 1
  if (hit.count > limit) {
    const retryAfter = Math.ceil((hit.resetAt - now) / 1000)
    return NextResponse.json(
      { error: `操作太频繁，请 ${retryAfter} 秒后再试` },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }
  return null
}
