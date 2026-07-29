// 后台密码只从环境变量读，绝不在代码里写兜底默认值 —— 本仓库是公开的，
// 写在代码里的默认密码等于把管理后台（含所有家长手机号）直接交出去。
// 优先 ADMIN_PASSWORD；NEXT_PUBLIC_ADMIN_PASSWORD 仅为兼容线上已有配置，应尽快迁移掉。
export function getAdminPassword(): string | null {
  const pwd = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD
  return pwd && pwd.trim() ? pwd : null
}
