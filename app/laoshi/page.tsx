import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '教师入驻',
  description: '家师有约南京家教老师招募：教务帮你对接学生，课时费自己定，平台不抽课时费。',
}

const REASONS = [
  {
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
    title: '教务帮你找学生',
    desc: '不用自己发传单、蹲家长群。家长的需求由教务一对一对接，直接推到您的教师端。',
  },
  {
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    title: '都是筛过的真实需求',
    desc: '每一条需求教务都跟家长确认过年级、科目、时间和地点，不是广撒网的泛流量。',
  },
  {
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    title: '课时费自己定，平台不抽成',
    desc: '您按自己的标价收课时费，平台不从课时费里抽点，也不干涉您和家长怎么结算。',
  },
  {
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    title: '接单才付费，不接单不花钱',
    desc: '注册、展示、看需求全程免费。只有您决定接这一单时，才支付一次信息服务费。',
  },
]

const STEPS = [
  { n: '1', title: '注册账号', desc: '手机号 + 称呼 + 密码，3 项填完就行，1 分钟。' },
  { n: '2', title: '补充资料', desc: '登录教师端填科目、年级、教龄、可上课时间、自我介绍，可以随时改。' },
  { n: '3', title: '教务审核', desc: '教务会联系您核验教师资格证或在职证明，聊一下教学经历，定档位。' },
  { n: '4', title: '上架接单', desc: '审核通过后展示在家长端，有匹配的需求会推送到您的教师端。' },
]

const TIERS = [
  { stars: '⭐', name: '基础档', desc: '在校研究生、应届毕业生，或教龄较短但基本功扎实' },
  { stars: '⭐⭐', name: '进阶档', desc: '3 年以上教龄，带过完整届别，有稳定的家长口碑' },
  { stars: '⭐⭐⭐', name: '精英档', desc: '在职教师、机构名师或独立工作室，有明确的口碑与成绩' },
]

const FAQS = [
  {
    q: '信息服务费怎么收？收多少？',
    a: '只在您决定接单、需要拿到家长联系方式时收取一次，金额等于该年级的一节课时费。接单前会明确告诉您金额，您可以选择不接。平台不向家长收取任何费用，也不从您的课时费里抽点。',
  },
  {
    q: '接了单但家长后来不上了怎么办？',
    a: '联系教务说明情况，教务会核实后为您安排其他家长需求，或退还信息服务费。教务工作时段 10:00–18:00，1 小时内响应。',
  },
  {
    q: '一定要有教师资格证吗？',
    a: '有证优先。没有证但有扎实的教学经历（在职教师、机构任教、带过完整届别）也可以，教务会通过沟通和试讲来判断，对应的档位会有区别。',
  },
  {
    q: '可以只上网课，或者只带家附近的学生吗？',
    a: '可以。资料里的上课方式有四种：上门 / 工作室 / 网课 / 均可。选「上门」还能填上门范围（比如只带玄武、鼓楼），教务只会推匹配得上的需求给您。只上网课的话不受南京地域限制，外地老师也能接单。',
  },
  {
    q: '课时费什么时候到手？',
    a: '两种方式由您和家长商定：家长直接转给您，或者付到平台账户由平台转给您。走平台的话，课程结束、家长确认后结算。',
  },
]

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">教师入驻</h1>
            <p className="text-xs text-gray-400">家师有约 · 南京</p>
          </div>
          <Link href="/teacher/login" className="text-sm text-orange-500 hover:text-orange-600">
            已有账号
          </Link>
        </div>
      </div>

      {/* 首屏 */}
      <div className="bg-gradient-to-b from-orange-500 to-orange-400 text-white">
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-3">南京家教老师招募</h2>
          {/* 拆两行写，挤在一行手机上会断成「平台不抽课时／费」 */}
          <p className="text-orange-50 font-medium mb-1">教务帮您对接学生</p>
          <p className="text-orange-100 text-sm mb-8">
            课时费自己定 · 平台不抽成 · 接单才付费
          </p>
          <Link
            href="/teacher/register"
            className="inline-block bg-white text-orange-500 font-bold px-10 py-3 rounded-full shadow-lg hover:shadow-xl transition-all text-lg"
          >
            立即注册
          </Link>
          <p className="text-orange-100 text-xs mt-3">填 3 项，1 分钟</p>
        </div>
      </div>

      {/* 为什么加入 */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h3 className="font-bold text-gray-800 mb-4">为什么在这里接单</h3>
        <div className="space-y-3">
          {REASONS.map(r => (
            <div key={r.title} className="bg-white rounded-2xl p-4 flex gap-3">
              <div className="w-10 h-10 shrink-0 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={r.icon} />
                </svg>
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900 mb-1">{r.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 加入流程 */}
      <div className="max-w-2xl mx-auto px-4 pb-6">
        <h3 className="font-bold text-gray-800 mb-4">怎么加入</h3>
        <div className="bg-white rounded-2xl p-5 space-y-5">
          {STEPS.map((s, i) => (
            <div key={s.n} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-7 h-7 rounded-full bg-orange-500 text-white text-sm font-bold flex items-center justify-center">
                  {s.n}
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-orange-100 mt-1" />}
              </div>
              <div className={i < STEPS.length - 1 ? 'pb-1' : ''}>
                <p className="font-medium text-sm text-gray-900 mb-0.5">{s.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 档位 */}
      <div className="max-w-2xl mx-auto px-4 pb-6">
        <h3 className="font-bold text-gray-800 mb-4">档位怎么分</h3>
        <div className="bg-white rounded-2xl p-4 space-y-3">
          {TIERS.map(t => (
            <div key={t.name} className="flex gap-3 items-start">
              <span className="text-sm shrink-0 w-14">{t.stars}</span>
              <div>
                <p className="text-sm font-medium text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
            档位由教务根据资质和教学经历评定，影响您在家长端的展示顺序，不影响您自己定价。
          </p>
        </div>
      </div>

      {/* 常见问题 */}
      <div className="max-w-2xl mx-auto px-4 pb-6">
        <h3 className="font-bold text-gray-800 mb-4">老师常问的问题</h3>
        <div className="bg-white rounded-2xl p-5 space-y-4">
          {FAQS.map(f => (
            <div key={f.q}>
              <p className="text-sm font-medium text-gray-900 mb-1">{f.q}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 联系教务 */}
      <div className="max-w-2xl mx-auto px-4 pb-6">
        <div className="bg-white rounded-2xl p-5">
          <p className="font-medium text-sm text-gray-900 mb-3">想先问清楚再决定？</p>
          <div className="flex items-start gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/contact-qrcode.png"
              alt="教务企业微信二维码"
              className="w-28 h-44 shrink-0 object-contain rounded-lg bg-white"
            />
            <div className="text-xs text-gray-600 space-y-1 leading-relaxed">
              <p className="font-medium text-gray-800">扫码加教务企业微信</p>
              <p>或搜索微信号</p>
              <p className="font-medium text-orange-600">c_zzZlzy</p>
              <p className="text-gray-400 pt-1">工作时段 10:00–18:00</p>
            </div>
          </div>
        </div>
      </div>

      {/* 底部 CTA */}
      <div className="max-w-2xl mx-auto px-4 pb-10">
        <Link
          href="/teacher/register"
          className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white font-medium py-3.5 rounded-xl transition-colors"
        >
          立即注册，加入家师有约
        </Link>
        <p className="text-center text-xs text-gray-400 mt-3">
          注册、展示、看需求全程免费 · 平台不向家长收取任何费用
        </p>
      </div>
    </main>
  )
}
