/**
 * 线上完整业务链路端到端验证 —— v2（按 ds-review / Codex / Kimi 三方审查意见重写）
 *
 * 会打真实线上接口、往企业微信群推 3 条测试消息、在生产库建数据再删。
 * 用法：node _e2e-live.mjs（ADMIN_PASSWORD 从 .env.local 读）
 *
 * v1 被三方审查拦下的致命问题及修法：
 *  - /api/teacher/profile 漏传 ?id= → 接口 400，而"返回里没有手机号"的检查照样通过。
 *    收费点验证会给出假绿灯。→ 现在传 id，且强制断言 HTTP 200 + 结构正确 + 能定位到本次 match。
 *  - /api/admin/matches/[id] 漏传 {action:'confirm_payment'} → 400，收款根本没确认。
 *  - 固定手机号 + .single() 定位 booking → 撞到已有数据就会定位错、甚至删掉真实预约。
 *    → 改用每次运行随机生成的唯一标识（RUN_ID）定位，且用 maybeSingle + 数量校验。
 *  - bad() 不中止，前置失败后继续拿 undefined 撞生产接口。→ 关键步骤用 must() 直接抛。
 *  - 清理不检查 Supabase 的 {error}、任一项抛异常后续全停。→ 每项独立 try/catch + 检查 error。
 *  - 未捕获异常时仍打印"✅ 全链路通过"。→ 记 thrown 标志，参与最终结论。
 *  - Number(null)===0 导致缺字段被当成"抽成为 0"。→ 先断言字段存在。
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

// 默认打线上。先用 E2E_BASE=http://localhost:3000 跑一遍排脚本 bug——
// 本地 .env.local 没配 WECOM_WEBHOOK_URL，notify.ts 会直接 return，不会打扰工作群。
// 注意：本地 dev 连的是同一个线上 Supabase 库，所以数据仍写线上，清理逻辑照常生效。
const BASE = process.env.E2E_BASE || 'https://www.jiashiyouyue.com'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const t = line.trim()
  if (!t || t.startsWith('#') || !t.includes('=')) continue
  const i = t.indexOf('=')
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')
}
const ADMIN_PW = env.ADMIN_PASSWORD
if (!ADMIN_PW) { console.error('✗ .env.local 里缺 ADMIN_PASSWORD'); process.exit(1) }

// service_role 只用于「读库核对」和「兜底清理」，业务动作一律走真实 HTTP 接口
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// 每次运行唯一。测试数据靠它定位，绝不靠"固定手机号"——那会撞上真实数据
const RUN_ID = randomUUID().slice(0, 8)
const TAG = `__链路测试_${RUN_ID}__`
// 手机号用 1showcase 段之外的、明显是测试的号；即便如此也不靠它做删除条件
// 必须正好 11 位：注册和家长端接口都按 /^\d{11}$/ 校验，少一位直接 400
const rand4 = () => String(Math.floor(Math.random() * 9000) + 1000)
const PARENT_PHONE = `1350000${rand4()}`   // 7 + 4 = 11
const TEACHER_PHONE = `1350009${rand4()}`  // 7 + 4 = 11
// 和前端注册用的格式一致（手机号派生），这样验的才是真实路径。
// 手机号是本次随机的，且现有 3 位老师 phone 全是 null，不会撞。
const TEACHER_EMAIL = `${TEACHER_PHONE}@phone.jiashiyouyue.cn`
const TEACHER_PW = `e2e_${randomUUID().slice(0, 12)}`
const PARENT_WECHAT = `wx_e2e_${RUN_ID}`

const failures = []
let thrown = null
let step = 0
const ok = (m) => console.log(`  ✓ ${m}`)
const bad = (m) => { console.log(`  ✗ ${m}`); failures.push(m) }
const head = (m) => console.log(`\n${'─'.repeat(66)}\n【${++step}】${m}`)
/** 关键前置：失败就抛，绝不带着 undefined 继续撞生产接口 */
const must = (cond, m) => { if (!cond) { bad(m); throw new Error(`前置失败，中止：${m}`) } ; ok(m) }

