# GatherUp iOS App Store 上架方案

## 一、当前项目状态评估

### 1.1 现状结论

GatherUp 当前是一个典型的 Next.js Web 应用，已经具备一定移动端基础，但还没有达到可直接打包上架 iOS App Store 的状态。

结论分为四点：

1. **没有现成移动端容器**
   - 未发现 `Capacitor`、`Expo`、`React Native`、`manifest.webmanifest`、`service worker`、`public/` 图标资源等移动端或 PWA 配置。
   - 当前更像“移动端友好的 Web 应用”，不是“已准备好的移动应用”。

2. **前端已有移动端适配基础**
   - 样式里存在大量断点、单栏降级、底部移动导航、`safe-area-inset-bottom` 适配。
   - 说明产品设计并非桌面端专用，迁移到 iPhone 的前期成本相对可控。

3. **认证逻辑部分适合移动端，部分需要补强**
   - 现有后端支持 `Bearer Token` 验证，这对移动端非常有利。
   - 但登录入口目前主要是邮箱密码 / 邮箱 OTP，**没有真正接入 Apple Sign In**，而这会直接影响 App Store 审核成功率。

4. **Supabase 后端总体可复用**
   - 已有用户会话校验、受保护 API、文件上传、通知和事务型 RPC。
   - 后端不是主要阻碍，主要阻碍在 **iOS 容器、审核合规、原生能力补齐**。

---

## 二、四种上架路径评估

### A) Capacitor 包装现有 Next.js

#### 可行性
高，可作为当前阶段的**推荐主路径**。

#### 优点
- 复用现有 Next.js 前端和大部分业务逻辑。
- 可以较快做出可测试的 iOS 版本。
- 能补入原生能力：推送、相机/相册、分享、原生状态栏、安全存储。
- 对非专业团队最容易落地。

#### 风险
- **不能只做“纯 WebView 套壳”**。如果只是把网站原封不动塞进 App，审核被认为“功能过少/只是网站”的风险较高。
- 需要补至少一批原生能力与 iOS 体验优化，否则审核通过率不理想。
- Next.js 需要稳定的部署地址、移动端登录回调、深链接方案。

#### 适合 GatherUp 的原因
- 现有 UI 已有移动端基础。
- 认证 API 已支持 Bearer Token。
- 文件上传、通知、活动浏览、订单查看这类流程适合先用 Web 复用。

#### 我的判断
**推荐，但必须是“Capacitor + 原生增强版”，不是简单套壳。**

---

### B) PWA + Safari Web App

#### 可行性
中等，适合作为**过渡方案**，不适合作为 App Store 上架方案。

#### 优点
- 不需要原生代码。
- 最快上线。
- 可先验证用户是否真的需要“App 形态”。

#### 缺点
- 不会上架 App Store。
- iOS 上 PWA 能力受限，推送、后台能力、系统集成体验都不如原生容器。
- 用户认知和分发能力弱于商店上架。

#### 我的判断
**适合先做移动试运行，但不能替代 App Store 方案。**

---

### C) React Native / Expo 重写

#### 可行性
高，但工作量明显更大。

#### 优点
- 审核相对友好。
- 可以获得更好的原生体验。
- 长期跨平台价值更高。

#### 缺点
- 需要重写前端页面与组件。
- 现有 Next.js 页面和大量 CSS 无法直接复用。
- 登录、导航、表单、文件上传、状态管理都要重搭。

#### 我的判断
**如果目标是 6–12 个月内做长期移动产品，可以考虑；不适合作为当前最快上架路径。**

---

### D) Swift / SwiftUI 原生 iOS

#### 可行性
高，但只适合预算和时间都更充足的团队。

#### 优点
- 最好的 iOS 体验。
- Apple 审核最友好。
- 原生推送、相机、钱包票券、分享、日历等集成最自然。

#### 缺点
- 工作量最大。
- 前端完全重做。
- 需要 iOS 原生工程经验。

#### 我的判断
**长期最佳，当前阶段不划算。**

---

## 三、推荐方案

## 推荐：A 路径，但采用“Capacitor + 原生增强 + 后端接口标准化”的方式推进

这不是“纯套壳”，而是：

1. 保留现有 Next.js 作为主 UI 与业务层。
2. 新增 iOS 容器（Capacitor）。
3. 为 Apple 审核重点能力补原生集成：
   - Sign in with Apple
   - Push Notification
   - 文件/相机上传优化
   - 深链接与登录回调
   - 安全存储
4. 将现有 Web 内部调用逐步收敛为“稳定 API 合约”，为未来 React Native 或 SwiftUI 留出升级路径。

### 为什么不是直接选 C 或 D

- GatherUp 现在明显还处于产品完善阶段，重写前端会拖慢上线。
- 当前代码库已经有移动布局基础，完全放弃复用成本太高。
- 对 App Store 审核来说，**“有明确真实业务 + 有原生能力 + 良好移动体验”的 Capacitor 应用**，通过率通常好于单纯网站套壳。

