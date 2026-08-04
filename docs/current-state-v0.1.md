# GatherUp v0.1 当前项目总览

## 1. 项目定位

GatherUp 是一个综合线下活动组织平台，不局限于线下观影或生咖。

目标是让活动组织者在同一个平台里完成：

- 活动创建。
- 数调。
- 地点投票。
- 报名和订单编号。
- 付款截图收集。
- 组织者确认付款。
- 付款确认后选座。
- 支出记账和收支统计。
- 发布宣传入口和通知。
- 场地经验查询。
- 参与者历史活动查看。

长期方向是覆盖：

- 同好活动：线下观影、生咖、粉丝聚会。
- 校园活动：社团招新、讲座、比赛。
- 会议会务：论坛、闭门会、品牌活动。
- 好友聚会：聚餐、旅行、私下小聚。
- 工作坊、市集、快闪等其他活动。

## 2. 当前技术状态

当前是 v0.1 前端原型加商业化后端基础接入阶段，并已经从 mock 数据迁移到真实 Supabase 读取和受控写入。商业化 v0.1 的关键产品决策、schema/seed/Storage、服务层契约、静态契约测试、真实 Supabase 只读预检/覆盖率审计、干净 dev/staging Supabase 重建验证、公开活动读取适配、Supabase SSR middleware 鉴权、API Bearer/SSR cookie 双路径鉴权、原子报名 RPC、付款凭证 Storage 上传链路、付款审核、核销、退款、座位锁并发和私有 proof Storage RLS 已经完成真实 Supabase 基线验证。

当前仓库应按两层理解：

- 已实现层：Next.js 前端原型、显式 demo/local 数据流程、公开活动 Supabase 读取适配、Supabase 账号适配、Supabase SSR middleware 路由保护、Bearer/SSR cookie 双路径 API 认证、原子活动/报名订单创建、付款/退款凭证 Storage 上传链路、付款审核、核销、退款、座位锁 RPC、商业化 SQL/Storage、Supabase migrations 基线、Postgres-backed API 限流、文档源头、静态契约测试和真实 Supabase 集成测试。
- 目标层：商业化 v0.1，需要把已验证的后端能力继续接回完整 UI/服务层：活动创建/发布、主办审核工作台、订单详情、退款确认/争议、Dashboard、财务导出、通知外发和更完整的 admin 后台。

前端设计状态：

- 已完成第一阶段视觉系统重构：参与者端使用活动发现型界面，主办端使用数据和行动优先的运营界面，不再让两类用户共用同一套卡片层级。
- 活动广场已增加活动/城市/余位概况、分类视觉和更清晰的搜索筛选层级。
- 主办工作台已收敛为关键指标、运营健康度、筹备行动队列、全部活动表格和按需展开的认证入口，并完成桌面与 390px 移动端预览验收。
- 选座进度改为基于活动已付款人数计算，并限制在 0%-100%，避免订单样本不完整时显示异常百分比。

已使用：

- Next.js App Router。
- TypeScript。
- React。
- 全局 CSS。
- lucide-react 图标。
- mock 数据。
- Supabase JavaScript 客户端依赖。
- Supabase SQL 草案。
- Supabase Storage policy 草案。
- Supabase Auth 适配层。
- Supabase 用户资料同步适配层。
- 商业化 v0.1 PRD。
- 商业化 v0.1 决策日志。
- 商业化 v0.1 服务层契约。
- Auth/schema/Storage 文档和静态契约测试。
- Supabase live project preflight 和只读覆盖率审计日志。
- GitHub 仓库介绍建议。

暂未接入：

- 大部分真实数据库读写。
- 邮箱验证码服务。
- 正式支付。
- 完整 UI 闭环下的端到端用户验收。
- 完整正式权限校验的扩大覆盖：随着新工作流增加继续补 RLS/RPC 集成测试。
- 完整服务端事务/API 的产品层接线：部分核心 RPC 已验证，仍需更多页面和服务层消费。

Supabase live 状态：

