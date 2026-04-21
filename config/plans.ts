/**
 * 订阅计划配置
 * ----------------------------------------------
 * 在此修改订阅计划的名称、价格、赠送积分、积分有效期等。
 * Stripe Price ID 从环境变量读取。
 *
 * 修改后需运行 seed 脚本同步到数据库 subscription_plans 表。
 */

export type PlanCode = 'free' | 'pro' | 'premium';

export interface SubscriptionPlanConfig {
  code: PlanCode;
  name: string;
  description: string;
  /** 月费（美分） */
  priceMonthly: number;
  /** 每月赠送积分数 */
  creditsPerMonth: number;
  /** 赠送积分的有效天数（从发放日起算） */
  creditValidityDays: number;
  /** Stripe Price ID（生产环境建议用环境变量） */
  stripePriceId?: string;
  /** 功能亮点列表，用于前端定价页展示 */
  features: string[];
  /** 排序（越小越靠前） */
  sortOrder: number;
  /** 是否默认/推荐 */
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanConfig[] = [
  {
    code: 'free',
    name: 'Free',
    description: '适合初次体验的用户',
    priceMonthly: 0,
    creditsPerMonth: 30,
    creditValidityDays: 30,
    stripePriceId: undefined,
    features: ['每月 30 积分', '基础视频剪辑能力', '720p 输出', '社区支持'],
    sortOrder: 1,
  },
  {
    code: 'pro',
    name: 'Pro',
    description: '专业创作者的首选',
    priceMonthly: 1900,
    creditsPerMonth: 500,
    creditValidityDays: 30,
    stripePriceId: process.env.STRIPE_PRICE_ID_PRO,
    features: [
      '每月 500 积分',
      '全部视频剪辑功能',
      '1080p 输出',
      '优先队列',
      '邮件支持',
    ],
    sortOrder: 2,
    isPopular: true,
  },
  {
    code: 'premium',
    name: 'Premium',
    description: '面向团队与重度用户',
    priceMonthly: 4900,
    creditsPerMonth: 2000,
    creditValidityDays: 60,
    stripePriceId: process.env.STRIPE_PRICE_ID_PREMIUM,
    features: [
      '每月 2000 积分',
      '4K 输出',
      '最高优先级队列',
      '24/7 专属客服',
      'API 访问（预留）',
    ],
    sortOrder: 3,
  },
];

export function getPlanByCode(
  code: PlanCode,
): SubscriptionPlanConfig | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.code === code);
}

export function getPlanByStripePriceId(
  priceId: string,
): SubscriptionPlanConfig | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.stripePriceId === priceId);
}
