import { AdminEventReviewPanel } from "@/components/admin-event-review-panel";
import { AdminVerificationReviewPanel } from "@/components/admin-verification-review-panel";

export default function AdminPage() {
  return (
    <>
      <section className="page-header">
        <div>
          <h1 className="apple-title">审核工作台</h1>
          <p className="apple-sub">处理活动审核和主办认证审核。</p>
        </div>
      </section>

      <section className="admin-panel-grid">
        <AdminEventReviewPanel />
        <AdminVerificationReviewPanel />
      </section>
    </>
  );
}