- 已恢复 live `gatherup` Supabase 项目。
- 已执行只读 preflight，确认该项目不是空库。
- 已执行只读覆盖率审计，确认该项目是部分初始化库：30 个目标表中已有 15 个，39 个目标 type 中已有 15 个，12 个目标函数中已有 9 个，8 个目标 Storage bucket 均未创建。
- 不能把完整 `supabase/schema.sql` 直接跑到该 live 项目。
- 已创建干净 dev/staging Supabase 项目 `gatherup-commercial-v01-validation`，项目 ref 为 `oxbrxkllftyevlzmiydt`。
- 已在干净 dev/staging 项目重置并执行 `schema.sql`、`seed.sql`、`storage.sql` 和后置 validation scripts。
- `storage.sql` 在真实执行时暴露出旧枚举值、proof 状态推进和 Storage policy 语法/不可变性问题，均已修复并固化到 schema/storage/validation 脚本。
- schema 已补充匿名公开读取授权：匿名用户只能读取公开活动详情所需的 `events`、已发布 `announcements`、参与者可见 `activity_materials`，不能读取报名、付款、退款等敏感表。
- `supabase/validation/06-public-read-grants.sql`、`09-service-role-grants.sql`、`08-create-registration-rpc-contract.sql`、`07-clean-dev-post-execution-summary.sql`、`10-payment-proof-submission-and-storage-immutability.sql`、`11-record-refund-proof-requested-by.sql` 已用于干净 validation 项目补齐并验证数据库状态。
- 2026-06-28 已在 clean validation 项目 `oxbrxkllftyevlzmiydt` 通过真实 RPC/Storage 集成测试：19/19 passed。

真实数据接入状态：

