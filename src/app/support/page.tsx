import Link from "next/link";

const faqItems = [
  "Q: GatherUp 是什么？ / What is GatherUp? A: GatherUp 是线下活动管理与票务协作工具，不是网页壳应用。",
  "Q: 如何处理退款？ / How are refunds handled? A: 退款规则由活动组织者定义并执行，平台提供记录与通知流程。",
  "Q: 为什么收集推送 token？ / Why collect push tokens? A: 用于活动提醒、订单状态与退款进度等通知发送。"
];

export default function SupportPage() {
  return (
    <div className="legal-doc">
      <header>
        <h1 className="apple-title">支持与反馈 / Support</h1>
        <p className="legal-intro">
          如需帮助、提交反馈或咨询隐私/条款问题，请通过以下方式联系我们。For support, feedback, and policy questions, contact us below.
        </p>
      </header>

      <section>
        <h2>联系方式 / Contact</h2>
        <ul>
          <li>支持邮箱（占位）: support@gatherup.app</li>
          <li>Support email (placeholder): support@gatherup.app</li>
        </ul>
      </section>

      <section>
        <h2>FAQ</h2>
        <ul className="faq-list">
          {faqItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>反馈入口 / Feedback</h2>
        <div className="feedback-box">
          <p className="subtle">
            请发送邮件至 <strong>support@gatherup.app</strong>，标题建议使用“GatherUp Feedback”。你也可以附上设备型号、系统版本和复现步骤。
          </p>
          <p className="subtle">
            Please email <strong>support@gatherup.app</strong> with subject “GatherUp Feedback”, and include device model, OS version, and reproduction steps.
          </p>
        </div>
      </section>

      <footer>
        <Link className="legal-link" href="/privacy">
          隐私政策
        </Link>
        <span className="subtle"> · </span>
        <Link className="legal-link" href="/terms">
          服务条款
        </Link>
      </footer>
    </div>
  );
}