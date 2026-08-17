import Link from "next/link";

const lastUpdated = "2026-08-17";

const sections = [
  {
    title: "我们收集哪些数据 / What we collect",
    items: [
      "我们会收集邮箱、姓名、支付凭证照片以及设备推送 token（APNs token）。",
      "We collect email address, display name, payment proof images, and device push tokens (APNs token).",
      "我们还会记录必要的账号与订单操作日志，用于安全审计和纠纷处理。",
      "We also keep essential account/order operation logs for security audit and dispute handling."
    ]
  },
  {
    title: "数据用途 / How we use data",
    items: [
      "用于账号认证、登录会话维护和账号安全。",
      "Used for account authentication, session management, and account security.",
      "用于活动管理、报名订单处理、退款协同和通知发送。",
      "Used for event operations, registration/order handling, refund coordination, and notifications.",
      "用于推送服务（活动提醒、订单状态更新、退款进度等）。",
      "Used for push services, such as event reminders, order updates, and refund status."
    ]
  },
  {
    title: "数据存储与保留 / Storage and retention",
    items: [
      "GatherUp 使用 Supabase 托管数据库、身份认证和文件存储。",
      "GatherUp uses Supabase-managed infrastructure for database, auth, and file storage.",
      "支付凭证照片存储在受访问策略保护的私有存储桶中。",
      "Payment proof images are stored in private buckets protected by access policies.",
      "账号删除后将进入 30 天软删除保留期，期满后执行永久清除。",
      "After account deletion request, data enters a 30-day soft-delete period before permanent purge."
    ]
  },
  {
    title: "第三方服务 / Third-party services",
    items: [
      "Supabase Auth：用于邮箱/Apple 登录后的账号认证与会话管理。",
      "Supabase Auth: used for account authentication and session management after email/Apple sign-in.",
      "Sign in with Apple：用于 Apple 账号快捷登录。",
      "Sign in with Apple: used for Apple account sign-in.",
      "APNs（Apple Push Notification service）：用于发送 iOS 推送通知。",
      "APNs (Apple Push Notification service): used for iOS push notifications."
    ]
  },
  {
    title: "你的权利 / Your rights",
    items: [
      "你可以查看、修改并申请删除你的个人数据。",
      "You may access, correct, and request deletion of your personal data.",
      "你可以在 App 内设置页面发起账号删除流程。",
      "You can initiate account deletion from in-app settings.",
      "如需导出或进一步处理你的数据，请通过支持渠道联系我们。",
      "For data export or special handling requests, please contact support."
    ]
  },
  {
    title: "联系我们 / Contact",
    items: [
      "联系邮箱（占位）：privacy@gatherup.app",
      "Contact email (placeholder): privacy@gatherup.app",
      "若你对隐私政策有疑问，可通过 /support 页面提交反馈。",
      "If you have privacy questions, submit feedback via /support."
    ]
  }
];

export default function PrivacyPage() {
  return (
    <div className="legal-doc">
      <header>
        <h1 className="apple-title">隐私政策</h1>
        <p className="subtle">最近更新：{lastUpdated}</p>
        <p className="legal-intro">
          本政策说明 GatherUp 在账号认证、活动管理与通知服务中如何处理个人数据。This policy explains how GatherUp handles
          personal data for account authentication, event operations, and notifications.
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
        <Link className="legal-link" href="/terms">
          查看服务条款
        </Link>
      </footer>
    </div>
  );
}