- `/` 活动广场已改为 Server Component，通过 `getPublicEvents()` 优先读取 Supabase `events` 中 `visibility = 'public'` 的活动；只有 Supabase 未配置或显式 `NEXT_PUBLIC_GATHERUP_DEMO_MODE=1` 时回退 mock 数据。配置 Supabase 后，查询失败会记录 `[gatherup:data]` 并返回空状态，不再静默展示假数据。
- `/events/[eventId]` 活动详情已通过 `getPublicEventDetail()` 优先读取 Supabase，可用 UUID 或 `public_code` 查找；未公开但 link-only 的活动由数据库 RLS 控制直链可见。
- Supabase 读取已从公开展示面扩展到核心参与者和主办工作台：公开活动、活动详情、参与者订单、主办首页、活动管理台和财务中心均已有真实读取路径；本地 mock fallback 只用于未配置 Supabase 或显式 demo mode。
- 已新增第一批受控写入/导出 API：活动创建、报名订单、付款审核、核销、名单导出、财务导出。它们要求 Supabase 登录态；主办敏感操作不再信任原型 cookie。
- 活动创建已从 API Route 内串行写入四张表，收口为 `create_event_atomic` 数据库 RPC：活动、owner 协作者、财务设置、可选收款码版本和审计日志在同一事务中生成；API 使用 authenticated Supabase client 调用，不再用 service role 绕过用户身份链。该 migration 已在 clean-dev 执行，匿名拒绝、完整创建、公开编码冲突和非法输入回滚 4 条真实集成用例全部通过；2026-07-19 又以临时真实账号完成浏览器创建并成功进入活动管理台。
- middleware 已迁移到 `@supabase/ssr`：配置 Supabase 后，页面路由通过 `supabase.auth.getUser()` 验证真实 session，并支持 Supabase session cookie refresh；`/api/*` 由各 Route Handler 自己返回 JSON 鉴权结果。
- API Route 认证已统一到底层 helper：外部/API 客户端可继续传 Supabase Bearer token；同源浏览器请求也可使用 Supabase SSR session cookie 获取用户和 authenticated Supabase client。
- API Route 限流已升级为 async 共享入口：配置 `SUPABASE_SERVICE_ROLE_KEY` 时通过 service-role-only `consume_rate_limit` RPC 写入 `api_rate_limits` 表，实现跨 serverless 实例固定窗口限流；未配置或 RPC 临时失败时回退内存限流。
- 已新增 `create_registration_atomic` 数据库 RPC 草案：通过 `public.current_app_user_id()` 获取真实用户，锁定活动行校验容量，用 `event_order_counters.current_number` 原子生成订单号，并在同一事务路径中写入 `registrations`、主参与人和 payment stub。
- `/api/orders` 已改为 authenticated Supabase client 调用 RPC；前端可附带 access token，同源浏览器请求也可走 SSR session cookie，让数据库内的 `auth.uid()` 和 `current_app_user_id()` 可用。
- 已新增 opt-in 真实 Supabase RPC 集成测试入口：`GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=<clean-dev-project-ref> npm run test:integration:rpc` 会创建隔离临时 Auth 用户和活动，验证原子活动创建、原子报名、并发防超卖、并发付款审核、并发核销、并发抢座、退款状态推进、跨实例限流，以及付款/退款凭证 Storage RLS 的跨用户路径隔离、确认后拒绝补传、畸形路径拒绝和对象不可变边界，最后清理测试数据。2026-07-19 已在 `oxbrxkllftyevlzmiydt` 上通过 25/25。
- 已新增 `src/domain/status-machine.ts` 作为第一版统一状态机底座：覆盖报名、付款、退款和签到工作流，并用测试反查 `supabase/schema.sql` 的 enum，防止应用层状态规则和数据库契约分叉。
- 已新增 `src/domain/workflow-events.ts` 作为状态变化事件契约：合法状态跳转可统一派生 `auditAction`、`notificationType`、目标受众和风险级别，为后续通知中心、审计事件和 Dashboard 聚合打底。
- 已新增 `src/domain/notification-queue.ts` 作为通知队列契约：可把 workflow event 转成站内/邮件/微信 channel 的待投递通知项，并提供 `toNotificationDeliveryInsert()` 映射到 Supabase insert payload。
- 已新增 `src/domain/organizer-dashboard-metrics.ts` 作为主办工作台指标口径：从活动、筹备配置和报名订单统一计算待审核付款、签到率、退款风险单、选座进度和已确认收入，并用契约测试保护，避免主办首页继续散落临时统计逻辑。
- `notification_deliveries` 已补齐 `template_key`、`title`、`body`、`metadata`、`read_at` 字段，通知队列内容可以持久化到数据库并支持站内已读状态；当前仍不实际发送外部邮件/微信消息。
- 新增 `/api/notifications`：通过统一 Supabase 认证读取当前用户站内通知和未读数，并通过 `mark_notification_deliveries_read` RPC 标记单条或全部已读，避免给普通用户开放通知正文 update 权限。
- 新增 `NotificationBell` 并接入全局 `AppShell`：Supabase session 用户可在顶栏查看未读角标、打开通知列表并一键全部已读；demo session 下安静隐藏该入口。
- `create_registration_atomic` 现在会在报名创建后写入参与者站内通知：付费订单提示提交付款凭证，免费订单提示报名已确认。
- `payment_proofs_mark_submitted` 触发器现在会在参与者提交付款截图时通知活动主办和具备付款管理权限的协作者，让待审核付款不再只依赖手动刷新发现。
- `review_payment_atomic` 现在会在付款审核通过/驳回的同一事务里写入参与者站内通知，避免订单状态和通知状态分裂。
- `confirm_seat_assignment_atomic` 现在会在参与者确认座位后写入站内通知，保留座位确认结果。
- `check_in_order_atomic` 现在会在现场核销成功后写入参与者站内通知，保留到场确认结果。
- `request_refund_atomic` 现在会在参与者发起退款申请后通知活动主办和具备退款处理权限的协作者，让退款待审核不再依赖手动刷新发现。
- `review_refund_request_atomic` 现在会在退款审核通过/驳回的同一事务里写入参与者站内通知，补齐退款纠纷高发链路的结果告知。
- `record_refund_proof_atomic` 现在会在主办上传退款打款凭证后写入参与者站内通知，提醒用户查看凭证并继续确认收款。
- 付费报名现在拆成三步真实链路：先用 RPC 创建报名订单和 payment stub；再由浏览器使用用户 Supabase session 上传付款截图到私有 `payment-proofs` bucket；最后调用 `/api/orders/payment-proof` 写入 `payment_proofs` 并把订单推进到待审核。
- 新增 `/api/orders/payment-proof`：要求通过统一 Supabase 认证 helper 识别当前用户，验证当前用户拥有该 registration，验证 payment 属于该 registration，并校验 Storage path 必须匹配 `{event_id}/{registration_id}/{payment_id}/{filename}`。
- 付款审核已新增 `review_payment_atomic` RPC 草案：在数据库函数内校验当前用户具备活动付款管理权限，锁定 registration/payment，更新 registration、payment 和 payment_proofs，并写入 `audit_logs`。`/api/orders/review` 已改为 authenticated Supabase client 调用该 RPC。
- 选座已新增第一批 RPC、API 入口和订单详情页真实选座面板：`expire_seat_locks_for_event`、`create_seat_lock_atomic` 和 `confirm_seat_assignment_atomic`，以及 `/api/seats/lock`、`/api/seats/confirm`。它们用于释放过期锁、创建座位锁、确认座位分配；并发抢同一座位已在真实 Supabase 集成测试中通过。
- 核销已新增 `check_in_order_atomic` RPC 草案：现场人员通过 `/api/orders/verify` 提交核销码，数据库函数内校验活动管理权限，更新订单和参与人签到状态，写入 `check_ins` 和 `audit_logs`。
- 活动管理台已新增第一版现场核销面板：主办/现场人员可输入订单号、核销码或 `gatherup://check-in/` 链接，前端通过 Supabase session 调用 `/api/orders/verify`，展示成功人数和最近 10 条本地核销记录；v0.1 暂不接摄像头扫码。
- 退款链路已覆盖申请、审核、凭证上传、参与者确认/争议和主办争议处理：`request_refund_atomic`、`review_refund_request_atomic`、`record_refund_proof_atomic`、`confirm_refund_receipt_atomic`、`resolve_refund_dispute_atomic` 分别驱动对应 API。数据库函数会同步订单/付款/退款状态并写入 `audit_logs`。
- 退款 UI 已接线：参与者订单详情可提交退款原因、确认已收款或提出争议；活动管理台读取本活动 `refund_requests`，主办可同意/拒绝、上传 `refund-proofs/{event_id}/{refund_request_id}/{filename}`，并对争议选择“确认解决”或“重新打款”。
- 协作者邀请已从“直接授权”收紧为“邀请确认”：`event_organizers.status` 区分 `invited`、`active`、`declined`，所有活动管理/编辑/财务/付款/退款权限 helper 只认可 `active` 协作者；`respond_event_organizer_invitation_atomic` 和 `/api/events/organizers/respond` 用于被邀请者接受或拒绝，并写入审计日志和站内通知。
- 主办敏感 API 已从原型 cookie 身份切换到 Supabase Bearer/SSR cookie 统一验证：活动创建、付款审核、核销、名单导出和财务导出不再信任可被客户端伪造的 `gatherup_id` cookie。
- 这些 API/RPC 仍是早期产品集成层，但付款凭证 Storage 链路、付款审核 RPC、座位锁 RPC、核销 RPC、退款申请/审核/凭证 RPC 和 waitlist 加入/邀请/转正 RPC 已经在干净 Supabase 项目中用真实用户 session 通过集成验证；更多 UI 级端到端流程和新增工作流 RLS 仍需要继续补齐。
- 主办公告中心已接入真实发布路径：登录主办通过 `/api/announcements` 写入 `announcements` 表，并由数据库 RLS/权限函数控制是否可编辑活动；外部邮件、短信和微信通知仍是后续 channel 层。
- 主办财务导出已从通用活动管理权限收紧为 finance-level 权限，避免普通协作者导出财务数据。
- 主办财务支出已接入真实写入路径：登录主办或财务协作者通过 `/api/expenses` 写入 `event_expenses`，API 会统一认证、限流、校验 `can_manage_event_finance`，并将支出分类/状态映射到数据库 enum。
- 活动协作者管理已接入真实事务路径：登录主办或具备编辑权限的协作者可在管理台通过 GatherUp ID 添加联合主办、财务、现场协作或只读角色，也可调整角色或移除非主办协作者；API 使用用户 Supabase session 调用 `manage_event_organizer_atomic`，由数据库函数验证 `can_edit_event`、保护 owner、查找用户、写入/更新/删除 `event_organizers`，并在同一事务路径中写入 `audit_logs`。
- 活动管理台已新增审计日志时间线：`getOrganizerEventDetail()` 会读取当前活动最近的 `audit_logs`，页面展示操作类型、风险级别、执行角色、前后快照和原因，让协作者变更、付款审核、退款、候补、核销等关键动作可被主办复盘。
- 活动开放报名后关键字段编辑已接入平台复审触发：当活动处于报名/付款/选座/ready 阶段，主办修改城市、场地、地址、活动时间、报名截止或容量时，`/api/events/update` 会把 `events.review_status` 置为 `pending`，并创建 `review_requests(target_type='event')` 供 `/admin` 活动审核队列处理。
- 收费活动开放报名已新增最小认证和平台审核门槛：`/api/events/publish` 在通过编辑权限后，会检查活动是否有价格或收款码；若是收费活动，则要求活动 owner 的组织者认证状态为 `light_verified` 或 `enhanced_verified`，且没有 `force_review_required` 标记；若活动处于 `pending`、`changes_requested`、`rejected` 或 `suspended` 平台审核状态，也会拒绝开放报名。
- 组织工作台已新增主办认证申请入口：登录用户可以读取自己的 `organizer_verifications` 状态，并通过 `/api/organizer/verification` 提交或更新待审核资料；已通过或暂停状态会被 API 阻止重复提交。
- 平台后台已新增第一版 `/admin` 审核工作台：平台管理员通过 `is_platform_admin()` 校验后，可查看待审核/已驳回主办认证，执行轻量通过、强化通过、驳回或暂停；也可处理活动审核请求，执行通过、要求修改、驳回或暂停，并把主办认证/活动审核决策写入 `audit_logs`。
- Supabase migrations 已建立初始治理入口：`supabase/migrations/20260705000001_initial_schema.sql` 和 `20260705000002_storage.sql` 冻结当前 schema/storage 基线，`20260705000100_api_rate_limits.sql` 增加跨实例限流表与 RPC，`20260717000000_create_event_atomic.sql` 增加原子活动创建事务，`20260719000000_reconcile_event_organizer_lifecycle.sql` 对账较旧 clean-dev 的协作者邀请生命周期 enum/字段，`20260719000100_public_event_registration_counts.sql` 以只读聚合 RPC 提供公开活动已报名人数且不暴露参与者报名行；`tests/migrations-contract.test.mts` 保护迁移命名、基线一致性、权限边界和关键事务写入范围。
- 2026-07-19 已确认此前终端网络失败的实际诱因包含 validation 项目处于暂停状态。项目恢复后，Codex 终端可直连 Supabase；补齐活动创建、跨实例限流和协作者生命周期 schema 对账迁移后，完整真实 RPC/并发/Storage RLS 集成套件通过 25/25。
- 浏览器活动创建冒烟测试曾暴露 `event_organizers` 同时关联成员和邀请人后，PostgREST 无法推断 `users(...)` 嵌套关系；主办数据适配器现显式使用 `event_organizers_user_id_fkey`，新创建活动可正常进入管理台，读取错误也会进入统一数据访问日志而不是静默退化为 404。

