'use client'

import { useState } from 'react'
import Link from 'next/link'

type FAQItem = { q: string; a: string | React.ReactNode }

const parentFAQs: FAQItem[] = [
  {
    q: '老师怎么收费？',
    a: '老师按自己的标价收取课时费。平台只做免费匹配，不向家长收取任何中介费、匹配费。教务会根据您的需求严选老师，第一节课即为正式课，按老师标价收费。',
  },
  {
    q: '课时费怎么付？',
    a: '支持两种方式，由您选择：① 直接转账给老师（微信/支付宝/现金）；② 付到平台账户，由平台代为转给老师。具体方式可在教务匹配后与教务沟通确认。',
  },
  {
    q: '不满意怎么办？',
    a: '对老师教学不满意，可联系教务，我们会免费协调更换其他老师（同一家庭最多 2 次）。已上课程的课时费按实际正常结算，不予退还。',
  },
  {
    q: '课时费参考标准是多少？',
    a: 'PRICE_TABLE',
  },
  {
    q: '平台有什么保障？',
    a: '所有老师均经过平台审核，教务全程跟进，课后定期回访。如对老师不满意，教务会协调更换老师，确保为您找到合适的师资。',
  },
]

const teacherFAQs: FAQItem[] = [
  {
    q: '怎么加入平台？',
    a: '点击"教师注册"提交资料，平台审核通过后即可展示接单。',
  },
  {
    q: '怎么接单？',
    a: '家长预约后，平台推送需求到您的教师端。您查看学生情况后选择接单或婉拒。',
  },
  {
    q: '课时费怎么结算？',
    a: '家长可选择直接转账给您，或付到平台账户由平台转给您。具体结算方式由您与家长沟通确认。',
  },
  {
    q: '平台收取什么费用？',
    a: '平台向老师收取信息服务费（接单后解锁家长联系方式时支付一次），不向家长收取任何费用。具体标准在接单时会明确告知。',
  },
  {
    q: '有什么要求？',
    a: '接单后请在约定时间准时上课，每节课后及时与家长沟通反馈。平台会定期回访家长，保障双方权益。',
  },
]

function PriceTable() {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">一对一辅导</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-orange-50 text-orange-700">
                <th className="text-left py-2 px-3 rounded-tl-lg">年级</th>
                <th className="text-right py-2 px-3 rounded-tr-lg">价格 (2h)</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">小学</td>
                <td className="text-right py-2 px-3">300 - 500 元</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">初中</td>
                <td className="text-right py-2 px-3">400 - 600 元</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">中考冲刺</td>
                <td className="text-right py-2 px-3">500 - 600 元</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">高一高二</td>
                <td className="text-right py-2 px-3">600 - 800 元</td>
              </tr>
              <tr>
                <td className="py-2 px-3">高三</td>
                <td className="text-right py-2 px-3">700 - 1000 元</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">小组课 (2-8人)</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-orange-50 text-orange-700">
                <th className="text-left py-2 px-3 rounded-tl-lg">年级</th>
                <th className="text-right py-2 px-3 rounded-tr-lg">价格 (2h/人)</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">小学</td>
                <td className="text-right py-2 px-3">180 - 220 元</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-3">初中</td>
                <td className="text-right py-2 px-3">240 - 350 元</td>
              </tr>
              <tr>
                <td className="py-2 px-3">高中</td>
                <td className="text-right py-2 px-3">300 - 600 元</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        注：具体价格根据老师资质、科目、距离等因素浮动，以实际沟通为准。
      </p>
    </div>
  )
}

function AccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  const isPriceTable = item.a === 'PRICE_TABLE'

  return (
    <div className="bg-white rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <span className="text-sm font-medium text-gray-800">{item.q}</span>
        <svg
          className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">
          {isPriceTable ? <PriceTable /> : item.a}
        </div>
      </div>
    </div>
  )
}

export default function RulesPage() {
  const [tab, setTab] = useState<'parent' | 'teacher'>('parent')
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = tab === 'parent' ? parentFAQs : teacherFAQs

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  const handleTabChange = (newTab: 'parent' | 'teacher') => {
    setTab(newTab)
    setOpenIndex(null)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部标题栏 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-gray-900">平台规则</h1>
          <p className="text-sm text-gray-500">了解平台服务流程与保障</p>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => handleTabChange('parent')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'parent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            家长须知
          </button>
          <button
            onClick={() => handleTabChange('teacher')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'teacher' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            老师须知
          </button>
        </div>
      </div>

      {/* FAQ 列表 */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-2">
        {faqs.map((item, index) => (
          <AccordionItem
            key={`${tab}-${index}`}
            item={item}
            isOpen={openIndex === index}
            onToggle={() => handleToggle(index)}
          />
        ))}
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
      </div>
    </main>
  )
}
