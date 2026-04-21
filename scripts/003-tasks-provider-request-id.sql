-- Provider 侧的 request id（如 Fal 的 request_id），用于 webhook 回调时定位任务
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS provider_request_id VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS tasks_provider_request_id_idx
  ON tasks (provider_request_id)
  WHERE provider_request_id IS NOT NULL;