## 3. 本地运行

推荐使用 webpack dev 模式，当前比 Turbopack dev 更稳定：

```bash
npm run dev:webpack -- --hostname 127.0.0.1 --port 3000
```

打开：

```text
http://127.0.0.1:3000
```

检查命令：

```bash
npm test
npm run typecheck
npm run build
```

演示账号：

```text
邮箱：miki@gatherup.local
密码：gatherup123
```

## 4. 已完成的前端页面

账号：

- `/login`：登录、注册、验证码、找回入口；未配置 Supabase 时使用本地原型账号，配置后优先走 Supabase Auth。
- `/onboarding`：首次资料补全。
- `/admin`：平台审核工作台，当前覆盖主办认证审核和活动审核请求。
- `/me`：我的活动和账号中心。
- `/me/orders/[orderNumber]`：订单详情。

参与者侧：

- `/`：活动广场。
- `/events/[eventId]`：活动详情，包含当前参与者下一步、已发布通知和活动物料展示。
- `/events/[eventId]/register`：报名、数调、地点投票、付款截图、选座流程原型，支持 `step` 深链进入数调、报名、付款或选座入口。

组织者侧：

- `/organizer`：组织工作台，包含关键运营指标、健康度、筹备行动队列、活动总览、动态主行动入口、付款待处理入口和按需展开的主办认证。
- `/organizer/events/new`：创建活动分步向导，支持本地草稿保存、恢复、清空、草稿数据预览、发布前检查；配置 Supabase 时通过 `/api/events` 创建真实活动，未配置 Supabase 时才保留本地演示记录。
- `/organizer/events/[eventId]`：活动管理台，包含流程进度轨道、动态下一步行动、基础信息编辑、协作者管理、审计日志、宣传发布、通知、数调、地点、付款审核和座位管理模块。
- `/organizer/events/[eventId]/finance`：活动财务中心。

