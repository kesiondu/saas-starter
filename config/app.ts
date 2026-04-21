/**
 * 应用全局配置
 * ----------------------------------------------
 * 集中管理新用户奖励、任务消耗、OAuth 供应商等业务参数。
 */

/* -------------------------------- 新用户奖励 ------------------------------- */
export const NEW_USER_BONUS = {
  /** 新用户首次登录赠送的积分 */
  credits: 50,
  /** 有效期（天） */
  validityDays: 14,
} as const;

/* -------------------------------- 任务消耗配置 ----------------------------- */
/**
 * 各类 AI 任务固定消耗的积分数。
 * 如果同一任务因参数不同需要不同消耗，在这里扩展为函数形式。
 */
export const TASK_CREDITS_COST: Record<string, number> = {
  video_edit: 10,
};

export function getTaskCost(taskType: string): number {
  return TASK_CREDITS_COST[taskType] ?? 0;
}

/* --------------------------------- OAuth --------------------------------- */
export const OAUTH_PROVIDERS = {
  google: {
    enabled: true,
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
    scopes: ['openid', 'email', 'profile'],
  },
  github: {
    enabled: true,
    clientIdEnv: 'GITHUB_CLIENT_ID',
    clientSecretEnv: 'GITHUB_CLIENT_SECRET',
    scopes: ['read:user', 'user:email'],
  },
} as const;

/* -------------------------------- 通知阈值 -------------------------------- */
export const NOTIFICATION_THRESHOLDS = {
  /** 积分低于此值时触发 credits_low 通知 */
  creditsLow: 10,
  /** 积分过期前 N 天触发 credits_expiring 通知 */
  creditsExpiringDays: 3,
} as const;

/* -------------------------------- 任务队列 -------------------------------- */
export const TASK_QUEUE = {
  /** 单用户最大并发任务数 */
  maxConcurrentPerUser: 3,
  /** 任务最长处理时长（秒），超时标记为 failed */
  maxProcessingSeconds: 30 * 60,
} as const;
