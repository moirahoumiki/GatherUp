# 基建加固记录（2026-07）

本轮加固吸收了外部评审里合理的工程建议，但按 GatherUp 当前代码库重新落地，避免覆盖既有 ESLint/Prettier 配置。

## 1. Supabase 迁移入口

- `supabase/migrations/` 成为后续数据库变更入口，文件名使用 `<14位时间戳>_<snake_case>.sql`。
- `20260705000001_initial_schema.sql` 与 `supabase/schema.sql` 保持一致，作为当前 schema 冻结基线。
- `20260705000002_storage.sql` 与 `supabase/storage.sql` 保持一致，作为当前 Storage/RLS 冻结基线。
- 新 DDL 不再直接改基线，应新增 timestamp migration，例如 `20260705000100_api_rate_limits.sql`。
- `tests/migrations-contract.test.mts` 保护迁移命名、基线一致性与敏感 RPC 权限边界。

## 2. 跨实例 API 限流

- 新增 `public.api_rate_limits` 表与 `public.consume_rate_limit()` RPC。
- 表启用 RLS，且对 `public`、`anon`、`authenticated` 全部 revoke。
- 服务端配置 `SUPABASE_SERVICE_ROLE_KEY` 时，`enforceRateLimit()` 使用 Postgres 固定窗口计数。
- 未配置 service role 或 RPC 临时失败时，自动回退到原来的内存限流，避免完全裸奔。

## 3. Demo/mock 边界

- 新增 `src/lib/data-mode.ts`。
- 未配置 Supabase：继续使用 mock，方便本地原型开发。
- 显式设置 `NEXT_PUBLIC_GATHERUP_DEMO_MODE=1`：即使配置 Supabase，也允许展示 demo/mock。
- 已配置 Supabase 且非 demo：数据库查询失败会记录 `[gatherup:data]` 日志，并返回空状态或 404，不再静默展示假数据。

## 4. CI 与开发脚本

- CI 增加独立 `npm run lint` 步骤，问题在 GitHub Actions 里更直观。
- 新增 Supabase CLI 辅助脚本：`db:diff`、`db:push`、`db:types`。

## 后续

- 在 clean validation Supabase 项目执行 `20260705000100_api_rate_limits.sql`。
- 运行 `tests/integration/rpc/rate-limit.test.mts`，确认 `consume_rate_limit` 在真实 Supabase 中通过 service-role 调用、拒绝匿名调用。
- 生成 Supabase 类型文件后，为 Supabase client 补 `Database` 泛型。

## 2026-07-16 验证补记

- 默认 `npm run test:integration:rpc` 仍然安全跳过真实 Supabase 写入，说明 `GATHERUP_RUN_RPC_INTEGRATION` / `GATHERUP_RPC_INTEGRATION_TARGET` / `GATHERUP_RPC_INTEGRATION_ALLOWED_REF` 防误跑保护有效。
- 使用 clean-dev 保护变量尝试运行真实 RPC/Storage 集成测试时，Codex 当前网络环境无法稳定完成到 `oxbrxkllftyevlzmiydt.supabase.co:443` 的 TLS 握手：
  - 沙箱内失败为 `getaddrinfo ENOTFOUND`；
  - 提权网络运行失败为 `ECONNRESET`；
  - `curl -I https://oxbrxkllftyevlzmiydt.supabase.co` 同样失败为 `LibreSSL SSL_connect: SSL_ERROR_SYSCALL`。
- 该结果不能证明 `consume_rate_limit` RPC 或既有 RPC/Storage RLS 失败，只能说明本次 Codex 环境无法触达 Supabase。下一次需要在用户本机浏览器/终端网络可达时，重新运行：

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=oxbrxkllftyevlzmiydt npm run test:integration:rpc
```

## 2026-07-19 验证闭环

- 已确认 validation 项目当时处于暂停状态；从 Dashboard 恢复后，Codex 终端可正常访问 Supabase。
- 已在 clean-dev 执行 `20260705000100_api_rate_limits.sql`，独立限流 RPC 集成测试通过 2/2。
- 原子活动创建真实测试暴露旧库 `event_organizers` 生命周期 enum/字段漂移；新增并执行幂等迁移 `20260719000000_reconcile_event_organizer_lifecycle.sql` 后，活动创建测试通过 4/4。
- 生产构建暴露应用仍读取并不存在于规范 schema 的 `events.registered_count`；现已改为通过 `get_public_event_registration_counts` 聚合有效报名数量，并在 clean-dev 验证匿名调用只返回活动 ID 与人数，不暴露报名明细。
- 浏览器真实创建活动后，管理台首次读取暴露 `event_organizers -> users` 双外键歧义；数据适配器现显式绑定 `event_organizers_user_id_fkey`，并记录组合查询错误。修复后创建向导可直接进入新活动管理台。
- 最终完整 RPC/并发/Storage RLS 集成套件通过 25/25；2026-07-16 的网络阻塞记录保留为历史事实，但不再是当前 blocker。