---

## 四、推荐技术架构

### 4.1 客户端

- **Web 业务层**：Next.js 16 + React 19
- **iOS 容器**：Capacitor 7
- **原生插件**
  - `@capacitor/app`
  - `@capacitor/browser`
  - `@capacitor/device`
  - `@capacitor/filesystem`
  - `@capacitor/push-notifications`
  - `@capacitor/preferences`
  - `@capacitor/share`
  - `@capacitor/splash-screen`
  - `@capacitor/status-bar`
  - 登录相关原生插件：Apple Sign In / OAuth 浏览器回调插件

### 4.2 后端

- **认证**：Supabase Auth
- **数据库**：Supabase Postgres
- **对象存储**：Supabase Storage
- **业务事务**：现有 RPC / 服务层继续保留
- **通知**：
  - 当前已有站内通知 + 邮件通知
  - 新增 APNs 推送通道

### 4.3 建议的接口策略

短期不必额外加一层独立 BFF，但应开始把移动端依赖的核心能力收敛到稳定接口：

- 登录 / 会话
- 活动列表 / 活动详情
- 下单 / 支付凭证上传
- 我的订单
- 主办方工作台核心摘要
- 通知列表 / 已读

这样后续无论继续用 Capacitor，还是迁移到 React Native / SwiftUI，都不需要重新拆后端。

---

## 五、需要新增或修改的文件与目录

## 5.1 新增目录

```text
ios/
capacitor.config.ts
src/app/manifest.ts
public/
  icons/
  apple-touch-icon.png
  favicon.ico
  splash/
src/lib/mobile/
  env.ts
  auth-bridge.ts
  push.ts
  upload.ts
```

## 5.2 需要修改的现有区域

### Web / Next.js
- `src/app/layout.tsx`
  - 增加 iOS / PWA 相关 metadata
  - 增加 manifest、theme color、apple web app metadata

- `src/app/login/page.tsx`
  - 增加 Apple 登录入口
  - 适配移动端 OAuth / deep link 回跳

- `src/lib/supabase/auth.ts`
  - 增加 Apple Sign In 的处理
  - 区分浏览器流程与 App 内流程

- `src/lib/supabase/server.ts`
  - 保持 Bearer Token 支持
  - 必要时增加移动端 refresh token / session 兼容策略

- `src/components/app-shell.tsx`
  - 微调 iPhone 安全区、底部导航、滚动行为
  - 避免 WebView 内顶部/底部交互冲突

- `src/app/globals.css`
  - 进一步优化触控尺寸、表单输入区、上传组件、固定底栏间距

### iOS / Capacitor
- `capacitor.config.ts`
  - 应用 ID、App 名称、深链接域名、iOS 配置

- `ios/App/App/Info.plist`
  - 相机/相册权限说明
  - URL Scheme
  - Associated Domains

- `ios/App/App.entitlements`
  - Push、Associated Domains、Sign in with Apple

### 文档与合规
- 新增隐私政策托管 URL
- 新增 App Store 审核说明文档
- 新增 App 内支持页面 / 联系方式

---

## 六、App Store 合规要求清单

### 6.1 必备法务与元信息

- 隐私政策 URL
- 服务条款 URL
- App 支持 URL
- 开发者账号信息一致
- App 内账号删除说明（若支持账号注册，建议提供删除入口或至少可申请删除）
- 若收集个人信息，需在 App Store Connect 填写隐私问卷

### 6.2 审核高风险点

1. **禁止纯网站套壳感**
   - App 必须有明确移动价值。
   - 建议至少加入：
     - Apple 登录
     - 原生推送
     - 原生分享 / 打开地图 / 添加日历
     - 相机/相册上传

2. **登录方式规则**
   - 如果 App 提供第三方登录（Google 等），通常必须提供 **Sign in with Apple**。
   - 当前代码里 Apple 只是“planned”，这项必须落地。

3. **支付规则**
   - 如果卖的是线下活动、现实世界服务、真实票务，一般**不强制使用 Apple IAP**。
   - 但如果将来售卖数字内容、纯线上会员特权、虚拟权益，就可能触发 IAP 要求。

4. **用户生成内容与主办方内容**
   - 需要举报机制、审核规则、联系方式。
   - 当前已有管理员审核与主办方审核基础，是加分项。

5. **隐私最小化**
   - 只申请确实使用的权限。
   - 相机/照片权限文案必须解释用途，例如“用于上传付款凭证、退款凭证、活动素材”。

### 6.3 建议预备材料

- 审核账号 / 测试账号
- 测试活动数据
- 测试下单与上传凭证流程
- 审核备注（解释这是线下活动管理与票务工具，而非简单网站包装）

---

## 七、后端就绪度评估

### 7.1 Supabase 是否能直接支持移动端

**总体可以。**

