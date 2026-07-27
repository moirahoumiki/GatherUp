# GatherUp 关键事件通知覆盖矩阵

> 更新时间：2026-07-27。本文盘点所有业务事件的通知覆盖情况，并记录本次补全前后的对比。

## 通知架构现状

1. **站内通知**：各业务原子 RPC（`supabase/migrations/20260705000001_initial_schema.sql`）在事务内直接向 `notification_deliveries` 插入 `channel='in_app', status='sent'` 记录，前端铃铛实时可见。
2. **邮件镜像**：DB 触发器 `notification_deliveries_mirror_email`（`supabase/migrations/20260705000101_email_notifications.sql`）把每条 in_app 通知镜像成一条 `channel='email', status='pending'` 记录（收件人无邮箱则跳过）。
3. **邮件发送**：
   - **即时发送（本次新增）**：强时效事件的 API 路由在业务成功后调用 `sendInstantEmailNotifications()`（`src/lib/server/instant-email.ts`），立即用 Resend 发送对应的 pending 邮件镜像；发送成功标记 `sent`，失败保持 `pending` 留给 cron 兜底。中文文案由 `src/domain/notification-emails.ts` 生成，覆盖原镜像的英文标题/正文。
   - **cron 兜底（本次接入）**：每天 03:00 的 `/api/jobs/run` 现在会调用 `processPendingEmailNotifications()` 扫描剩余 pending 邮件批量补发。
   - **手动触发**：平台管理员可调 `/api/notifications/send-email` 手动清空 pending 队列（原有能力，保留）。

## 事件 × 渠道覆盖矩阵

| # | 业务事件 | 触发点 | 站内通知 | 邮件（改造前） | 邮件（改造后） | 时效等级 |
|---|---|---|---|---|---|---|
| 1 | **候补邀请（名额释放）** | `POST /api/waitlist/invite` → `invite_waitlist_entry_atomic` | ✅ `waitlist_invited` | ⚠️ pending 镜像，最长等 24h cron | ✅ **路由内即时发送**，失败落 pending 兜底 | 🔴 强（邀请有过期时间） |
| 2 | **候补转正成功** | `POST /api/waitlist/convert` → `convert_waitlist_entry_atomic` | ✅ `waitlist_converted` | ⚠️ 同上 | ✅ 即时发送 | 🔴 强 |
| 3 | **报名创建（待付款/免费直接确认）** | `POST /api/orders` → `create_registration_atomic` | ✅ `registration_awaiting_payment` / `registration_confirmed` | ⚠️ 同上 | ✅ 即时发送 | 🟡 中高（付款有时限） |
| 4 | **报名确认（付款审核通过）** | `POST /api/orders/review` → `review_payment_atomic` | ✅ `registration_confirmed` | ⚠️ 同上 | ✅ 即时发送 | 🔴 强 |
| 5 | **付款凭证被驳回** | `POST /api/orders/review` → `review_payment_atomic` | ✅ `payment_rejected` | ⚠️ 同上 | ✅ 即时发送（需限期重传） | 🔴 强 |
| 6 | **退款审核通过/拒绝** | `POST /api/orders/refund/review` → `review_refund_request_atomic` | ✅ `refund_approved` / `refund_rejected` | ⚠️ 同上 | ✅ 即时发送 | 🔴 强 |
| 7 | **退款转账凭证上传** | `POST /api/orders/refund/proof` → `record_refund_proof_atomic` | ✅ `refund_proof_uploaded` | ⚠️ 同上 | ✅ 即时发送（提醒参与者确认到账） | 🟡 中高 |
| 8 | **退款争议裁定** | `POST /api/orders/refund/dispute` → `resolve_refund_dispute_atomic` | ✅ `refund_confirmed` / `refund_proof_uploaded` | ⚠️ 同上 | ✅ 即时发送 | 🟡 中高 |
| 9 | **活动重要信息变更（时间/地点/容量等）** | `POST /api/events/update` | ❌ **无**（改造前仅创建平台复审请求） | ❌ 无 | ✅ **新增**：向全部有效报名者插入 `event_updated` 站内通知 + 即时邮件 | 🔴 强 |
| 10 | 加入候补队列 | `POST /api/waitlist` → `join_waitlist_atomic` | ✅ `registration_waitlisted` | ⚠️ cron 兜底 | ⚠️ cron 兜底（每日必达，非强时效） | 🟢 弱 |
| 11 | 付款凭证提交（通知组织者） | `submit_payment_proof_atomic` | ✅ `payment_proof_submitted` | ⚠️ cron 兜底 | ⚠️ cron 兜底 | 🟢 弱（组织者在后台处理） |
| 12 | 退款申请提交（通知组织者/财务） | `POST /api/orders/refund` → `request_refund_atomic` | ✅ `refund_started` | ⚠️ cron 兜底 | ⚠️ cron 兜底 | 🟢 弱 |
| 13 | 参与者确认退款到账（通知组织者） | `POST /api/orders/refund/confirm` → `confirm_refund_receipt_atomic` | ✅ `refund_confirmed` / `refund_disputed` | ⚠️ cron 兜底 | ⚠️ cron 兜底 | 🟢 弱 |
| 14 | 座位确认 | `POST /api/seats/confirm` → `confirm_seat_assignment_atomic` | ✅ `seat_confirmed` | ⚠️ cron 兜底 | ⚠️ cron 兜底 | 🟢 弱 |
| 15 | 签到完成 | `POST /api/orders/verify` → `check_in_order_atomic` | ✅ `check_in_confirmed` | ⚠️ cron 兜底 | ⚠️ cron 兜底 | 🟢 弱（人已在现场） |
| 16 | 协作组织者邀请/响应/移除 | `POST /api/events/organizers*` → 对应 RPC | ✅ `event_organizer_*` | ⚠️ cron 兜底 | ⚠️ cron 兜底 | 🟢 弱 |
| 17 | 组织者公告 | `POST /api/announcements` | ✅ 公告通知 | ⚠️ cron 兜底 | ⚠️ cron 兜底 | 🟢 弱 |
| 18 | 候补邀请过期 | cron `expire_waitlist_invitations` | ✅ 站内通知 | ⚠️ cron 兜底 | ⚠️ cron 兜底（下一轮 cron 补发） | 🟢 弱（已过期，无行动价值） |
| 19 | 活动取消 | 无独立路由（`event_status` 含 `cancelled`，但当前无 API 把活动置为 cancelled） | ❌ | ❌ | ❌（**已知缺口**，见下） | 🔴 强 |

