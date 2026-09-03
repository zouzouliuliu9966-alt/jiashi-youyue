import type { Metadata } from 'next'
import Link from 'next/link'
import LegalPage, { Section, Highlight } from '@/components/LegalPage'
import { LEGAL } from '@/lib/legal'

export const metadata: Metadata = {
  title: '用户协议',
  description: '家师有约用户协议：平台做什么、怎么收费、双方责任边界。',
}

export default function TermsPage() {
  return (
    <LegalPage title="用户协议" subtitle={`${LEGAL.platform} · ${LEGAL.effectiveDate} 生效`}>
      <div className="bg-white rounded-2xl p-5 text-xs text-gray-600 leading-relaxed">
        <p>
          本协议是您与 {LEGAL.operator} 之间就使用 {LEGAL.platform} 服务达成的约定。
          您提交预约或注册教师账号，即表示已阅读并同意本协议。
        </p>
      </div>

      <Section n="一" title="平台做什么，不做什么">
        <p>
          {LEGAL.platform} 是<span className="font-medium text-gray-800">信息撮合平台</span>：
          教务核实家长需求、匹配并推荐老师、协助双方建立联系、管理课时订单。
        </p>
        <Highlight>
          平台不是培训机构，与老师之间不是雇佣关系。
          实际授课由老师与家长直接建立服务关系，教学内容、上课时间地点、课时费收付方式由双方自行商定。
        </Highlight>
      </Section>

      <Section n="二" title="怎么收费">
        <ul className="list-disc pl-4 space-y-1">
          <li><span className="font-medium text-gray-800">家长：全程免费</span>。平台不向家长收取任何费用</li>
          <li><span className="font-medium text-gray-800">老师：注册、展示、查看需求免费</span>；仅在决定接某一单、需要获取家长联系方式时，支付一次信息服务费，金额等于该年级的一节课时费，接单前会明确告知</li>
          <li><span className="font-medium text-gray-800">平台不从课时费中抽成</span>。课时费由老师自行定价，全额归老师</li>
        </ul>
        <Highlight>
          <p className="font-medium mb-1">课时费由家长直接支付给老师，不经过平台。</p>
          <p>
            平台不代收、不代管、不代付任何课时费，也不接受任何形式的预付款充值。
            平台内的课时记录仅用于双方对账和确认课程进度，不代表平台持有款项。
          </p>
        </Highlight>
        <p className="pt-2">
          <span className="font-medium text-gray-800">信息服务费退还规则</span>：老师接单后，
          如因家长方原因未能实际开课（家长失联、临时取消、需求与描述不符等），
          老师联系教务说明情况，教务核实后<span className="font-medium text-gray-800">全额退还</span>该笔信息服务费。
          教务核实后<span className="font-medium text-gray-800">当个工作日内</span>处理，人工转回（非原路退款）。
        </p>
      </Section>

      <Section n="三" title="家长的义务">
        <ul className="list-disc pl-4 space-y-1">
          <li>提供真实的联系方式和学生情况，不得虚构需求</li>
          <li>提交涉及学生的信息前，确认自己是监护人或已获监护人同意</li>
          <li>与老师商定的课时费，按约定支付</li>
        </ul>
      </Section>

      <Section n="四" title="老师的义务">
        <ul className="list-disc pl-4 space-y-1">
          <li>如实填写教龄、任教经历、资质，配合教务核验</li>
          <li>不得将家长联系方式转给第三方，不得用于招生、推销等接单以外的用途</li>
          <li>不得诱导家长绕开平台与其他老师私下交易</li>
          <li>
            您承诺您承接的辅导不违反您所在单位的规定及教育主管部门的相关要求。
            平台有权要求您提供相应说明，并对不符合要求的账号作下架处理。
          </li>
        </ul>
        <Highlight>
          资料严重不实（伪造教龄、冒用他人资质等）的，平台有权下架展示、终止服务，
          且不退还该次已缴纳的信息服务费。请如实填写。
        </Highlight>
      </Section>

      <Section n="五" title="责任边界">
        <Highlight>
          <p className="mb-1">本节是关于责任划分的重要条款，请重点阅读。</p>
          <p>
            平台<span className="font-medium">不是授课服务的提供方</span>，不直接承担教学服务的履行责任。
            平台不对教学效果、成绩提升作任何承诺或保证。
          </p>
          <p className="mt-1">
            授课过程中发生的教学纠纷、财物纠纷，由老师与家长依法自行解决；
            平台应任一方请求提供其掌握的沟通与订单记录以协助厘清事实，并可协调更换老师。
          </p>
          <p className="mt-1">
            <span className="font-medium">法律规定平台应当承担责任的情形，平台依法承担</span>，
            本协议不排除、不限制您依法享有的权利。
          </p>
          <p className="mt-1">
            因不可抗力，或非因平台原因、且平台无法合理控制的第三方服务中断导致服务暂停的，平台在法律允许的范围内承担相应责任，并尽快恢复服务；法律规定平台应当承担责任的除外。
          </p>
        </Highlight>
      </Section>

      <Section n="六" title="账号规则">
        <p>老师账号以手机号注册，请自行保管密码。</p>
        <Highlight>
          <span className="font-medium">通过您的账号和密码进行的操作，一般视为您本人的行为。</span>
          发现账号异常请立即联系教务，我们会协助冻结并核实；
          有证据表明非您本人操作且不可归责于您的，不由您承担相应后果。
        </Highlight>
        <Highlight>
          出现资料造假、泄露家长信息、恶意刷单等情形的，平台有权下架您的展示、
          停止向您推送需求并终止服务。您也可以随时联系教务要求注销账号，
          注销后的信息处理见<Link href="/privacy" className="font-medium underline">《隐私政策》</Link>。
        </Highlight>
      </Section>

      <Section n="七" title="个人信息">
        <p>
          我们如何处理您和孩子的信息，见
          <Link href="/privacy" className="text-orange-600 font-medium">《隐私政策》</Link>。
          其中<span className="font-medium text-gray-800">信息存储在境外服务器</span>一节请务必阅读。
        </p>
      </Section>

      <Section n="八" title="投诉与争议">
        <p>
          对老师、家长或平台本身有投诉的，走
          <Link href="/report" className="text-orange-600 font-medium">投诉举报</Link>入口，
          我们在 3 个工作日内首次响应。
        </p>
        <Highlight>
          本协议适用中华人民共和国法律。双方协商不成的，
          可提交平台运营方所在地（江苏省南京市）有管辖权的人民法院解决；
          您也可以依法向消费者协会或有关行政部门投诉。
        </Highlight>
      </Section>
    </LegalPage>
  )
}
