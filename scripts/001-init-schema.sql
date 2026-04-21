-- =============================================================================
-- C 端 AI 视频剪辑工具 - 初始化数据库 Schema
-- =============================================================================
-- 此脚本会删除旧模板的 B2B 相关表，重建 C 端用户模型。
-- 执行前请确认数据库为空或已备份。
-- =============================================================================

BEGIN;

-- --------------------------- 清理旧表（B2B 模板） ---------------------------
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ------------------------------- 1. users -----------------------------------
CREATE TABLE users (
  id                          SERIAL PRIMARY KEY,
  email                       VARCHAR(255) NOT NULL UNIQUE,
  name                        VARCHAR(100),
  avatar_url                  TEXT,
  locale                      VARCHAR(10) NOT NULL DEFAULT 'en-US',
  stripe_customer_id          VARCHAR(255) UNIQUE,
  email_notification_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
  last_login_at               TIMESTAMP
);
CREATE UNIQUE INDEX users_email_idx ON users (email);

-- -------------------------- 2. oauth_accounts -------------------------------
CREATE TABLE oauth_accounts (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider              VARCHAR(50) NOT NULL,
  provider_account_id   VARCHAR(255) NOT NULL,
  access_token          TEXT,
  refresh_token         TEXT,
  token_expires_at      TIMESTAMP,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX oauth_provider_account_idx
  ON oauth_accounts (provider, provider_account_id);
CREATE UNIQUE INDEX oauth_user_provider_idx
  ON oauth_accounts (user_id, provider);

-- ----------------------- 3. subscription_plans ------------------------------
CREATE TABLE subscription_plans (
  id                  SERIAL PRIMARY KEY,
  plan_code           VARCHAR(50) NOT NULL UNIQUE,
  name                VARCHAR(100) NOT NULL,
  stripe_product_id   VARCHAR(255),
  stripe_price_id     VARCHAR(255),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ----------------------- 4. user_subscriptions ------------------------------
CREATE TABLE user_subscriptions (
  id                      SERIAL PRIMARY KEY,
  user_id                 INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id                 INTEGER NOT NULL REFERENCES subscription_plans(id),
  stripe_subscription_id  VARCHAR(255) UNIQUE,
  status                  VARCHAR(30) NOT NULL,
  current_period_start    TIMESTAMP NOT NULL,
  current_period_end      TIMESTAMP NOT NULL,
  cancel_at_period_end    BOOLEAN NOT NULL DEFAULT FALSE,
  canceled_at             TIMESTAMP,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX user_subscriptions_user_status_idx
  ON user_subscriptions (user_id, status);

-- ------------------------- 5. credit_packages -------------------------------
CREATE TABLE credit_packages (
  id                  SERIAL PRIMARY KEY,
  package_code        VARCHAR(50) NOT NULL UNIQUE,
  name                VARCHAR(100) NOT NULL,
  stripe_product_id   VARCHAR(255),
  stripe_price_id     VARCHAR(255),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- -------------------------- 6. credit_records -------------------------------
CREATE TABLE credit_records (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credits_total   INTEGER NOT NULL,
  credits_used    INTEGER NOT NULL DEFAULT 0,
  source_type     VARCHAR(30) NOT NULL,         -- subscription | purchase | bonus
  source_ref      VARCHAR(255),
  expires_at      TIMESTAMP NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (credits_used >= 0),
  CHECK (credits_used <= credits_total)
);
-- 查询用户可用积分的主索引（剔除过期）
CREATE INDEX credit_records_user_active_idx
  ON credit_records (user_id, expires_at);

-- 8. tasks（先建，因 credit_transactions 引用）--------------------------------
CREATE TABLE tasks (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type       VARCHAR(50) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'pending',
  credits_cost    INTEGER NOT NULL DEFAULT 0,
  input_params    JSONB NOT NULL,
  output_url      TEXT,
  error_message   TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP
);
CREATE INDEX tasks_user_status_idx   ON tasks (user_id, status);
CREATE INDEX tasks_user_created_idx  ON tasks (user_id, created_at);

-- ----------------------- 7. credit_transactions -----------------------------
CREATE TABLE credit_transactions (
  id                  SERIAL PRIMARY KEY,
  user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credit_record_id    INTEGER NOT NULL REFERENCES credit_records(id),
  task_id             INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  amount              INTEGER NOT NULL,
  reason              VARCHAR(50) NOT NULL,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX credit_tx_user_created_idx
  ON credit_transactions (user_id, created_at);

-- -------------------------- 9. notifications --------------------------------
CREATE TABLE notifications (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type              VARCHAR(50) NOT NULL,
  title             VARCHAR(255) NOT NULL,
  content           TEXT,
  related_task_id   INTEGER REFERENCES tasks(id) ON DELETE SET NULL,
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  is_email_sent     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX notifications_user_unread_idx
  ON notifications (user_id, is_read);

COMMIT;