## 改造内容摘要

### 新增模块

| 文件 | 说明 |
|---|---|
| `src/domain/notification-emails.ts` | 强时效事件的中文邮件文案模板（含活动名 / 活动时间 / 下一步动作），纯函数便于测试 |
| `src/lib/server/instant-email.ts` | `sendInstantEmailNotifications()`：查询近 15 分钟内匹配模板的 pending 邮件镜像 → 覆写中文文案 → Resend 即时发送 → 成功标 `sent`、失败留 `pending` 由 cron 重发；`notifyEventParticipantsOfImportantChange()`：活动重要变更时给全部有效报名者补站内通知 + 即时邮件。两者均不抛异常，不影响业务主流程 |

### 路由改动

| 路由 | 改动 |
|---|---|
| `src/app/api/waitlist/invite/route.ts` | 成功后即时发送 `waitlist_invited` 邮件 |
| `src/app/api/waitlist/convert/route.ts` | 成功后即时发送 `waitlist_converted` 邮件 |
| `src/app/api/orders/route.ts` | 成功后即时发送 `registration_awaiting_payment` / `registration_confirmed` 邮件 |
| `src/app/api/orders/review/route.ts` | 成功后即时发送 `registration_confirmed` / `payment_rejected` 邮件 |
| `src/app/api/orders/refund/review/route.ts` | 成功后即时发送 `refund_approved` / `refund_rejected` 邮件 |
| `src/app/api/orders/refund/proof/route.ts` | 成功后即时发送 `refund_proof_uploaded` 邮件 |
| `src/app/api/orders/refund/dispute/route.ts` | 成功后即时发送 `refund_confirmed` / `refund_proof_uploaded` 邮件 |
| `src/app/api/events/update/route.ts` | 发布后敏感字段变更时，向有效报名者发 `event_updated` 站内通知 + 即时邮件 |
| `src/app/api/jobs/run/route.ts` | 每日 cron 追加 `processPendingEmailNotifications()`，兜底补发全部剩余 pending 邮件 |

### 可靠性设计

- **即时优先，cron 兜底**：路由内 Resend 调用失败（或未配置 Resend）时，delivery 保持 `pending`，由每日 cron 或管理员手动触发补发，不丢通知。
- **不阻塞业务**：`sendInstantEmailNotifications` 全程 try/catch，邮件问题不会导致候补邀请、审核等业务接口失败。
- **幂等保护**：即时发送只处理近 15 分钟内创建的 pending 行且单次上限 20 条，避免误发历史积压或放大故障。

## 已知缺口（后续跟进）

1. **活动取消**：当前没有把活动置为 `cancelled` 的 API 路由，因此无法在取消时通知参与者。待活动取消功能落地时，复用 `notifyEventParticipantsOfImportantChange` 的同款路径即可。
2. **弱时效事件邮件时延**：矩阵中 🟢 事件仍依赖每日 cron（03:00），如需更低时延可将 cron 频率调高（`vercel.json`）。
3. **订阅管理**：参与者暂无法关闭邮件通知，属产品层待规划能力。
