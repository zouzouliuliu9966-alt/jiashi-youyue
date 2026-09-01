import type { Metadata } from 'next'
import LegalPage, { Section } from '@/components/LegalPage'
import ReportForm from '@/components/ReportForm'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: '投诉举报',
  description: '家师有约投诉举报入口：老师资料造假、信息泄露、私下交易等问题的反馈通道。',
}

export default function ReportPage() {
  return (
    <LegalPage title="投诉举报" subtitle={LEGAL.platform}>
      <div className="bg-white rounded-2xl p-5 text-xs text-gray-600 leading-relaxed">
        <p>
          发现老师或家长有违规行为，或对平台本身有意见，都可以在这里反馈。
          教务在 <span className="font-medium text-gray-800">3 个工作日内首次响应</span>；核实完成的时间取决于具体情况，我们会把进展告诉您。
        </p>
        <p className="mt-2">
          紧急情况直接加教务企业微信
          <span className="font-medium text-orange-600"> {LEGAL.contactWecom} </span>
          （{LEGAL.contactHours}），比表单快。
        </p>
      </div>

      <ReportForm />

      <Section n="附" title="我们会怎么处理">
        <ul className="list-disc pl-4 space-y-1">
          <li>核实情况，必要时联系双方了解</li>
          <li>属实的，视情节采取提醒、下架展示、退还费用、注销账号等措施</li>
          <li>您留了联系方式的，把处理结果回复您</li>
          <li>涉及人身安全或财产损失的，建议同时报警，我们配合提供订单记录</li>
        </ul>
      </Section>
    </LegalPage>
  )
}