原因：
- 已支持 Supabase Auth。
- 现有服务端支持从 `Authorization: Bearer <token>` 读取移动端令牌。
- 文件上传已走 Supabase Storage。
- 事务逻辑已下沉到服务层 / RPC。

这意味着 iOS App 不一定要重建后端。

### 7.2 是否需要额外 API 层

**短期不必强制新增独立 API 网关。**

但建议做两件事：

1. 保持现在的 `src/app/api/*` 路由作为统一入口。
2. 把移动端高频核心流程整理成稳定契约，避免 App 直接依赖过多页面内部逻辑。

### 7.3 认证流程是否需要适配

**需要。重点是三项：**

1. **Sign in with Apple**
   - App Store 通过率关键项。
   - 建议接入 Supabase OAuth / OIDC 方案或原生 Apple 登录后换取 Supabase session。

2. **App 内深链接回调**
   - 邮箱验证码、重置密码、OAuth 都要支持 `universal links` 或自定义 URL scheme。

3. **安全存储**
   - iOS App 不应只依赖普通 Web cookie。
   - 建议用原生安全存储保存 session / refresh token，再桥接到 Web 层。

### 7.4 推送通知方案

推荐方案：

- iOS：APNs
- App 侧：Capacitor Push Notifications
- 后端：Supabase + 自建 `device_tokens` 表 + 服务器推送任务

建议新增：
- `device_tokens`
  - `user_id`
  - `platform`
  - `token`
  - `app_version`
  - `last_seen_at`
  - `disabled_at`

触发来源可优先接入：
- 活动报名成功
- 付款待审核 / 审核通过 / 驳回
- 退款状态变化
- 候补转正
- 活动提醒 / 变更通知

---

## 八、实施路线图

## 阶段 0：上架前的 Web 移动化加固

### 目标
把现有 Web 应用调整到“适合被 App 容器承载”。

### 任务
- 增加 manifest / icons / metadata
- 补齐 iPhone 安全区和输入体验
- 优化上传、弹层、底部导航、返回行为
- 明确哪些页面适合移动首发，哪些暂时保留桌面优先

### 预估工作量
- **3–5 天**

---

## 阶段 1：Capacitor 容器接入

### 目标
生成可运行的 iOS App，完成基础打包与真机测试。

### 任务
- 初始化 Capacitor
- 接入 iOS 工程
- 配置 App ID、图标、启动页
- 建立测试包
- 验证登录、活动浏览、下单、文件上传、通知列表

### 预估工作量
- **4–7 天**

---

## 阶段 2：审核关键能力补齐

### 目标
把“可运行”提升到“可提交审核”。

### 任务
- 接入 Sign in with Apple
- 深链接 / Universal Links
- 推送通知
- 原生分享、地图跳转、相机/相册上传
- 安全存储会话
- 权限说明文案

### 预估工作量
- **7–12 天**

---

## 阶段 3：合规与提交准备

### 目标
准备 App Store Connect 材料并做审核自测。

### 任务
- 隐私政策与支持 URL 上线
- App Store 截图、描述、关键词
- 隐私问卷填写
- 准备审核备注与测试账号
- TestFlight 内测

### 预估工作量
- **3–5 天**

---

## 阶段 4：首发后优化

### 目标
根据首轮用户反馈决定是否继续深度原生化。

### 任务
- 跟踪崩溃与登录问题
- 优化推送策略
- 评估是否把高频流程改为更原生的 UI

### 预估工作量
- **持续 1–2 周**

---

## 九、总工作量预估

### 推荐路径总计

- **最小可上架版本：约 3–5 周**
  - 前提：现有 Web 功能稳定、部署环境稳定、有人可处理 Apple 开发者账号与证书。

- **更稳妥的首发版本：约 5–7 周**
  - 包含：Apple 登录、推送、深链接、审核材料、1–2 轮 TestFlight 修正。

---

## 十、对非专业开发者的执行建议

如果你希望用最小成本把 GatherUp 放进 App Store，建议按下面顺序做：

1. **先不要重写前端。**
2. **先做 Capacitor 版，但明确目标不是“套壳”，而是“原生增强版 Web App”。**
3. **优先完成 Apple 登录、推送、上传体验、隐私政策。**
4. **先用 TestFlight 给 10–20 个真实用户试用。**
5. **如果活跃用户明显增长，再决定是否升级到 React Native 或 SwiftUI。**

---

## 十一、最终建议

### 推荐结论

**短中期最优解：A) Capacitor 包装，但必须配合原生增强。**

### 不推荐直接采用的方案

- **B) PWA**：不能满足 App Store 上架目标。
- **C) React Native / Expo 重写**：现在投入过大。
- **D) SwiftUI 原生**：长期最好，但现阶段性价比最低。

### 一句话判断

GatherUp 现在最适合走：

**“先把 Web 做成合格的移动产品，再用 Capacitor 做 iOS 首发，并为未来原生化保留接口演进空间。”**