/**
 * 种子脚本：将 config 中的订阅计划与积分包同步到数据库
 * ------------------------------------------------------
 * 执行：pnpm db:seed
 * 幂等：已存在的记录会基于 code 更新
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, client } from './drizzle';
import { subscriptionPlans, creditPackages } from './schema';
import { SUBSCRIPTION_PLANS } from '../../config/plans';
import { CREDIT_PACKAGES } from '../../config/credit-packages';

async function seedPlans() {
  console.log('[seed] 同步订阅计划...');
  for (const plan of SUBSCRIPTION_PLANS) {
    await db
      .insert(subscriptionPlans)
      .values({
        planCode: plan.code,
        name: plan.name,
        stripePriceId: plan.stripePriceId,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: subscriptionPlans.planCode,
        set: {
          name: plan.name,
          stripePriceId: plan.stripePriceId,
          isActive: true,
          updatedAt: sql`NOW()`,
        },
      });
    console.log(`  ✓ ${plan.code} - ${plan.name}`);
  }
}

async function seedPackages() {
  console.log('[seed] 同步积分包...');
  for (const pkg of CREDIT_PACKAGES) {
    await db
      .insert(creditPackages)
      .values({
        packageCode: pkg.code,
        name: pkg.name,
        stripePriceId: pkg.stripePriceId,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: creditPackages.packageCode,
        set: {
          name: pkg.name,
          stripePriceId: pkg.stripePriceId,
          isActive: true,
          updatedAt: sql`NOW()`,
        },
      });
    console.log(`  ✓ ${pkg.code} - ${pkg.name}`);
  }
}

async function main() {
  await seedPlans();
  await seedPackages();
  console.log('[seed] 完成');
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('[seed] 失败:', err);
  process.exit(1);
});
