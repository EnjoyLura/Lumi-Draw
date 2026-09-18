-- Engine v3.1 自动识别返回格式：url/base64 不再由配置决定。
-- 同步平台的上游调用整条交给 FC 执行器，由它按实际响应逐张识别 url 或 base64，
-- 因此 config 中的 textResultMode / imageResultMode 键失去意义，统一清理。
-- 运行时读取对该键已不感知（readProviderConfig 只取已知键），本迁移仅为存量数据整洁。

UPDATE "generation_providers"
SET "config" = ("config" - 'textResultMode') - 'imageResultMode'
WHERE "config" ? 'textResultMode' OR "config" ? 'imageResultMode';