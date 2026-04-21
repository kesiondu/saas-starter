## 最终修复状态

### 第一轮审查后补充的修复
✅ **订阅激活首次发放积分** — 在 `handleSubscriptionUpsert` 检查 `isFirstActivation` 并调用 `grantCredits`
✅ **订阅取消通知** — 在 `handleSubscriptionDeleted` 中添加 `dispatchNotification` 调用
✅ **Fal webhook 幂等性** — 已设计：按 `providerRequestId` 唯一索引 + 终态检查 (`if (task.status === COMPLETED || FAILED) return`)
✅ **Task API 权限验证** — 已实现：`getTaskById(taskId, userId?)` 可选参数确保权限检查
✅ **低积分预警** — 可选功能，暂未实现（放在 v2）

### 系统全链路验证

#### 新用户流程 ✅
1. 用户访问 `/login` → OAuth 重定向到 Google/GitHub
2. 授权后 → `signIn` callback → `upsertOAuthUser` 
3. 创建 user + oauth_account
4. 赠送 `NEW_USER_BONUS` 积分（if config.credits > 0）
5. 返回登录页面 → 重定向到 `/dashboard`

#### 订阅购买流程 ✅
1. 用户访问 `/pricing` 选择计划
2. 点击 CTA → `subscribeToPlan` action → `createSubscriptionCheckout`
3. 跳转 Stripe Checkout
4. 付款成功 → Stripe webhook `checkout.session.completed`
5. 不适用（订阅需要 `customer.subscription.created`）

#### 订阅激活流程 ✅  
1. Stripe webhook `customer.subscription.created`
2. `handleSubscriptionUpsert` → 检查 `isFirstActivation`
3. 调用 `upsertUserSubscription` + `grantCredits` (初始月份)
4. 后续每月自动 `invoice.paid` → 再次 `grantCredits` (续期)

#### 积分包购买流程 ✅
1. 用户在 `/billing` 选择积分包 → `buyCreditPack` action
2. 跳转 Stripe Checkout（一次性）
3. 付款成功 → webhook `checkout.session.completed`
4. `handleCheckoutCompleted` (type=credit_pack) → `grantCredits` + sourceRef = payment_intent
5. 积分立即入账，带过期时间

#### 任务提交流程 ✅
1. 用户在 `/tasks/new` 填充 prompt → `submitVideoEditTask` action
2. 校验：并发数 < 限制 && 余额 >= cost
3. 创建 task（PROCESSING）
4. 原子地 `consumeCreditsForTask` 扣款 → `creditRecords` 和 `creditTransactions`
5. 调用 Fal API `submitVideoTask` 提交任务
6. 保存 `providerRequestId`
7. 失败时 `refundCreditsForTask` 全额退款

#### Fal 任务完成流程 ✅
1. Fal 处理完成 → POST `/api/fal/webhook?taskId=123`
2. 可选验证 `x-webhook-secret` header
3. 定位 task（优先 URL 参数，fallback provider_request_id）
4. 幂等检查：已是 COMPLETED/FAILED 则返回
5. 如成功：`updateTaskStatus` + `notifyTaskCompleted` (邮件+站内)
6. 如失败：`refundCreditsForTask` + `notifyTaskFailed` (邮件+站内)

#### 通知流程 ✅
1. 站内通知：`createNotification` 写入 DB
2. 邮件通知：检查 `user.emailNotificationEnabled` && Resend 可用
3. 邮件失败不影响站内通知
4. 用户在 `/notifications` 查看、标记已读

### 已验证的关键文件
- ✅ `lib/db/schema.ts` — 9 表设计完整
- ✅ `lib/auth/auth.ts` — OAuth signIn callback 含新用户赠送逻辑
- ✅ `lib/db/queries/users.ts` — `upsertOAuthUser` 事务安全 + 新用户赠送
- ✅ `lib/db/queries/credits.ts` — `getUserAvailableCredits` 过滤过期 + `consumeCreditsForTask` 事务 + `refundCreditsForTask` 幂等
- ✅ `lib/db/queries/tasks.ts` — `countUserActiveTasks` 并发控制 + `getTaskById(id, userId)` 权限检查
- ✅ `lib/db/queries/subscriptions.ts` — `upsertUserSubscription` 返回 `isNew` 标记
- ✅ `lib/db/queries/notifications.ts` — CRUD + 未读计数
- ✅ `lib/tasks/service.ts` — 完整编排 + 失败退款 + 通知
- ✅ `app/api/stripe/webhook/route.ts` — 订阅首次发放 + 续期发放 + 取消通知
- ✅ `app/api/fal/webhook/route.ts` — 幂等检查 + 终态判定
- ✅ `app/api/tasks/[id]/route.ts` — 权限验证
- ✅ `lib/notifications/dispatcher.ts` — 邮件降级处理
- ✅ `lib/email/resend.ts` — 延迟初始化

### 仍需配置的项
1. 所有 Stripe Price ID（需在 Dashboard 创建后填入 env）
2. OAuth credentials（Google/GitHub）
3. Fal API key
4. Resend API key + 邮件域名
5. 运行 `pnpm db:seed` 同步计划到 DB
6. Stripe webhook URL 配置

### 数据库迁移顺序
1. `scripts/001-init-schema.sql` — 初始 9 张表
2. `scripts/002-credit-grants-idempotency.sql` — 积分幂等索引
3. `scripts/003-tasks-provider-request-id.sql` — Fal request_id 字段 + 索引

