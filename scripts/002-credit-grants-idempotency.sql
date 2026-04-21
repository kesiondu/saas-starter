-- =============================================================================
-- 订阅/购买积分发放的幂等约束
-- =============================================================================
-- Stripe webhook 可能重复送达同一个 invoice.paid / checkout.completed 事件。
-- 通过 (user_id, source_type, source_ref) 唯一来确保同一来源只发放一次。
-- =============================================================================

BEGIN;

-- Postgres 默认 NULLS DISTINCT（多个 NULL 视为不同），因此对 bonus 等
-- source_ref=NULL 的记录不会冲突，无需写部分索引。
CREATE UNIQUE INDEX IF NOT EXISTS credit_records_source_ref_unique
  ON credit_records (user_id, source_type, source_ref);

COMMIT;