平台公共模块：

- `/venues`：场地情报库。
- `/venues/[venueId]`：场地详情。

## 5. 已确认的商业化 v0.1 方向

账号：

- 不区分参与者账号和组织者账号。
- 同一个账号既可以参与活动，也可以创建活动。
- 邮箱是全球账号底座。
- 邮箱密码和邮箱验证码是第一开发主线。
- 微信登录预留入口和数据模型，商业化正式发布前接入。
- GatherUp ID 是公开用户 ID，用于同行人、现场核验、组织者查询和客服。
- GatherUp ID 最多允许修改两次。
- 昵称允许重复，关键场景必须同时显示 GatherUp ID。

活动：

- 第一优先场景是同好活动：线下观影、生咖、粉丝聚会。
- 新活动默认仅链接可见，不默认进入活动广场。
- 通过链接访问活动详情时，未登录用户可以看到基础详情。
- 报名、订单、付款、选座、退款和投诉必须登录。
- 每个活动有内部 ID 和公开活动 ID。
- 公开活动 ID 用于搜索、分享、现场核对和客服查询。
- 一个活动可以绑定多个组织者。
- 组织者角色包括主办、联合主办、财务、现场协作和只读。
- 活动类型使用“活动场景 + 流程模板 + 自定义标签”。
- 线下观影、生咖不是平台边界，只是同好活动下的细分标签。
- 活动状态使用英文稳定枚举，UI 再映射中文展示。
- 公开且收费活动需要平台审核。
- 收费仅链接活动按金额、新组织者场次和风控规则决定是否审核。

