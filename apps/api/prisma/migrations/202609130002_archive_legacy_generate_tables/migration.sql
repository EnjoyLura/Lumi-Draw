-- P4 清理：旧生图任务表改名归档（数据保留，供对账/回溯）
ALTER TABLE "generate_jobs" RENAME TO "legacy_generate_jobs";
ALTER TABLE "generate_results" RENAME TO "legacy_generate_results";
