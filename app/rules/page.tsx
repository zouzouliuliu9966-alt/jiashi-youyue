'use client'

import Link from 'next/link'
import FAQAccordion, { FAQItem } from '@/components/FAQAccordion'

const parentFAQs: FAQItem[] = [
  {
    q: '老师怎么收费？',
    a: '老师按自己的标价收取课时费。平台只做免费匹配，不向家长收取任何中介费、匹配费。教务会根据您的需求严选老师，第一节课即为正式课，按老师标价收费。',
  },
  {
    q: '课时费怎么付？',
    // 原来这里写的是「也可以付到平台账户由平台代转」。已取消 ——
    // 课时费一旦过平台账户，平台就持有了预付款，老师中途中断时性质完全不同。
    // 用户协议第二条同步写了「平台不代收、不代管、不代付」，两处口径必须一致。
    a: '直接付给老师本人（微信、支付宝或现金均可），平台不代收、不代管课时费，也不接受任何形式的充值。具体节奏由您和老师商定，建议按课时或按小周期结算，不要一次性预付太多。',
  },
  {
    q: '不满意怎么办？',
    a: '对老师教学不满意，可联系教务，我们会免费协调更换其他老师（同一家庭最多 2 次）。已经上过的课，课时费照常付给原来那位老师，不退。',
  },
  {
    // 原来这里挂的是一张按小学/初中/中考冲刺列价的价目表。撤掉了 ——
    // 平台自己按学段列学科辅导报价，等于主动把业务性质写清楚，没必要。
    // 价格本来就由老师自己定，老师卡片上也有，放这儿是重复信息。
    q: '课时费怎么算？',
    a: '课时费由每位老师自行定价，在老师卡片上直接可以看到。平台不代收、不抽成，费用由您和老师直接结算。拿不准可以问教务，教务会按您的需求推荐合适价位的老师。',
  },
  {
    q: '怎么预约老师？',
    a: '在首页按科目、年级、档位筛选老师，点击「预约」填写学生情况和联系方式即可。教务会在收到需求后与您联系，确认时间地点。',
  },
  {
    q: '平台有什么保障？',
    a: '每位老师教务都当面或视频沟通过，了解其教学经历后才上架，教务全程跟进，课后定期回访。如对老师不满意，教务会协调更换老师，确保为您找到合适的师资。',
  },
]

export default function RulesPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">家长须知</h1>
          <p className="text-sm text-gray-500">了解平台服务流程与保障</p>
        </div>
      </div>

      {/* FAQ 列表 */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <FAQAccordion items={parentFAQs} />
      </div>

      {/* 底部提示 */}
      <div className="max-w-2xl mx-auto px-4 pb-4">
        <div className="bg-orange-50 rounded-xl p-4 text-sm text-orange-700">
          <p className="font-medium mb-1">温馨提示</p>
          <p>如有任何疑问，请联系平台教务，我们将竭诚为您服务。</p>
        </div>
      </div>

      {/* 返回首页按钮 */}
      <div className="max-w-2xl mx-auto px-4 pb-8">
        <Link
          href="/"
          className="block w-full text-center bg-orange-500 text-white font-medium py-3 rounded-xl hover:bg-orange-600 transition-colors"
        >
          返回首页
        </Link>
        {/* 家长常常是从群里直接点进这一页的，没有法律入口就是死角 */}
        <div className="mt-4 flex justify-center gap-4 text-xs text-gray-400">
          <Link href="/terms" className="hover:text-gray-600">用户协议</Link>
          <Link href="/privacy" className="hover:text-gray-600">隐私政策</Link>
          <Link href="/report" className="hover:text-gray-600">投诉举报</Link>
        </div>
      </div>
    </main>
  )
}
