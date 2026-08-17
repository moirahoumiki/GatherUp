import Link from "next/link";

const lastUpdated = "2026-08-17";

const sections = [
  {
    title: "使用规则 / Usage rules",
    items: [
      "GatherUp 用于线下活动管理、报名与票务协同；禁止用于违法、欺诈或侵犯他人权益的活动。",
      "GatherUp is for offline event operations, registration, and ticket coordination; illegal or abusive use is prohibited.",
      "你应确保注册信息真实有效，并妥善保管登录凭据。",
      "You must provide accurate account information and keep credentials secure."
    ]
  },
  {
    title: "用户责任 / User responsibilities",
    items: [
      "组织者需对活动内容、现场安全、退款规则与履约负责；参与者需遵守活动规则并提供真实报名信息。",
      "Organizers are responsible for event content, onsite safety, refund policies, and fulfillment; participants must follow event rules and provide truthful information.",
      "禁止上传虚假支付凭证、恶意刷单或干扰平台正常运行的行为。",
      "Uploading fake payment proofs, abuse, or disruption of platform operations is prohibited."
    ]
  },
  {
    title: "退款政策说明 / Refund policy",
    items: [
      "各活动退款规则由组织者在活动页说明并执行，GatherUp 提供流程记录与通知能力。",
      "Refund rules are defined and executed by organizers per event; GatherUp provides workflow records and notifications.",
      "GatherUp 不代收活动款项，不提供 IAP；付款通常在线下渠道完成，争议可通过平台投诉流程协助核查。",
      "GatherUp does not process event funds or offer IAP; payments are generally completed offline, and disputes can be escalated via platform support workflow."
    ]
  },
  {
    title: "知识产权 / Intellectual property",
    items: [
      "GatherUp 的应用、商标、界面与系统设计受相关知识产权法律保护。",
      "The GatherUp app, trademarks, UI, and system design are protected by applicable intellectual property laws.",
      "用户提交的活动文案与素材归其依法享有，用户需保证其拥有合法使用权。",
      "Users retain rights to their submitted event content and materials, and must ensure lawful usage rights."
    ]
  },
  {
    title: "免责声明 / Disclaimer",
    items: [
      "GatherUp 为工具平台，不对线下活动执行、场地安全或组织者履约作实质担保。",
      "GatherUp is a tooling platform and does not guarantee offline event execution, venue safety, or organizer performance.",
      "在法律允许范围内，平台不对间接损失、第三方行为或不可抗力导致的损害承担责任。",
      "To the extent permitted by law, the platform is not liable for indirect losses, third-party acts, or force majeure."
    ]
  },
  {
    title: "条款变更与联系 / Updates and contact",
    items: [
      "本条款会根据产品与法规要求更新，更新后在页面标注日期。",
      "These terms may be updated to reflect product or legal changes, with updated date shown on this page.",
      "继续使用 GatherUp 即表示你同意更新后的条款。联系邮箱（占位）：legal@gatherup.app。",
      "By continuing to use GatherUp, you agree to the updated terms. Contact (placeholder): legal@gatherup.app."
    ]
  }
];

export default function TermsPage() {
  return (
    <div className="legal-doc">
      <header>
        <h1 className="apple-title">服务条款</h1>
        <p className="subtle">最近更新：{lastUpdated}</p>
        <p className="legal-intro">
          本条款适用于所有 GatherUp 用户。These terms govern your use of GatherUp for offline event management and ticketing workflows.
        </p>
      </header>

      {sections.map((section, index) => (
        <section key={section.title}>
          <h2>
            {index + 1}. {section.title}
          </h2>
          <ul>
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <footer>
        <Link className="legal-link" href="/privacy">
          查看隐私政策
        </Link>
      </footer>
    </div>
  );
}
