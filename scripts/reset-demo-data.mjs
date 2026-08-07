#!/usr/bin/env node
/**
 * 正式宣传前清空演示/测试数据。
 *
 * 用途：上线初期用自己的资料占位撑门面，正式开始招老师前要把这些清掉，
 * 让真老师自己注册填档案。清完是一个干净的空站，表结构和后台密码都不动。
 *
 * 用法：
 *   node scripts/reset-demo-data.mjs             # 演练，只看会删什么，不动数据
 *   node scripts/reset-demo-data.mjs --execute   # 真删（还会再问一次，要手输 yes）
 *
 * 会删：
 *   lesson_orders / matches / password_reset_requests / bookings / teachers 全表
 *   avatars bucket 里的头像文件
 *   Supabase Auth 里的教师账号
 *
 * 不会碰：
 *   表结构、索引、约束、RLS 策略
 *   ADMIN_PASSWORD（在 Vercel 环境变量里，跟数据库无关）
 *   你登录 Supabase 用的那个账号（那是 Dashboard 账号，和项目的 auth.users 是两回事）
 *
 * 想保留某位老师？别在这儿加白名单——清完让 TA 用同一个手机号重新注册一遍最省事，
 * 反正正式流程本来就是"老师自己点进去填档案"。真要留，先跑演练把备份留好再说。
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const EXECUTE = process.argv.includes('--execute')

// ---------- 读 .env.local ----------
function loadEnv() {
  let raw
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  } catch {
    console.error('✗ 读不到 .env.local。这个脚本要在项目根目录下跑，且 .env.local 得在。')
    process.exit(1)
  }
  const env = {}
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
  }
  return env
}

const env = loadEnv()
const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('✗ .env.local 里缺 NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const db = createClient(url, key, { auth: { persistSession: false } })

// 删除顺序按外键依赖来：引用别人的先删，被引用的后删。
// password_reset_requests.teacher_id 虽然是 on delete cascade，
// 但显式删掉才能把行数报准，也不依赖约束定义没被人改过。
const TABLES = ['lesson_orders', 'matches', 'password_reset_requests', 'bookings', 'teachers']
const AVATAR_BUCKET = 'avatars'

async function countAll() {
  const out = {}
  for (const t of TABLES) {
    const { count, error } = await db.from(t).select('id', { count: 'exact', head: true })
    out[t] = error ? `读不到(${error.message})` : count
  }
  return out
}

async function main() {
  console.log(`\n模式：${EXECUTE ? '⚠️  真删（--execute）' : '演练（不会动任何数据）'}`)
  console.log(`项目：${url}\n`)

  // ---------- 1. 全量备份 ----------
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = new URL('../.backups/', import.meta.url)
  mkdirSync(dir, { recursive: true })

  const backup = { takenAt: new Date().toISOString(), project: url, tables: {} }
  for (const t of TABLES) {
    const { data, error } = await db.from(t).select('*')
    if (error) {
      console.error(`✗ 备份 ${t} 失败：${error.message}`)
      console.error('  备份没成功就不往下走了。')
      process.exit(1)
    }
    backup.tables[t] = data
  }

  const { data: authList, error: authErr } = await db.auth.admin.listUsers({ perPage: 1000 })
  if (authErr) {
    console.error(`✗ 读 Auth 用户失败：${authErr.message}`)
    process.exit(1)
  }
  backup.authUsers = authList.users.map(u => ({
    id: u.id, email: u.email, phone: u.phone, created_at: u.created_at,
  }))

  const { data: avatarFiles } = await db.storage.from(AVATAR_BUCKET).list('', { limit: 1000 })
  backup.avatarFiles = (avatarFiles || []).map(f => f.name)

  const backupPath = new URL(`./teachers-and-orders-${stamp}.json`, dir)
  writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  console.log(`✓ 已备份到 ${backupPath.pathname}\n`)

  // ---------- 2. 列出将要删的 ----------
  const before = await countAll()
  console.log('将要清空的表：')
  for (const t of TABLES) console.log(`  ${t.padEnd(26)} ${before[t]} 行`)

  const teacherEmails = new Set(
    backup.tables.teachers.map(t => t.email).filter(Boolean).map(e => e.toLowerCase()),
  )
  const toDeleteUsers = authList.users.filter(u => u.email && teacherEmails.has(u.email.toLowerCase()))
  const orphanUsers = authList.users.filter(u => !u.email || !teacherEmails.has(u.email.toLowerCase()))

  console.log(`\nSupabase Auth 用户共 ${authList.users.length} 个：`)
  console.log(`  ${toDeleteUsers.length} 个在 teachers 表里对得上，会删：`)
  for (const u of toDeleteUsers) console.log(`    - ${u.email}`)
  if (orphanUsers.length) {
    // 孤儿 = teachers 行没了但 auth 账号还在。留着的话，老师用同一手机号重新注册
    // 会被告知"已注册"，但登录后又查不到教师信息，卡在中间态（register/route.ts
    // 的回滚逻辑就是为了防这个）。所以一并删。
    console.log(`  ${orphanUsers.length} 个在 teachers 表里找不到（孤儿账号），也会删：`)
    for (const u of orphanUsers) console.log(`    - ${u.email || u.phone || u.id}`)
  }

  console.log(`\n${AVATAR_BUCKET} bucket 里 ${backup.avatarFiles.length} 个头像文件，会删：`)
  for (const f of backup.avatarFiles) console.log(`    - ${f}`)

  if (!EXECUTE) {
    console.log('\n以上都没执行。确认无误后加 --execute 再跑一次。')
    return
  }

  // ---------- 3. 二次确认 ----------
  const rl = createInterface({ input: stdin, output: stdout })
  const ans = await rl.question('\n以上数据会被永久删除。确认请输入 yes：')
  rl.close()
  if (ans.trim().toLowerCase() !== 'yes') {
    console.log('已取消，什么都没动。')
    return
  }

  // ---------- 4. 按外键顺序删表 ----------
  console.log('')
  for (const t of TABLES) {
    // PostgREST 不允许无条件 delete，用一个恒真条件把整表框住
    const { error } = await db.from(t).delete().not('id', 'is', null)
    console.log(error ? `✗ ${t}：${error.message}` : `✓ ${t} 已清空`)
  }

  // ---------- 5. 删头像 ----------
  if (backup.avatarFiles.length) {
    const { error } = await db.storage.from(AVATAR_BUCKET).remove(backup.avatarFiles)
    console.log(error ? `✗ 头像：${error.message}` : `✓ ${backup.avatarFiles.length} 个头像已删`)
  }

  // ---------- 6. 删 Auth 用户 ----------
  let ok = 0
  for (const u of [...toDeleteUsers, ...orphanUsers]) {
    const { error } = await db.auth.admin.deleteUser(u.id)
    if (error) console.log(`✗ Auth ${u.email || u.id}：${error.message}`)
    else ok++
  }
  console.log(`✓ ${ok} 个 Auth 账号已删`)

  // ---------- 7. 核对 ----------
  console.log('\n清理后各表行数：')
  const after = await countAll()
  let clean = true
  for (const t of TABLES) {
    const n = after[t]
    if (n !== 0) clean = false
    console.log(`  ${t.padEnd(26)} ${n} 行${n === 0 ? '' : '  ← 没清干净，去查一下'}`)
  }
  const { data: leftUsers } = await db.auth.admin.listUsers({ perPage: 1000 })
  console.log(`  ${'auth.users'.padEnd(26)} ${leftUsers?.users.length ?? '?'} 个`)

  console.log(clean ? '\n✓ 清空完成，站点现在是干净的空站。' : '\n⚠️ 有表没清干净，看上面。')
  console.log(`备份在 ${backupPath.pathname}，需要回滚的话从这里捞。`)
}

main().catch(e => {
  console.error('\n✗ 出错了：', e)
  process.exit(1)
})
