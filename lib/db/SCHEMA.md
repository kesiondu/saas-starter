# 数据库设计说明

C 端 AI 视频剪辑工具的数据库模型。共 9 张表，围绕 **用户 → 订阅/积分 → 任务 → 通知** 主线设计。

## 设计原则

1. **无密码认证**：用户通过 Google / GitHub OAuth 登录，不存 password_hash
2. **积分过期无需定时任务**：每条 `credit_records` 带 `expires_at`，查询时用 `expires_at > NOW()` 剔除过期积分
3. **业务参数外置**：订阅计划、积分包、任务消耗等全部放 `/config` 目录，Stripe Price ID 通过环境变量注入
4. **不做文件管理**：`tasks.output_url` 仅保存外部（Vercel Blob / S3）URL，不维护文件生命周期
5. **历史永久保存**：无归档/清理字段

## 表清单

| # | 表名 | 用途 |
|---|------|------|
| 1 | `users` | 用户主表（含 Stripe customer ID、邮件通知开关） |
| 2 | `oauth_accounts` | OAuth 绑定关系（一个 user 一个 provider 只能绑一次） |
| 3 | `subscription_plans` | 订阅计划索引表（内容在 config 中） |
| 4 | `user_subscriptions` | 用户订阅记录（Stripe 订阅一对一） |
| 5 | `credit_packages` | 积分包索引表（内容在 config 中） |
| 6 | `credit_records` | 积分批次表（每次获得一批积分一条记录，带过期时间） |
| 7 | `credit_transactions` | 积分消费流水（关联扣减的 credit_records 与 task） |
| 8 | `tasks` | AI 任务（视频剪辑任务队列） |
| 9 | `notifications` | 站内通知（含 `is_email_sent` 标记） |

## 核心查询模式

### 查询用户可用积分
```sql
SELECT COALESCE(SUM(credits_total - credits_used), 0) AS available
FROM credit_records
WHERE user_id = $1
  AND expires_at > NOW()
  AND credits_used < credits_total;
```

### 扣减积分（先过期先消耗）
```sql
SELECT id, credits_total - credits_used AS remaining
FROM credit_records
WHERE user_id = $1
  AND expires_at > NOW()
  AND credits_used < credits_total
ORDER BY expires_at ASC
FOR UPDATE;
-- 业务代码按顺序扣减，写入 credit_transactions
```

### 获取用户未读通知
```sql
SELECT * FROM notifications
WHERE user_id = $1 AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 20;
```

## 数据流程

### 首次登录（OAuth）
1. OAuth 回调拿到 `provider + provider_account_id`
2. 查 `oauth_accounts`
   - 命中：更新 `access_token`，写 `users.last_login_at`
   - 未命中：建 `users` + `oauth_accounts`，按 `NEW_USER_BONUS` 写一条 `credit_records`（source_type=`bonus`）

### 任务消费积分
1. 读 `config/app.ts` 得 `credits_cost`
2. 事务内：
   - 锁住该用户未过期 `credit_records`
   - 顺序扣减 `credits_used`
   - 插入 `credit_transactions` 流水
   - 插入 `tasks` 记录（status=`pending`）
3. 提交后推入异步队列

### 订阅续期（Stripe Webhook）
1. 更新 `user_subscriptions.current_period_end`
2. 插入 `credit_records`（source_type=`subscription`，expires_at = now + `creditValidityDays`）

### 积分包购买（Stripe Webhook）
1. 插入 `credit_records`（source_type=`purchase`，expires_at = now + `validityDays`）

## 配置文件

| 文件 | 说明 |
|------|------|
| `config/plans.ts` | 订阅计划（Free/Pro/Premium），含价格、积分数、有效期 |
| `config/credit-packages.ts` | 一次性积分包配置 |
| `config/app.ts` | 新用户奖励、任务消耗、OAuth、通知阈值等 |

修改 config 后运行 `pnpm db:seed` 同步到数据库（仅同步 stripe_price_id 等外部引用，业务参数始终以 config 为准）。
