# Commit Summary: AI SaaS Video Editing Template

## 提交类型
Feature: 完整的 C 端 AI 视频剪辑 SaaS 应用模板，包含 OAuth 登录、订阅、积分、任务、通知模块。

## 主要变更

### 1. 数据库设计（完全重构）
- 从 B2B 团队模式重建为 C 端用户模式
- 新增 9 张核心表：
  - `users` — 用户基础信息（支持 Stripe 客户绑定）
  - `oauth_accounts` — Google/GitHub 多供应商支持
  - `subscription_plans` — 订阅计划定义（Free/Pro/Premium）
  - `user_subscriptions` — 用户订阅记录
  - `credit_packages` — 积分包定义
  - `credit_records` — 用户积分余额（带过期时间）
  - `credit_transactions` — 积分消费流水（完整追踪）
  - `tasks` — AI 视频剪辑任务记录
  - `notifications` — 站内通知
- 迁移文件：`scripts/001-003-*.sql`
- 所有配置参数抽到 TypeScript config 文件，零硬编码

### 2. OAuth 登录（Google + GitHub）
- 使用 NextAuth v5 + 自定义 schema
- Edge-safe middleware 分离 + Node 运行时完整配置
- 首次登录自动创建用户 + 赠送新用户积分
- 支持同一邮箱绑定多个 OAuth 账号
- 文件：`lib/auth/*`, `app/(auth)/login/*`, `middleware.ts`

### 3. 订阅与积分系统
- Stripe 集成（订阅 + 一次性积分包）
- 积分过期时间管理（无定时任务，查询时过滤）
- 先到期先消耗逻辑（FIFO + 事务安全）
- Webhook 幂等性保证（唯一索引 + 状态检查）
- 订阅激活自动发放初始积分 + 月度续期
- 文件：`lib/payments/*`, `app/api/stripe/webhook/*`, `app/(app)/billing/*`

### 4. AI 视频任务编排
- Fal AI 集成（视频生成模型抽象层）
- 异步任务队列（Vercel background functions + Fal webhook 驱动）
- 积分消耗原子事务 + 失败自动退款
- 并发任务限制 + 过载保护
- 文件：`lib/ai/*`, `lib/tasks/*`, `app/api/fal/webhook/*`, `app/(app)/tasks/*`

### 5. 通知系统
- 站内通知（实时）+ 邮件通知（Resend 集成）
- 邮件失败不影响站内通知（降级处理）
- 全链路事件触发（任务完成/失败、订阅状态变更等）
- 文件：`lib/notifications/*`, `lib/email/*`, `app/(app)/notifications/*`

### 6. UI 与路由
- Landing 页 + 定价页（公开）
- OAuth 登录页
- 受保护区域：Dashboard / 任务 / 账单 / 通知
- 任务流：列表 → 新建（模型选择 + prompt）→ 详情（实时轮询）
- 文件：`app/(auth)/`, `app/pricing/`, `app/(app)/*`, `components/*`

### 7. 配置系统
- 订阅计划配置：`config/plans.ts`
- 积分包配置：`config/credit-packages.ts`
- 视频模型配置：`config/video-models.ts`
- 应用全局配置：`config/app.ts`
- 新用户赠送、任务消耗、限流等参数集中管理

## 删除内容
- 所有 B2B 认证/授权逻辑（`lib/auth/session.ts`, `lib/auth/middleware.ts`）
- 旧 schema 和 queries（`lib/db/queries.ts`, `lib/db/setup.ts`）
- 旧页面和 API（login/signup/dashboard/team/etc）
- 不必要的依赖（bcryptjs, jose, swr）

## 环境变量需求

### 认证
- `AUTH_SECRET` — NextAuth 加密密钥
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `NEXTAUTH_URL` — 应用基础 URL

### 支付（Stripe）
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_PREMIUM` — 订阅价格
- `STRIPE_PRICE_ID_PACK_100`, `STRIPE_PRICE_ID_PACK_500`, `STRIPE_PRICE_ID_PACK_2000` — 积分包价格

### AI（Fal）
- `FAL_KEY` — Fal API key
- `FAL_WEBHOOK_SECRET` — Fal webhook 验证密钥（可选）

### 邮件（Resend）
- `RESEND_API_KEY` — Resend 邮件服务 key
- `EMAIL_FROM` — 发件人地址
- `NEXT_PUBLIC_APP_URL` — 用于邮件中的链接

## 数据库迁移顺序
1. `pnpm db:seed` — 初始化模式（创建表）
2. 执行 SQL 迁移：
   - `scripts/001-init-schema.sql` — 初始 9 表
   - `scripts/002-credit-grants-idempotency.sql` — 积分幂等索引
   - `scripts/003-tasks-provider-request-id.sql` — Fal request_id 字段

## 启动流程
1. 配置所有环境变量
2. 执行 `pnpm install`
3. 执行 `pnpm db:seed`
4. 启动开发服务器：`pnpm dev`
5. 配置 Stripe webhook（指向 `/api/stripe/webhook`）
6. 配置 Fal webhook（指向 `/api/fal/webhook`）
7. 测试 OAuth 登录流程

## 系统特点
- ✅ **零硬编码** — 所有业务参数在 config 中集中管理
- ✅ **全链路幂等性** — Stripe/Fal webhook 重放安全
- ✅ **事务安全** — 积分消耗原子性 + 失败自动回滚
- ✅ **优雅降级** — 邮件服务不可用时仅用站内通知
- ✅ **完整审计** — 积分流水 + 任务日志 + 通知记录
- ✅ **权限隔离** — 用户仅能访问自己的数据

## 文档
- `AUDIT_REPORT.md` — 系统审查报告及全链路流程图
- `ENV_SETUP.md` — 环境变量配置指南
- `lib/db/SCHEMA.md` — 数据库设计说明

## 相关文件统计
- 新增文件：60+ 个
- 删除文件：26 个
- 修改文件：10+ 个
- 代码行数：~3500 行