async function call(path, { method = 'POST', body, admin, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (admin) headers['x-admin-password'] = ADMIN_PW
  if (token) headers['Authorization'] = `Bearer ${token}`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  try {
    const res = await fetch(BASE + path, {
      method, headers, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal,
    })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch {}
    return { status: res.status, json, text, ok: res.ok }
  } finally {
    clearTimeout(timer)
  }
}

/** 所有权凭据：只删本次运行确实创建出来的东西 */
const owned = { lessonId: null, matchId: null, bookingId: null, teacherId: null, authUserId: null }
let teacherToken

try {
  console.log(`本次运行标识 RUN_ID=${RUN_ID}`)
  console.log(`测试老师 ${TEACHER_EMAIL} / 家长手机 ${PARENT_PHONE}\n`)

  // ─────────────────────────────── 1. 老师注册（企微通知 ①）
  head('老师注册  → 应触发企微通知「新老师注册」')
  const reg = await call('/api/teacher/register', {
    body: { name: `${TAG}老师`, email: TEACHER_EMAIL, phone: TEACHER_PHONE, password: TEACHER_PW },
  })
  must(reg.status === 200 && reg.json?.success, `注册成功（HTTP ${reg.status}）`)
  owned.authUserId = reg.json.userId || null

  const { data: tRow, error: tErr } = await db.from('teachers').select('id').eq('email', TEACHER_EMAIL).maybeSingle()
  must(!tErr && tRow?.id, 'teachers 已落库')
  owned.teacherId = tRow.id

  const login = await call('/api/auth/login', { body: { email: TEACHER_EMAIL, password: TEACHER_PW } })
  must(login.status === 200 && login.json?.token && login.json?.teacher?.id, '登录拿到 token')
  must(login.json.teacher.id === owned.teacherId, '登录返回的 teacher.id 与库中一致')
  teacherToken = login.json.token
  const loginKeys = Object.keys(login.json.teacher).sort()
  loginKeys.join(',') === 'id,name'
    ? ok('login 白名单生效：只返回 id/name')
    : bad(`login 返回了额外字段：${loginKeys.join(',')}`)

  // ─────────────────────────────── 1b. 老师自己填资料（教师端真实接口）
  head('老师在教师端填资料（PUT /api/teacher/profile）')
  const prof = await call('/api/teacher/profile', {
    method: 'PUT', token: teacherToken,
    body: {
      teacherId: owned.teacherId,
      form: {
        subjects: ['语文'], grades: ['初二'], teaching_mode: '网课',
        price: '200', years_exp: 3, teacher_type: '专职辅导',
        available_time: '周末全天', highlight: `${TAG}请勿理会`,
        bio: `${TAG} 自动化验证用，跑完即删`,
        // 顺带验 mass assignment 防护：老师不该能自己升档/上架
        tier: 3, is_visible: true, email: 'hacked@example.com',
      },
    },
  })
  must(prof.status === 200 && prof.json?.success, `资料保存成功（HTTP ${prof.status}）`)

  const { data: afterSave } = await db.from('teachers')
    .select('tier, is_visible, email, subjects, teaching_mode').eq('id', owned.teacherId).single()
  afterSave?.tier === 1 ? ok('🔒 mass assignment 防护：老师改不了自己的档位（仍是 1）') : bad(`❗老师把自己升到了 tier=${afterSave?.tier}`)
  afterSave?.is_visible === false ? ok('🔒 老师改不了自己的上架状态') : bad('❗老师把自己上架了')
  afterSave?.email === TEACHER_EMAIL ? ok('🔒 老师改不了自己的登录邮箱') : bad(`❗email 被改成 ${afterSave?.email}`)
  afterSave?.teaching_mode === '网课' ? ok('白名单内的字段正常保存（teaching_mode=网课）') : bad('白名单内字段没存上')

  // ─────────────────────────────── 1c. 教务审核上架（后台真实接口）
  head('教务在后台审核上架（PATCH /api/admin/teachers/[id]）')
  const appr = await call(`/api/admin/teachers/${owned.teacherId}`, {
    method: 'PATCH', admin: true, body: { tier: 1, is_visible: true },
  })
  must(appr.status === 200 && appr.json?.success, `审核上架成功（HTTP ${appr.status}）`)
  const { data: vis } = await db.from('teachers').select('is_visible').eq('id', owned.teacherId).single()
  must(vis?.is_visible === true, '老师已上架，家长端能看到')

  // ─────────────────────────────── 2. 家长提交预约（企微通知 ②）
  head('家长端提交预约  → 应触发企微通知「新预约」')
  const bk = await call('/api/bookings', {
    body: {
      teacher_id: owned.teacherId, student_grade: '初二', course_type: '一对一',
      phone: PARENT_PHONE, wechat: PARENT_WECHAT,
      student_intro: `${TAG} 自动化验证产生的测试预约，请忽略`,
      available_time: '周末上午', address: '南京市玄武区（测试）',
    },
  })
  if (bk.status === 429) { bad('撞到限流（5次/小时），换个时间再跑'); throw new Error('限流') }
  must(bk.status === 200 && bk.json?.success, `提交成功（HTTP ${bk.status}）`)

  // 用本次唯一的 wechat 定位，不用手机号——手机号可能撞上真实数据
  const { data: bkRows, error: bkErr } = await db.from('bookings').select('id, status').eq('wechat', PARENT_WECHAT)
  must(!bkErr && bkRows?.length === 1, `bookings 精确定位到 1 条（实际 ${bkRows?.length ?? '查询失败'}）`)
  owned.bookingId = bkRows[0].id
  ok(`booking status=${bkRows[0].status}`)

  // ─────────────────────────────── 3. 后台推需求给老师
  head('后台推送需求给老师（admin 接口）')
  const mt = await call('/api/admin/matches', { admin: true, body: { booking_id: owned.bookingId, teacher_id: owned.teacherId } })
  must(mt.status === 200 && mt.json?.success, `推送成功（HTTP ${mt.status}）`)
  const { data: mRows, error: mErr } = await db.from('matches').select('id').eq('booking_id', owned.bookingId)
  must(!mErr && mRows?.length === 1, 'matches 已落库')
  owned.matchId = mRows[0].id

  // ─────────────────────────────── 4. 🔒 收费点：未付费不该拿到联系方式
  head('🔒 收费点验证：未确认收款时，老师端接口是否泄露家长手机号/微信')
  const before = await call(`/api/teacher/profile?id=${owned.teacherId}`, { method: 'GET', token: teacherToken })
  // 必须先确认接口真的正常返回了，否则 400 的错误响应里当然没有手机号 —— 那是假通过
  must(before.status === 200, `profile 接口正常返回（HTTP ${before.status}）`)
  const beforeMatch = (before.json?.matches || []).find(m => m.id === owned.matchId)
  must(beforeMatch, '返回里能定位到本次的 match（证明确实查到了数据，不是空响应）')
  beforeMatch.bookings?.phone === null ? ok('家长手机号被服务端置空') : bad(`❗未付费就拿到手机号：${beforeMatch.bookings?.phone}`)
  beforeMatch.bookings?.wechat === null ? ok('家长微信被服务端置空') : bad(`❗未付费就拿到微信：${beforeMatch.bookings?.wechat}`)
  before.text.includes(PARENT_PHONE) ? bad('❗整个响应体里仍出现了家长手机号') : ok('整个响应体里都没有该手机号')

  // ─────────────────────────────── 5. 老师接单付费（企微通知 ③）
  head('老师端接单并付信息费  → 应触发企微通知「老师接单付费」')
  const rsp = await call('/api/teacher/respond', {
    token: teacherToken, body: { matchId: owned.matchId, response: 'accepted', paymentAmount: '200' },
  })
  must(rsp.status === 200 && rsp.json?.success, `接单成功（HTTP ${rsp.status}）`)

  // ─────────────────────────────── 6. 后台确认收款
  head('后台确认收到信息费')
  const pay = await call(`/api/admin/matches/${owned.matchId}`, {
    method: 'PATCH', admin: true, body: { action: 'confirm_payment' },   // v1 漏了 action，必然 400
  })
  must(pay.status === 200, `确认收款成功（HTTP ${pay.status}）${pay.status !== 200 ? JSON.stringify(pay.json) : ''}`)
  const { data: mChk } = await db.from('matches').select('payment_confirmed').eq('id', owned.matchId).single()
  must(mChk?.payment_confirmed === true, 'payment_confirmed 确实变成了 true')

  // ─────────────────────────────── 7. 🔓 付费后应该拿得到
  head('🔓 收费点验证：确认收款后，老师应当能拿到家长联系方式')
  const after = await call(`/api/teacher/profile?id=${owned.teacherId}`, { method: 'GET', token: teacherToken })
  must(after.status === 200, `profile 接口正常返回（HTTP ${after.status}）`)
  const afterMatch = (after.json?.matches || []).find(m => m.id === owned.matchId)
  must(afterMatch, '返回里能定位到本次的 match')
  afterMatch.bookings?.phone === PARENT_PHONE ? ok('付费后拿到家长手机号') : bad(`付费后仍拿不到手机号（老师白付钱）：${afterMatch.bookings?.phone}`)
  afterMatch.bookings?.wechat === PARENT_WECHAT ? ok('付费后拿到家长微信') : bad(`付费后仍拿不到微信：${afterMatch.bookings?.wechat}`)

  // ─────────────────────────────── 8. 后台建课时订单
  head('后台创建课时订单')
  const ls = await call('/api/admin/lessons', {
    admin: true,
    body: {
      booking_id: owned.bookingId, teacher_id: owned.teacherId, parent_phone: PARENT_PHONE,
      parent_name: `${TAG}家长`, student_grade: '初二', subject: '语文',
      price_per_lesson: 200, notes: `${TAG} 内部备注，家长端不该看到`,
    },
  })
  must(ls.status === 200 && ls.json?.lesson?.id, `订单已建（HTTP ${ls.status}）`)
  owned.lessonId = ls.json.lesson.id
  const rate = ls.json.lesson.platform_rate
  rate === undefined || rate === null
    ? bad('接口没返回 platform_rate 字段，无法确认抽成')   // Number(null)===0 会假通过，先判存在
    : Number(rate) === 0 ? ok('platform_rate = 0') : bad(`platform_rate 不是 0，是 ${rate}`)

  const cf = await call(`/api/admin/lessons/${owned.lessonId}`, { method: 'PATCH', admin: true, body: { action: 'confirm_payment' } })
  must(cf.status === 200, `确认课时费收款（HTTP ${cf.status}）`)

  // ─────────────────────────────── 9. 老师端标完课（教师端真实接口）
  head('老师在教师端点「标记完课」（教师端接口，不是后台代操作）')
  const mk = await call(`/api/teacher/lessons/${owned.lessonId}/mark-completed`, {
    token: teacherToken, body: { teacherId: owned.teacherId },
  })
  must(mk.status === 200, `标记完课成功（HTTP ${mk.status}）${mk.status !== 200 ? JSON.stringify(mk.json) : ''}`)
  const { data: l1 } = await db.from('lesson_orders').select('lesson_status').eq('id', owned.lessonId).single()
  l1?.lesson_status === 'teacher_done' ? ok(`状态流转到 teacher_done`) : bad(`状态是 ${l1?.lesson_status}，应为 teacher_done`)

  // ─────────────────────────────── 10. 家长端确认完课
  head('家长在家长端点「确认完课」')
  const pc = await call(`/api/parent/lessons/${owned.lessonId}/confirm?phone=${PARENT_PHONE}`, {})
  must(pc.status === 200, `家长确认成功（HTTP ${pc.status}）${pc.status !== 200 ? JSON.stringify(pc.json) : ''}`)
  const { data: l2 } = await db.from('lesson_orders').select('lesson_status').eq('id', owned.lessonId).single()
  l2?.lesson_status === 'confirmed' ? ok('状态流转到 confirmed') : bad(`状态是 ${l2?.lesson_status}，应为 confirmed`)

  // ─────────────────────────────── 11. 结算
  head('后台结算  → 验证平台不抽课时费')
  const st = await call(`/api/admin/lessons/${owned.lessonId}`, { method: 'PATCH', admin: true, body: { action: 'settle' } })
  must(st.status === 200, `结算成功（HTTP ${st.status}）${st.status !== 200 ? JSON.stringify(st.json) : ''}`)

  const { data: fin, error: finErr } = await db.from('lesson_orders')
    .select('price_per_lesson, platform_rate, platform_fee, settle_amount, settled').eq('id', owned.lessonId).single()
  must(!finErr && fin, '能读到结算后的订单')
  console.log('  结算结果:', JSON.stringify(fin))
  fin.platform_fee === null || fin.platform_fee === undefined
    ? bad('platform_fee 字段为空，无法确认')
    : Number(fin.platform_fee) === 0 ? ok('平台抽成 ¥0') : bad(`平台抽成不是 0，是 ${fin.platform_fee}`)
  fin.settle_amount === null || fin.settle_amount === undefined
    ? bad('settle_amount 为空')
    : Number(fin.settle_amount) === Number(fin.price_per_lesson)
      ? ok(`老师全额拿到 ¥${fin.settle_amount}`)
      : bad(`结算金额 ${fin.settle_amount} ≠ 单价 ${fin.price_per_lesson}`)

  // ─────────────────────────────── 12. 公开接口字段白名单
  head('公开接口字段白名单（铁律 4.2）')
  const pubRes = await call('/api/teachers', { method: 'GET' })
  must(pubRes.status === 200, `公开老师接口正常（HTTP ${pubRes.status}）`)
  const arr = Array.isArray(pubRes.json) ? pubRes.json : []
  must(arr.length > 0, `返回了 ${arr.length} 位老师（不是空数组，否则下面的检查没意义）`)
  const keys = [...new Set(arr.flatMap(t => Object.keys(t)))]
  keys.includes('email') ? bad(`❗公开接口泄露 email`) : ok('公开接口无 email')
  keys.includes('phone') ? bad(`❗公开接口泄露 phone`) : ok('公开接口无 phone')

  const plRes = await call(`/api/parent/lessons?phone=${PARENT_PHONE}`, { method: 'GET' })
  must(plRes.status === 200, `家长端课时接口正常（HTTP ${plRes.status}）`)
  const pl = Array.isArray(plRes.json) ? plRes.json : (plRes.json?.lessons || [])
  must(pl.length > 0, `家长能查到自己的 ${pl.length} 条订单`)
  const plKeys = [...new Set(pl.flatMap(o => Object.keys(o)))]
  for (const f of ['platform_fee', 'settle_amount', 'platform_rate', 'notes']) {
    plKeys.includes(f) ? bad(`❗家长端能看到 ${f}`) : ok(`家长端看不到 ${f}`)
  }

} catch (e) {
  thrown = e
  console.log(`\n⛔ 链路中断：${e.message}`)
} finally {
  // ─────────────────────────────── 清理：每项独立，一项失败不影响其余
  console.log(`\n${'─'.repeat(66)}\n【清理】只删本次运行创建的（按记录下来的 id，不按手机号等可能撞车的条件）`)
  const leftovers = []
  const del = async (label, fn) => {
    try {
      const { error } = await fn()
      if (error) { console.log(`  ✗ ${label}: ${error.message}`); leftovers.push(label) }
      else console.log(`  ✓ ${label}`)
    } catch (e) { console.log(`  ✗ ${label}: ${e.message}`); leftovers.push(label) }
  }
  // 删 teachers 前先二次校验：这条记录的 name 必须带本次 TAG。
  // 万一 owned.teacherId 因为某种原因指错了，这道闸能拦住误删真实老师。
  if (owned.teacherId) {
    const { data: chk } = await db.from('teachers').select('name').eq('id', owned.teacherId).maybeSingle()
    if (chk && !String(chk.name).includes(RUN_ID)) {
      console.log(`  ⛔ 拒绝删除 teachers ${owned.teacherId}：name「${chk.name}」不含本次 RUN_ID，可能是真实老师`)
      leftovers.push('teachers（已拦截，需人工确认）')
      owned.teacherId = null
    }
  }

  if (owned.lessonId) await del('lesson_orders', () => db.from('lesson_orders').delete().eq('id', owned.lessonId))
  if (owned.matchId) await del('matches', () => db.from('matches').delete().eq('id', owned.matchId))
  if (owned.bookingId) await del('bookings', () => db.from('bookings').delete().eq('id', owned.bookingId))
  if (owned.teacherId) await del('teachers', () => db.from('teachers').delete().eq('id', owned.teacherId))

  // 兜底扫描：某一步在拿到 id 之前就抛了，上面的 if 就不会执行，数据会残留。
  // 按本次唯一的 RUN_ID / wechat / email 再扫一遍，只删确实属于本次运行的。
  try {
    const { data: strayB } = await db.from('bookings').select('id').eq('wechat', PARENT_WECHAT)
    for (const r of strayB || []) await del(`bookings 兜底 ${r.id}`, () => db.from('bookings').delete().eq('id', r.id))
    const { data: strayL } = await db.from('lesson_orders').select('id').eq('parent_phone', PARENT_PHONE)
    for (const r of strayL || []) await del(`lesson_orders 兜底 ${r.id}`, () => db.from('lesson_orders').delete().eq('id', r.id))
    const { data: strayT } = await db.from('teachers').select('id, name').eq('email', TEACHER_EMAIL)
    for (const r of strayT || []) {
      if (String(r.name).includes(RUN_ID)) await del(`teachers 兜底 ${r.id}`, () => db.from('teachers').delete().eq('id', r.id))
    }
  } catch (e) { console.log('  ✗ 兜底扫描失败:', e.message) }
  // auth 用户：按本次注册返回的 userId 删；拿不到就按本次唯一邮箱翻页找。
  // 注册压根没成功时不用清，也不该报"残留"。
  try {
    if (!owned.authUserId && !owned.teacherId) {
      console.log('  － auth 账号：本次没注册成功，无需清理')
    } else if (owned.authUserId) {
      const { error } = await db.auth.admin.deleteUser(owned.authUserId)
      error ? (console.log(`  ✗ auth: ${error.message}`), leftovers.push('auth')) : console.log('  ✓ auth 账号')
    } else {
      let found = false
      for (let page = 1; page <= 10 && !found; page++) {
        const { data } = await db.auth.admin.listUsers({ page, perPage: 200 })
        if (!data?.users?.length) break
        const u = data.users.find(x => x.email === TEACHER_EMAIL)
        if (u) { await db.auth.admin.deleteUser(u.id); console.log('  ✓ auth 账号（翻页找到）'); found = true }
      }
      if (!found) { console.log('  ✗ auth 账号没找到'); leftovers.push('auth') }
    }
  } catch (e) { console.log(`  ✗ auth: ${e.message}`); leftovers.push('auth') }

  // ─────────────────────────────── 核对：只统计数量，不打印真实老师姓名和全部邮箱
  console.log('\n=== 清理后线上现状 ===')
  try {
    const { count: tc } = await db.from('teachers').select('id', { count: 'exact', head: true })
    console.log(`  teachers: ${tc} 位（开工前 3 位）`)
    const { data: leftT } = await db.from('teachers').select('id').eq('email', TEACHER_EMAIL)
    console.log(`  本次测试老师残留: ${leftT?.length ?? '?'} 条（应为 0）`)
    for (const tb of ['lesson_orders', 'matches', 'bookings']) {
      const { count } = await db.from(tb).select('id', { count: 'exact', head: true })
      console.log(`  ${tb}: ${count} 行（开工前 0 行）`)
    }
    const { data: au } = await db.auth.admin.listUsers({ perPage: 200 })
    console.log(`  auth 用户: ${au?.users?.length ?? '?'} 个（开工前 2 个）`)
  } catch (e) { console.log('  核对失败:', e.message) }

  console.log(`\n${'═'.repeat(66)}`)
  if (thrown) console.log(`❌ 链路中断：${thrown.message}`)
  if (leftovers.length) console.log(`⚠️ 有残留没清掉：${leftovers.join('、')}，需要手工处理`)
  if (failures.length) {
    console.log(`❌ ${failures.length} 项未通过：`)
    failures.forEach(f => console.log(`   - ${f}`))
  }
  if (!thrown && !failures.length && !leftovers.length) console.log('✅ 全链路通过，数据已清干净')

  console.log(`\n👉 去企业微信群看，应有 3 条带「${TAG}」的消息：`)
  console.log('   ① 新老师注册   ② 新预约   ③ 老师接单付费')
  // finally 挡不住 SIGKILL / OOM / 断电。留一条手工兜底的线索。
  console.log(`\n（万一进程被强杀导致数据残留，按 RUN_ID「${RUN_ID}」在后台搜索并删除：`)
  console.log(`  teachers.email = ${TEACHER_EMAIL} / bookings.wechat = ${PARENT_WECHAT} / lesson_orders.parent_phone = ${PARENT_PHONE}）`)
  process.exitCode = (thrown || failures.length || leftovers.length) ? 1 : 0
}
