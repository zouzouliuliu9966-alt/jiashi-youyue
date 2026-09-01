import type { Metadata } from 'next'
import LegalPage, { Section, Highlight } from '@/components/LegalPage'
import { LEGAL, COLLECTED } from '@/lib/legal'

export const metadata: Metadata = {
  title: '隐私政策',
  description: '家师有约隐私政策：收集哪些信息、用在哪里、存在哪里、怎么删除。',
}

export default function PrivacyPage() {
  return (
    <LegalPage title="隐私政策" subtitle={`${LEGAL.platform} · ${LEGAL.effectiveDate} 生效`}>
      <div className="bg-white rounded-2xl p-5 text-xs text-gray-600 leading-relaxed">
        <p>
          {LEGAL.operator}（以下称「我们」）非常重视您和孩子的个人信息。本政策说明我们收集哪些信息、
          用来做什么、存在哪里、您怎么查询和删除。请在提交预约或注册前阅读。
        </p>
      </div>

      <Section n="一" title="我们收集哪些信息">
        <p className="font-medium text-gray-800">家长提交预约时：</p>
        <ul className="list-disc pl-4 space-y-1">
          {COLLECTED.parent.map(x => <li key={x}>{x}</li>)}
        </ul>
        <p className="font-medium text-gray-800 pt-2">老师注册与接单时：</p>
        <ul className="list-disc pl-4 space-y-1">
          {COLLECTED.teacher.map(x => <li key={x}>{x}</li>)}
        </ul>
        <p className="font-medium text-gray-800 pt-2">其他情形：</p>
        <ul className="list-disc pl-4 space-y-1">
          {COLLECTED.other.map(x => <li key={x}>{x}</li>)}
        </ul>
        <p className="pt-2">
          本站不通过网页收集身份证号、银行卡号、人脸信息，也不读取您的通讯录、相册或位置。
          教务在核验老师教学经历时，可能通过微信请您出示教师资格证或在职证明查看，
          我们只做查看核对，不在系统中留存证件照片或证件号码。
        </p>
      </Section>

      <Section n="二" title="关于未成年人信息">
        <Highlight>
          <p className="font-medium mb-1">这部分信息属于敏感个人信息，请您重点阅读本条。</p>
          <p>
            预约表单里的「学生年级」「学生情况」涉及未成年人。
            请由孩子的监护人本人填写并提交，且只填写撮合辅导所必需的内容，
            不要填写与学习无关的健康状况、家庭隐私等信息。
          </p>
          <p className="mt-1">
            <span className="font-medium">为什么必须收集</span>：不知道年级和学习情况，
            我们无法判断该找哪位老师，匹配无法进行。
            <span className="font-medium">可能的影响</span>：这部分内容会被教务查看，
            并在老师接单后提供给该位老师。
          </p>
          <p className="mt-1">
            <span className="font-medium">请由监护人本人提交预约。</span>
            提交即表示您确认自己是该学生的监护人（或已获监护人同意），
            并同意我们按本政策处理这些必要的学生信息。
            如果您不愿意通过网页填写，可以联系教务了解其他沟通方式。
          </p>
        </Highlight>
        <p>
          预约表单面向学生的监护人，请不要由未成年人本人填写或提交。我们不会将这部分信息用于匹配老师和课时记录之外的任何用途，
          也不会用于任何形式的画像或广告。监护人可随时联系教务要求删除。
        </p>
      </Section>

      <Section n="三" title="这些信息用来做什么">
        <ul className="list-disc pl-4 space-y-1">
          <li>教务与您电话或微信联系，核实需求</li>
          <li>把需求推送给科目、年级、时间、地点匹配得上的老师</li>
          <li>老师支付信息服务费、确认接单后，向该老师展示您的手机号和微信号</li>
          <li>记录课时进度与双方对账信息（课时费不经过平台）</li>
        </ul>
        <p className="pt-2">
          我们不会把您的信息用于广告推送，不出售、不出租给任何第三方。老师能在什么时候看到您的联系方式，以第四条为准。
        </p>
      </Section>

      <Section n="四" title="谁会看到您的信息">
        <ul className="list-disc pl-4 space-y-1">
          <li><span className="font-medium text-gray-800">教务</span>：能看到全部预约信息，用于核实和派单</li>
          <li>
            <span className="font-medium text-gray-800">您预约的那位老师</span>：
            他在教师端看到您这条需求时看不到联系方式；
            只有在他支付信息服务费、教务确认收款后，需求详情里才会显示您的手机号和微信号。
          </li>
          <li>
            <span className="font-medium text-gray-800">教务已为您安排课程的老师</span>：
            一旦教务为您和某位老师建立了课时记录（通常在双方已确定合作之后），
            该老师就能在其教师端的课时记录里看到您的手机号和微信号，用于约课和对账。
            <span className="font-medium text-gray-800">这一步不以他是否支付过信息服务费为前提</span>，请知悉。
          </li>
          <li><span className="font-medium text-gray-800">其他老师</span>：看不到您的联系方式</li>
        </ul>
        <p className="pt-2 font-medium text-gray-800">受托处理方：</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <span className="font-medium text-gray-800">腾讯（企业微信）</span>：
            您提交预约后，系统会把这条需求（含您的手机号、微信号、上课地址、学生情况）
            推送到教务的企业微信工作群，便于教务及时跟进。投诉举报的内容与联系方式同样会推送到该群。
          </li>
        </ul>
        <p className="pt-2">
          除上述受托处理方、法律法规要求或司法机关依法调取外，
          我们不向其他机构或个人提供您的信息，也不出售、不出租。
        </p>
      </Section>

      <Section n="五" title="信息会传输到境外（重要）">
        <Highlight>
          <p className="font-medium mb-1">您提交的信息会被传输并存储至中华人民共和国境外。</p>
          <p>
            本站的数据库、文件存储和服务端程序都由境外服务商提供，
            您填写的手机号、微信号、上课地址、学生情况在提交时即传输至境外并保存在那里。
          </p>
          <p className="mt-1">
            提交预约或注册教师账号，即表示您已知晓并同意这一点。
            需要说明的是：改用企业微信跟教务沟通也<span className="font-medium">不能完全避免出境</span>——
            教务仍需把匹配所需的信息录入系统才能派单。您不同意出境的，我们无法为您提供撮合服务。
          </p>
        </Highlight>

        <p className="font-medium text-gray-800 pt-1">境外接收方与处理方式：</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>
            <span className="font-medium text-gray-800">Supabase Inc.</span>（数据库、账号认证与头像文件存储）——
            处理目的：存放预约信息、老师资料与课时记录，以及老师账号的登录认证；
            处理方式：数据库存储与读取、密码加密保存与校验、图片文件存储；
            涉及信息种类：家长预约信息、老师资料与账号信息、课时记录
            （<span className="font-medium">投诉举报的内容不写入这里</span>）。
            行使权利与联系方式见 supabase.com/privacy
          </li>
          <li>
            <span className="font-medium text-gray-800">Vercel Inc.</span>（网站与服务端程序托管）——
            处理目的：运行网站、处理您提交的请求；处理方式：请求转发与临时处理，不长期留存业务数据；
            涉及信息种类：您提交表单时传输的全部内容及访问日志。
            行使权利与联系方式见 vercel.com/legal/privacy-policy
          </li>
        </ul>
        <p>
          您也可以直接联系我们（教务企业微信 <span className="font-medium text-orange-600">{LEGAL.contactWecom}</span>），
          由我们代为向上述接收方转达您的查询、更正、删除请求。
        </p>
      </Section>

      <Section n="六" title="保存多久">
        <p>我们在实现上述目的所必需的期限内保存您的信息。目前的清理目标是：</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>未成交的预约信息：自提交起 6 个月</li>
          <li>已成交的课时与缴费记录：自最后一次课程起 2 年（对账与纠纷处理需要）</li>
          <li>老师账号信息：账号存续期间</li>
        </ul>
        <Highlight>
          需要如实告知您：目前到期清理由教务人工执行，系统没有自动删除程序，
          实际清理时间可能晚于上述期限。您希望尽快删除的，请直接联系教务，
          我们按下一条的流程处理。
        </Highlight>
      </Section>

      <Section n="七" title="您的权利：查询、更正、删除">
        <p>
          您可以随时要求我们：告诉您我们存了您哪些信息、更正其中不准确的部分、
          删除您的信息、注销老师账号。
        </p>
        <p>
          方式：加教务企业微信 <span className="font-medium text-orange-600">{LEGAL.contactWecom}</span>
          （{LEGAL.contactHours}）说明诉求。我们会先核验您确实是信息本人（例如核对提交时留的手机号），
          核验通过后 <span className="font-medium">15 个工作日内</span>处理完毕并回复您。
        </p>
        <p>
          法律法规规定的保存期限未届满，或删除会影响正在进行的纠纷处理的，
          我们会停止除存储和必要安全保护外的处理，并向您说明原因。
        </p>
        <p>
          我们拒绝您的请求的，会说明理由。您对处理结果不满意的，
          可以通过<span className="font-medium text-gray-800">投诉举报</span>入口反馈，
          也可以依法向有关部门投诉或向人民法院提起诉讼。
        </p>
        <p>删除后我们无法再为您派单或提供课时记录查询，请知悉。</p>
      </Section>

      <Section n="八" title="本机存储">
        <p>
          为了让您不用反复输入，我们会在您自己的浏览器里存少量数据：
          家长端存查询课时用的手机号；教师端存登录标识和您的称呼；
          填写预约表单时，为防止您点开协议后内容丢失，会临时暂存您已填的内容（含手机号、微信号、上课地址、学生情况）。提交成功后立即清除；若您填了但没有提交，这份暂存会保留到您关闭该浏览器标签页为止。
        </p>
        <p>
          这些数据只在您的设备上，清除浏览器数据即可删除。我们不使用第三方广告追踪或统计分析工具。
        </p>
      </Section>

      <Section n="九" title="本政策的修改">
        <p>
          本政策如有实质性修改，我们会更新页面顶部的生效日期。涉及信息用途或出境范围变化的，
          会重新征求您的同意。
        </p>
      </Section>
    </LegalPage>
  )
}