报名和付款：

- 参与者先登录。
- 数调和地点投票是可选模块，不等同于正式报名。
- 活动详情页会根据当前阶段显示数调入口或正式报名入口。
- 报名页支持从宣传链接、订单详情等页面直接进入指定步骤。
- 每条报名生成订单编号。
- 多人报名默认要求同行人 GatherUp ID，组织者可以开启临时同行人。
- 报名后临时锁定名额，默认 30 分钟，可由组织者配置。
- 商业化 v0.1 早期采用主办方自收款，不由平台代收款。
- 活动可配置微信/支付宝等主办方收款码。
- 只有已创建待付款订单的参与者能看到收款码。
- 每个订单记录付款时展示的收款码版本。
- 一个订单可以有多条付款凭证，支持首付、补款和差额处理。
- 组织者审核付款截图，默认只有主办和财务能查看付款截图及审核付款，联合主办需额外授权。
- 必须先付款并被确认，之后才能选座。
- 退款流程需要完整记录申请、审核、线下退款、退款凭证、参与者确认和争议。
- 平台未来可以扩展平台代收款，但第一阶段不托管活动资金。

组织者认证和后台：

- 所有人可以创建免费活动。
- 收费活动需要组织者认证。
- 认证分为未认证、轻量认证、强化认证和暂停。
- 低额度收费上限、新组织者前几场收费活动审核等规则由后台配置。
- 商业化 v0.1 需要最小后台：用户查看、活动查看、组织者认证审核、活动审核、平台配置、投诉/争议和审计日志。
- 第一版后台只有超级管理员，预留运营、风控、财务和客服角色。

