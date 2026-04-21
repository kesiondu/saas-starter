import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/* -------------------------------------------------------------------------- */
/*                              1. users (用户表)                              */
/* -------------------------------------------------------------------------- */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 100 }),
    avatarUrl: text('avatar_url'),
    locale: varchar('locale', { length: 10 }).notNull().default('en-US'),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }).unique(),
    // 邮件通知开关（站内通知总是创建）
    emailNotificationEnabled: boolean('email_notification_enabled')
      .notNull()
      .default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastLoginAt: timestamp('last_login_at'),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
  }),
);

/* -------------------------------------------------------------------------- */
/*                   2. oauth_accounts (第三方账号关联表)                       */
/* -------------------------------------------------------------------------- */
export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 50 }).notNull(), // 'google' | 'github'
    providerAccountId: varchar('provider_account_id', {
      length: 255,
    }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    providerAccountIdx: uniqueIndex('oauth_provider_account_idx').on(
      table.provider,
      table.providerAccountId,
    ),
    userProviderIdx: uniqueIndex('oauth_user_provider_idx').on(
      table.userId,
      table.provider,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/*                   3. subscription_plans (订阅计划定义表)                     */
/* -------------------------------------------------------------------------- */
/**
 * 订阅计划的元数据存储在 config 文件中，此表用于与 Stripe 订阅关联。
 * 运行时从 config 读取定义，通过 planCode 匹配此表记录。
 */
export const subscriptionPlans = pgTable('subscription_plans', {
  id: serial('id').primaryKey(),
  planCode: varchar('plan_code', { length: 50 }).notNull().unique(), // 与 config 中的 code 对应
  name: varchar('name', { length: 100 }).notNull(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                    4. user_subscriptions (用户订阅记录表)                    */
/* -------------------------------------------------------------------------- */
export const userSubscriptions = pgTable(
  'user_subscriptions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    planId: integer('plan_id')
      .notNull()
      .references(() => subscriptionPlans.id),
    stripeSubscriptionId: varchar('stripe_subscription_id', {
      length: 255,
    }).unique(),
    status: varchar('status', { length: 30 }).notNull(), // active | canceled | past_due | paused | trialing
    currentPeriodStart: timestamp('current_period_start').notNull(),
    currentPeriodEnd: timestamp('current_period_end').notNull(),
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userStatusIdx: index('user_subscriptions_user_status_idx').on(
      table.userId,
      table.status,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/*                       5. credit_packages (积分包定义表)                      */
/* -------------------------------------------------------------------------- */
/**
 * 积分包详情同样存于 config，此表用于关联 Stripe 一次性商品。
 */
export const creditPackages = pgTable('credit_packages', {
  id: serial('id').primaryKey(),
  packageCode: varchar('package_code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  stripeProductId: varchar('stripe_product_id', { length: 255 }),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

/* -------------------------------------------------------------------------- */
/*                   6. credit_records (积分记录表-带过期时间)                  */
/* -------------------------------------------------------------------------- */
/**
 * 每次获得积分（订阅赠送/购买/新用户奖励）都会生成一条记录，
 * 带 expires_at。查询时通过 expires_at > NOW() 剔除过期积分，无需定时任务。
 */
export const creditRecords = pgTable(
  'credit_records',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creditsTotal: integer('credits_total').notNull(), // 原始获得数
    creditsUsed: integer('credits_used').notNull().default(0), // 已消耗数
    sourceType: varchar('source_type', { length: 30 }).notNull(), // subscription | purchase | bonus
    sourceRef: varchar('source_ref', { length: 255 }), // 订阅ID / 支付意图ID / 奖励类型
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userActiveIdx: index('credit_records_user_active_idx').on(
      table.userId,
      table.expiresAt,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/*                  7. credit_transactions (积分消费流水表)                    */
/* -------------------------------------------------------------------------- */
export const creditTransactions = pgTable(
  'credit_transactions',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    creditRecordId: integer('credit_record_id')
      .notNull()
      .references(() => creditRecords.id),
    taskId: integer('task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }),
    amount: integer('amount').notNull(), // 负数表示消耗
    reason: varchar('reason', { length: 50 }).notNull(), // task_consume | refund
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userCreatedIdx: index('credit_tx_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/*                          8. tasks (AI 任务表)                               */
/* -------------------------------------------------------------------------- */
export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskType: varchar('task_type', { length: 50 }).notNull(), // video_edit 等
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // pending | processing | completed | failed | canceled
    creditsCost: integer('credits_cost').notNull().default(0),
    inputParams: jsonb('input_params').notNull(), // 输入参数
    outputUrl: text('output_url'), // 结果文件URL（不做文件管理，只存URL）
    errorMessage: text('error_message'),
    providerRequestId: varchar('provider_request_id', { length: 255 }), // Fal request_id 等
    createdAt: timestamp('created_at').notNull().defaultNow(),
    startedAt: timestamp('started_at'),
    completedAt: timestamp('completed_at'),
  },
  (table) => ({
    userStatusIdx: index('tasks_user_status_idx').on(
      table.userId,
      table.status,
    ),
    userCreatedIdx: index('tasks_user_created_idx').on(
      table.userId,
      table.createdAt,
    ),
    providerRequestIdx: uniqueIndex('tasks_provider_request_id_idx').on(
      table.providerRequestId,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/*                     9. notifications (站内通知表)                           */
/* -------------------------------------------------------------------------- */
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    // task_completed | task_failed | credits_low | subscription_renewed 等
    title: varchar('title', { length: 255 }).notNull(),
    content: text('content'),
    relatedTaskId: integer('related_task_id').references(() => tasks.id, {
      onDelete: 'set null',
    }),
    isRead: boolean('is_read').notNull().default(false),
    isEmailSent: boolean('is_email_sent').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    userUnreadIdx: index('notifications_user_unread_idx').on(
      table.userId,
      table.isRead,
    ),
  }),
);

/* -------------------------------------------------------------------------- */
/*                                 Relations                                   */
/* -------------------------------------------------------------------------- */
export const usersRelations = relations(users, ({ many }) => ({
  oauthAccounts: many(oauthAccounts),
  subscriptions: many(userSubscriptions),
  creditRecords: many(creditRecords),
  creditTransactions: many(creditTransactions),
  tasks: many(tasks),
  notifications: many(notifications),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const subscriptionPlansRelations = relations(
  subscriptionPlans,
  ({ many }) => ({
    subscriptions: many(userSubscriptions),
  }),
);

export const userSubscriptionsRelations = relations(
  userSubscriptions,
  ({ one }) => ({
    user: one(users, {
      fields: [userSubscriptions.userId],
      references: [users.id],
    }),
    plan: one(subscriptionPlans, {
      fields: [userSubscriptions.planId],
      references: [subscriptionPlans.id],
    }),
  }),
);

export const creditRecordsRelations = relations(
  creditRecords,
  ({ one, many }) => ({
    user: one(users, {
      fields: [creditRecords.userId],
      references: [users.id],
    }),
    transactions: many(creditTransactions),
  }),
);

export const creditTransactionsRelations = relations(
  creditTransactions,
  ({ one }) => ({
    user: one(users, {
      fields: [creditTransactions.userId],
      references: [users.id],
    }),
    creditRecord: one(creditRecords, {
      fields: [creditTransactions.creditRecordId],
      references: [creditRecords.id],
    }),
    task: one(tasks, {
      fields: [creditTransactions.taskId],
      references: [tasks.id],
    }),
  }),
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  creditTransactions: many(creditTransactions),
  notifications: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [notifications.relatedTaskId],
    references: [tasks.id],
  }),
}));

/* -------------------------------------------------------------------------- */
/*                                Type Exports                                 */
/* -------------------------------------------------------------------------- */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;

export type CreditPackage = typeof creditPackages.$inferSelect;
export type NewCreditPackage = typeof creditPackages.$inferInsert;

export type CreditRecord = typeof creditRecords.$inferSelect;
export type NewCreditRecord = typeof creditRecords.$inferInsert;

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

/* -------------------------------------------------------------------------- */
/*                                   Enums                                     */
/* -------------------------------------------------------------------------- */
export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELED = 'canceled',
  PAST_DUE = 'past_due',
  PAUSED = 'paused',
  TRIALING = 'trialing',
}

export enum CreditSourceType {
  SUBSCRIPTION = 'subscription', // 订阅赠送
  PURCHASE = 'purchase', // 购买积分包
  BONUS = 'bonus', // 新用户/活动奖励
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export enum TaskType {
  VIDEO_EDIT = 'video_edit',
}

export enum NotificationType {
  TASK_COMPLETED = 'task_completed',
  TASK_FAILED = 'task_failed',
  CREDITS_LOW = 'credits_low',
  CREDITS_EXPIRING = 'credits_expiring',
  SUBSCRIPTION_RENEWED = 'subscription_renewed',
  SUBSCRIPTION_CANCELED = 'subscription_canceled',
}
