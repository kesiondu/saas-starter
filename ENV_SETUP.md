## 环境变量完整清单

### OAuth 认证 (Auth.js + Google/GitHub)
```env
# JWT 加密盐，自动生成：openssl rand -base64 32
AUTH_SECRET=your_random_secret_here

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# GitHub OAuth  
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Next.js 环境
NEXTAUTH_URL=http://localhost:3000  # 生产环境设为 https://yourdomain.com
```

### Stripe (订阅 + 积分包)
```env
STRIPE_SECRET_KEY=sk_test_...  # 从 Stripe Dashboard 获取
STRIPE_WEBHOOK_SECRET=whsec_...  # 配置 webhook 时获得

# 订阅计划 Price ID (来自 config/plans.ts 的 stripePriceId)
STRIPE_PRICE_ID_PRO=price_...
STRIPE_PRICE_ID_PREMIUM=price_...

# 积分包 Price ID (来自 config/credit-packages.ts 的 stripePriceId)
STRIPE_PRICE_ID_PACK_100=price_...
STRIPE_PRICE_ID_PACK_500=price_...
STRIPE_PRICE_ID_PACK_2000=price_...
```

### AI 提供商 (Fal AI)
```env
FAL_KEY=your_fal_api_key  # 从 fal.ai 获取

# 可选：Fal webhook 签名验证
FAL_WEBHOOK_SECRET=your_webhook_secret  # 建议配置以增强安全性
```

### 邮件服务 (Resend)
```env
RESEND_API_KEY=re_...  # 从 resend.com 获取

# 邮件发件人
EMAIL_FROM="AI Video Studio <noreply@yourdomain.com>"  # 需配置邮件域名
```

### 应用配置
```env
# 用于生成 webhook callback URL
NEXT_PUBLIC_APP_URL=http://localhost:3000  # 本地开发
# 或
NEXT_PUBLIC_APP_URL=https://yourdomain.com  # 生产环境

# 数据库连接（由 Vercel Postgres 或其他集成自动注入）
DATABASE_URL=postgresql://...
```

## 快速检查清单

### 本地开发启动前
- [ ] `cp .env.local.example .env.local`
- [ ] 填入所有 `STRIPE_PRICE_ID_*` 后来自 Stripe Dashboard
- [ ] `pnpm install`
- [ ] `pnpm db:seed` （同步 subscription_plans 和 credit_packages 到 DB）
- [ ] `pnpm dev`
- [ ] `stripe listen --forward-to localhost:3000/api/stripe/webhook` (另一个终端)

### 生产部署前
- [ ] 所有 env vars 已在 Vercel 项目设置中配置
- [ ] Stripe webhook 指向 `https://yourdomain.com/api/stripe/webhook`，signing secret 已设置
- [ ] Fal webhook 指向 `https://yourdomain.com/api/fal/webhook`，可选共享密钥已配置
- [ ] Resend 已配置邮件域名验证
- [ ] `NEXT_PUBLIC_APP_URL` 设为正式域名
- [ ] 测试 OAuth 流程、订阅购买、任务提交全链路