发布和通知：

- 组织者可以在宣传发布中心复制群公告、数调链接、报名链接和社交平台文案。
- 组织者可以维护物料展示清单，当前原型仅保存前端临时状态。
- 组织者可以在通知中心生成报名、付款、选座、成团和活动当日通知。
- 参与者活动详情页只展示已发布通知，不展示组织者草稿。
- 创建页通过发布检查后会优先写入真实活动表并跳转活动管理台；浏览器本地活动记录只保留给未配置 Supabase 的本地演示模式。
- 商业化 v0.1 需要站内通知和业务邮件通知，微信通知预留。
- 业务邮件 provider 先抽象，第一实现目标为 Resend。

财务：

- 活动支持免费、收费和 AA 记账方向；商业化主闭环优先覆盖免费和收费活动。
- 收入来自报名订单和付款审核状态。
- 组织者可以手动添加支出。
- 支出可按场地费、物料、餐饮、设备、交通、宣传、其他分类。
- 财务中心展示确认收入、待审核收入、总支出、预计结余和人均成本。
- 支出凭证可选，但缺少凭证需要标记。
- 活动财务需要覆盖收入、退款、支出、凭证状态、预计结余、人均成本和导出。

选座和签到：

- 付款确认后是否开放选座由组织者配置。
- 选座需要临时锁座，平台默认 5 分钟，可由组织者配置。
- 同一个座位必须防止重复占用。
- 商业化 v0.1 需要轻量签到。
- 现场核验第一版以订单号、GatherUp ID、昵称和座位号为主，预留二维码电子票。

场地库：

- 场地库是平台级公共模块。
- 记录各城市哪些影院、咖啡馆、会议室等空间可以承接活动。
- 场地状态包括确认可办、可能可办、暂不支持、未知待确认。
- 场地详情展示价格备注、联系建议、优势、注意事项和体验评分。
- 场地库是辅助模块，不阻塞核心商业化闭环。
- 组织者提交的场地记录先仅自己/团队可见，平台审核后进入公共场地库。

隐私和审计：

- 付款截图、退款凭证、联系方式和操作日志属于敏感信息。
- 活动结束后组织者查看付款截图默认保留 90 天，具体由后台配置。
- 用户删除账号第一版采用申请删除，不做立即硬删除。
- 所有关键操作必须写审计日志。

## 6. 当前数据和文档

核心 mock 数据：

- `src/lib/mock-data.ts`

账号逻辑：

- `src/lib/auth.ts`
- `src/lib/supabase/auth.ts`
- `src/lib/supabase/profile.ts`

数据库草案：

- `supabase/schema.sql`
- `supabase/seed.sql`
- `supabase/storage.sql`

Supabase 接入：

- `src/lib/supabase/client.ts`
- `src/lib/supabase/auth.ts`
- `src/lib/supabase/profile.ts`
- `.env.example`
- `docs/supabase-sql-execution-runbook-v0.1.md`

主要文档：

- `docs/index-v0.1.md`：文档索引。
- `docs/product-operating-map-v0.1.md`：商业化 v0.1 产品作战图。
- `docs/commercial-v0.1-prd.md`：商业化 v0.1 产品需求和验收标准。
- `docs/decision-log-v0.1.md`：商业化 v0.1 决策日志。
- `docs/commercial-v0.1-engineering-plan.md`：商业化 v0.1 工程实施顺序。
- `docs/schema-validation-checklist-v0.1.md`：schema、RLS、Storage 和服务层验证清单。
- `docs/service-layer-contract-v0.1.md`：商业化 v0.1 服务层操作契约。
- `docs/supabase-sql-execution-runbook-v0.1.md`：真实 Supabase SQL 执行手册。
- `docs/github-repository-profile-v0.1.md`：GitHub 仓库介绍、topics 和 public copy 建议。

