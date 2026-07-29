import { timingSafeEqual } from 'crypto'

// 后台密码只从 ADMIN_PASSWORD 读，绝不在代码里写兜底默认值 —— 本仓库是公开的，
// 写在代码里的默认密码等于把管理后台（含所有家长手机号）直接交出去。
// 也不用 NEXT_PUBLIC_ 前缀的变量：那类变量会被打进前端 bundle，一旦有人
// 在客户端组件里引用就全网可见。
export function getAdminPassword(): string | null {
  const pwd = process.env.ADMIN_PASSWORD
  return pwd && pwd.trim() ? pwd : null
}

// 常量时间比较，避免按字符逐位比较泄露密码长度和前缀
export function adminPasswordMatches(input: string | null | undefined): boolean {
  const expected = getAdminPassword()
  if (!expected || !input) return false
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
