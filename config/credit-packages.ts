/**
 * 积分包配置（一次性购买）
 * ----------------------------------------------
 * 用户除订阅外，可按需购买额外积分包。
 * 每个积分包有独立的有效期，从购买时刻起算。
 */

export interface CreditPackageConfig {
  code: string;
  name: string;
  description?: string;
  /** 积分数量 */
  credits: number;
  /** 价格（美分） */
  price: number;
  /** 有效期天数（从购买时起算） */
  validityDays: number;
  /** Stripe Price ID */
  stripePriceId?: string;
  /** 是否热门 */
  isPopular?: boolean;
  /** 排序 */
  sortOrder: number;
}

export const CREDIT_PACKAGES: CreditPackageConfig[] = [
  {
    code: 'pack_100',
    name: '100 积分',
    description: '适合临时加餐',
    credits: 100,
    price: 500, // $5.00
    validityDays: 90,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_100,
    sortOrder: 1,
  },
  {
    code: 'pack_500',
    name: '500 积分',
    description: '最超值选择',
    credits: 500,
    price: 1900, // $19.00
    validityDays: 180,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_500,
    isPopular: true,
    sortOrder: 2,
  },
  {
    code: 'pack_2000',
    name: '2000 积分',
    description: '大批量创作专享',
    credits: 2000,
    price: 6900, // $69.00
    validityDays: 365,
    stripePriceId: process.env.STRIPE_PRICE_ID_PACK_2000,
    sortOrder: 3,
  },
];

export function getPackageByCode(
  code: string,
): CreditPackageConfig | undefined {
  return CREDIT_PACKAGES.find((p) => p.code === code);
}

export function getPackageByStripePriceId(
  priceId: string,
): CreditPackageConfig | undefined {
  return CREDIT_PACKAGES.find((p) => p.stripePriceId === priceId);
}