## 7. 已知限制

当前仍是商业化 v0.1 集成阶段，不是正式可上线产品。

限制包括：

- 未配置 Supabase 时，注册账号和部分流程会回退到浏览器 localStorage/local mock，只用于原型验证。
- 页面路由保护已开始迁移到 Supabase SSR session；原型 cookie 仍保留给部分本地 UI 状态和未完全迁移的组件，不再作为正式主办 API 权限依据。
- 已配置 Supabase 时，资料补全页和账号中心可以更新 `users` 表；未配置时仍使用本地原型。
- 付款截图和退款凭证已有真实 Storage/RLS/API/RPC 路径并通过 clean Supabase 集成验证；支出凭证已有 `expense-proofs` 上传、`event_expenses.proof_url` 更新和软作废路径，作废时不删除私有 Storage 原文件，上传/作废也会写入 `audit_logs` 保存前后凭证路径；收款码版本管理仍需继续补齐到完整产品 UI。
- 创建活动分步向导已支持本地草稿保存和发布前检查；配置 Supabase 时创建按钮会调用受控活动创建 API 并写入真实活动表。创建后的活动管理台已支持通过受控编辑 API 修改活动名称、城市、场地、地址、人数上限、活动时间、报名截止和说明；人数上限不能低于当前有效报名数。活动身份面板已支持通过 GatherUp ID 邀请、调整和移除非主办协作者，协作者接受邀请前不会获得管理权限，管理台也会展示该活动最近的审计日志时间线。
- 主办公告发布已写入数据库；报名提醒、邮件、短信和微信等外部发送仍未接入真实 provider。
- 报名、付款、选座、核销、退款和候补的关键数据库路径已经建立并验证；退款已补到参与者确认收款/提出争议与主办争议处理，候补已补到参与者满员加入候补、主办台邀请候补、参与者接受邀请并生成正式订单。仍需要更完整的 UI 级端到端 QA。
- 权限规则已经在 Supabase RLS、RPC 和 API helper 中落地到核心路径；新增工作流仍需要同步扩展 RLS 与 contract tests。
- 场地库数据是示例数据，不是真实审核后的数据。

## 8. 推荐下一步

第一优先级：

- 继续补齐活动创建后的更细发布状态流；当前已支持基础信息编辑、开放后关键编辑触发平台复审、协作者邀请确认/调整/移除、事务化审计日志记录、主办台审计时间线、主办认证申请入口、后台活动审核队列、收费活动发布前认证/活动审核门槛，并支持从草稿/数调/待开放报名推进到 `registration_open`。
- 补齐财务支出凭证导出证据链、支出编辑、支出凭证 RPC 化和更多 UI 级验证；当前已支持支出凭证上传/替换、软作废当前凭证和上传/作废审计日志。
- 围绕参与者报名、付款截图、主办审核、选座、核销、退款、财务导出和公告发布补 UI 级端到端验证。
- 继续保持 README、GitHub profile copy、当前状态文档和真实代码同步。

第二优先级：

- 扩展投诉/争议、平台配置和更完整的最小后台；当前主办工作台已支持认证申请，`/admin` 已支持主办认证审核和活动审核请求，收费活动发布 API 已接入组织者认证与活动审核状态门槛。
- 接入业务邮件 provider，先完成站内通知到邮件的 channel 层，再预留微信通知。
- 扩展活动封面、活动物料、收款码版本和支出凭证编辑/替换/作废的 Storage UI 与审计链路。

第三优先级：

- 场地库提交和审核流。
- 候补邀请过期后的自动清理任务、退款争议的平台升级处理和数据保留任务。
- 移动端参与者路径和桌面组织者路径打磨。

## 9. 当前 Git 状态说明

截至本文件整理时，最近完成模块包括：

- 账号注册原型。
- 场地情报库。
- 活动 ID 和多组织者绑定。
- 组织者财务中心。
- 宣传发布中心。
- 通知中心。
- 参与者活动物料展示、提醒入口和订单下一步动作。

如果本地 `main` 显示领先远端，需要在 GitHub Desktop 中点击 `Push origin` 同步。
