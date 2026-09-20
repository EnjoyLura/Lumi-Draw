# 生图 API 与后台 API 配置架构重构方案

> 日期：2026-09-13。状态：待评审。
> 修订（v3.1 落地后）：协议适配器由本文的 4 个收敛为 3 个——`kie` 平台下线、`KieAdapter` 删除，其 createTask/recordInfo 形态改由 `async-http` 的请求模板 + 响应映射承载（新增 `{{callback_url}}`/`{{attempt_id}}` 占位符、响应路径可穿透字符串化 JSON、回调按平台映射解析）。管理后台「API 平台」编辑页由三步向导改为单页渐进披露，常驻字段只剩标识/名称/分组/协议/接口地址/密钥；「同一模型文生图与图生图两个上游任务名」这一信息从适配器硬编码移到模型的 `providerModelImage` 字段。
> 说明：本文件整合了同日两次独立起草的方案为唯一终稿，`docs/生图API架构重构方案.md` 为其中的先行草稿，内容已并入本文，可删除。
> 范围：`apps/api` 生图链路整体重构 + `apps/mobile` 生图客户端层重构 + `apps/admin` API 配置架构重构。按你的要求**不保留旧架构包袱**，只保留业务数据（用户、作品、积分流水、已完成任务结果）。
> 界面还原不变：小程序以 `prototype/mobile-prototype.html`、管理后台以 `prototype/admin-prototype.html` 为唯一原型依据；本文不涉及样式。原型未覆盖的配置工程能力在 §11.6 单独标注。

---

## 0. 结论摘要

当前生图链路的核心病灶是：**配置模型失控**（35 列万能配置表 + DB/env 双轨 + 硬编码散落 4 个文件）与**职责无边界**（1810 行上帝服务 + 页面即 store + 进程内长轮询）。叠加「base64 塞数据库列」「中文报错正则驱动控制流」「事务外退款无重试」「回调弱鉴权」等隐患。

重构方案一句话：**「渠道 × 上游模型 × 产品模型」三层配置 + 4 个协议适配器 + Attempt 表 + Postgres watchdog 单一推进者 + 预扣-结算-幂等退款三段计费**。新增一个上游模型 = 管理后台填一张表单（试运行验证后生效），0 发版；不引入消息队列，复用现有 Postgres，Redis 仅做配置缓存（容器已在 compose 中定义）。小程序端三处各自为政的轮询收敛为一个 Pinia 生成 store。

上线方式为全量替换（不做新旧双跑）：P0 先补资金链路集成测试做安全网，切换时未终态旧任务统一退款关闭，旧 `generate` 模块代码与旧表归档后删除。

---

## 1. 现状诊断

### 1.1 后端（apps/api）

| # | 问题 | 证据 |
|---|------|------|
| 1 | 上帝服务：状态机、计费、4 套适配器调度、故障转移、FC 回调、转存 worker、错误翻译全在一个 1810 行的类里（12 个注入依赖、一个文件 4 套状态常量） | `generate.service.ts:63-79` |
| 2 | `GenerationProvider` 35 列万能表；整份快照拆成 ~25 个 `provider*` 列冗余进 `GenerateJob`，`createJob` 与 `failoverOrRefund` 两处各一份 30 字段赋值靠人工同步 | `schema.prisma:109-150,535-600`；`generate.service.ts:391-441 vs 1380-1414` |
| 3 | 错误分类靠三张中文/英文正则表；client 层抛带业务结论的中文消息（"积分已退还"），上游改一个词分类即失效 | `generate.service.ts:112-128,1310-1321`；`change2pro.client.ts:433-435` |
| 4 | 无真正的任务推进机制：KIE 结果靠用户打开详情页懒同步；ainb 进程内 while 长轮询 30 分钟（fire-and-forget）；转存重试靠 `setInterval`；provider 轮询挂在用户 GET 请求上 | `generate.service.ts:722-739,188,172-217`；`ainb.client.ts:138-163` |
| 5 | 重启恢复缺口：崩溃后未写入上游 taskId 的 KIE 任务永久卡死，积分已扣无处退 | `generate.service.ts:172-190` |
| 6 | 适配器 if/else 大泥球 + 逐行复制（ainb ↔ change2pro 6+ 个方法重复）；模型特判散落 ≥3 处（参考图字段名、文/图生图模型名、尺寸校验）；change2pro 用 **spawn curl 子进程** + 轮询临时文件发请求 | `kie.client.ts:141-158`；`change2pro.client.ts:48-63,230-328`；`generate.service.ts:373,841-953` |
| 7 | 把整个同步响应 base64 塞进 `kie_task_id` 列，数据库当缓存 | `ainb.client.ts:292-343` |
| 8 | 回调弱鉴权：`?secret=` 查询参数、非 timing-safe 比对、未配置 secret 时完全不设防；伪造回调可触发退款并写入任意图片 URL | `generate.controller.ts:65-68`；`generate.service.ts:709-710` |
| 9 | 计费不一致：钱包退款在事务外且失败只打日志、无任何 worker 重试（用户可能永久丢积分）；部分退款「先全退再重扣」中间崩溃会重复退 | `generate.service.ts:1597-1634` |
| 10 | 同一「转存 OSS」两套实现：KIE 路径在回调请求里串行下载转存（任一张失败整单退款，上游已计费），其他路径有退避重试 | `generate.service.ts:1667-1680` vs `1129-1208` |
| 11 | 配置零缓存（每次建任务现查 5+ 张表）；平台健康度每次现扫 30 天最多 5000 条 job；admin 配置接口裸 `Record<string,unknown>` 无 DTO，120 行手写校验链；4 种管理员角色形同虚设 | `generate.service.ts:343-372`；`admin-config.service.ts:332-417,419-540` |
| 12 | 扣费/退款/failover/回调等资金链路 0 集成测试；反推提示词是收 2 积分的假功能（本地正则拼模板） | `generate.service.ts:686-706` |

### 1.2 小程序（apps/mobile）

- 创作页 2975 行、画廊页 2591 行，生成状态机内联在页面；三份互不一致的轮询（创作页 2s/5s、生成记录页 5s 且无 `onHide` 清理、画廊页 5s），无总时长上限。
- `BackendGenerateJob` 类型 3 份且已漂移（generationHistoryService 缺 `finalizing`）；`PageResult<T>` 8 份；`/app/bootstrap` 解析 5 处；`useMockData` 分支侵入 29 个文件。
- 元数据「后端 + 硬编码」双源：后端少返一项时**按下标**取 mock 顶位（`createService.ts:163-165`），列表顺序一变 UI 静默错位。
- HTTP 层无超时、无取消（`api.ts:193-218`）；错误靠 ~40 行正则翻中文且残留 `ainb|change2pro` 供应商名；进度条按「1K=60s/2K=80s/4K=120s」伪造，模拟逻辑耦合 3 处；上游「临时 URL → 永久 URL」过渡逻辑泄漏为前端手动预载补丁。

### 1.3 管理端（apps/admin）

- `api.ts` 1173 行单文件装下所有端点与类型，且类型从 mock 文件导入；15-18 个 CRUD 页面纯复制粘贴（`FOOT_STYLE` 在 21 个文件逐字重复）。
- 协议适配器枚举前端 3 种 / 后端 4 种已漂移——`generic` 适配器前端根本配不了；`QUALITY_TIERS=["1K","2K","4K"]` 写死，而质量档位是可增删的 CRUD，双源真相。
- 请求参数是自由 key-value 字符串：无 schema、无校验、无试运行——配错映射只能在真实付费生成中暴露。单 API Key、无调用日志、故障信息只有一条 `lastError`。
- 每处 `if (useMock)` 双路径；排序用 `Promise.all` 逐条全量回写（部分失败即乱序）。

**结论**：臃肿的根因是配置模型失控与职责无边界；不稳定的根因是错误无结构（正则猜）与推进靠运气（懒轮询 + 进程内 promise）。重构必须同时解决这两层，否则换多少适配器都会烂回去。

---

## 2. 参考项目与历史教训

### 2.1 GPT-Image2-Skill（`tmp/ref-gpt-image2`）

单文件 CLI（`src/gpt_image_cli/cli.py`），吸收它的「统一入口 + 归一化」纪律：

1. 生成/编辑一个入口，是否带参考图自动分派；调用方零心智负担。
2. 参数归一化集中一处：size 快捷名 → 像素、16px 步进校验（`SIZE_SHORTCUTS`）。
3. per-model quirk 隔离成单函数（gpt-image-2 拒绝 `input_fidelity` → 本地剔除），不散落。
4. 未传参数统一 `_filter_none` 剔除，不发 `null` 给上游。
5. 响应 `b64_json`/`url` 双形态统一处理；退出码语义化。
6. **计费请求禁止隐性重试**（其 HTTP 层 `max_retries=0`）：重试/换线只能是引擎层的显式决策，且先落库再提交——本方案将其立为引擎铁律。

### 2.2 infinite-canvas（`tmp/ref-infinite-canvas`）

浏览器直连多上游的画布工作台，吸收它的「可配置接入 + 任务状态机」：

1. **渠道/模型两层模型**：`ModelChannel{baseUrl,apiKey,apiFormat} × ChannelModel{name,capability,script}`，`resolveModelRequestConfig` 把模型引用解析成运行时请求配置。
2. **内置协议 + 每模型逃生舱**：多数模型走两个内置协议，长尾用自定义调用兜底；我们改造成**声明式模板适配器**（§6.4），不留服务端脚本执行面。
3. **可恢复任务状态机**：任务句柄持久化、刷新可续查；终态错误有专名，与「可续查的暂时错误」区分；轮询原语 = 间隔 + deadline。
4. **容错响应解析**：兼容 `data/images/results`、`b64_json/url`、`inlineData/inline_data` 双拼写、`{code,data,msg}` 中转站信封——上游方言差异消化在解析层。
5. **错误分类**：401/403 鉴权、429 限流、5xx 上游故障；我们据此驱动重试/换线。

**明确不抄**：apiKey 存前端 localStorage、`new Function` 跑用户脚本、前端 base64 全链路流转、`Promise.all` 裸扇出无并发控制、错误文案在 throw 点生成（应由 code → 前端映射）。

### 2.3 本仓 9/13 被回滚的 image-engine v2 尝试（制度教训）

git 历史存在一轮 9/12–9/13 的 v2 尝试（`2a3cda0`→`7bb6821`，分支 `codex/admin-original-rebuild`，备份 `D:/qoder workspace/Lumi-Draw-rollback-backups/20260913-1143-dcc8f67/`），后整体回滚。本方案：

**继承（已验证的好思想）**：catalog 门面；`clientRequestId` 幂等 + 配置 revision 乐观锁；Attempt 表思想；对外视图按 generation/storage/billing 分层；崩溃恢复提交宽限期；其检查清单（SSRF 校验、计费提交不可隐性重试、先持久化上游 taskId、FC 重试不产生新计费、退款/扣款唯一业务标识）直接纳入引擎验收标准。

**避免（它的翻车点）**：快照拆 30 列（→ 本方案 Json 单列）；tierId/styleId 字符串前缀约定（→ 结构化 id）；adapter if/else（→ 注册表）；**admin 新旧配置并存、新页面不读旧配置**（→ 一次切换、旧页直接替换）；前端先行但后端契约未实现导致真实模式必失败（→ 后端契约先行落地并测试，再切前端）。

---

## 3. 设计原则

1. **对外契约小而稳**：小程序只需要 catalog + jobs 两组动词；一切枚举由 catalog 下发，前端零硬编码。
2. **错误是数据，不是文本**：适配器抛结构化 `ProviderError`，用户文案由稳定错误码映射，彻底删除三端正则表。
3. **单一推进者**：watchdog 定时扫表（租约 + `FOR UPDATE SKIP LOCKED`）推进一切轮询/超时/转存/退款补偿；DB 是唯一事实源，进程重启不丢任务。
4. **计费请求禁止隐性重试**；attempt 先落库再提交，先持久化上游 taskId。
5. **适配新平台 = 配置，不是代码**；代码适配器只保留 4 种协议族。
6. **mock 是传输层开关**，不是页面分支：三端统一收敛到 HTTP client 层。

---

## 4. 新架构总览

```
┌─ 小程序 ──────────────┐   ┌─ 管理后台 ────────────────────────────┐
│ typed client（packages/ │   │ adapter 元数据驱动表单 + 资源 CRUD 脚手架│
│ shared 契约同源）        │   │ 试运行 / 健康 / 调用日志 / 熔断状态      │
│ Pinia 生成 store（唯一轮询）│  └───────────────┬───────────────────────┘
└──────────┬─────────────┘                   │ /admin/engine/*
           │ /api/engine/*                   ▼
┌────────────────────────── apps/api (NestJS) ──────────────────────┐
│ engine.controller(小程序)        admin-engine.controller(后台)      │
│        │                                │                          │
│  job.service(创建/查询/取消/幂等)   platform-config.service            │
│        │                          (三层配置 + Redis 缓存 + 审计)      │
│  submitter(唯一计费提交者, attempt 先行落库)                           │
│  failover(纯函数决策)  billing(预扣/结算/退款)  storage(转存状态机)     │
│        │                                                          │
│  watchdog(唯一推进者: 2-30s 扫表 + 租约 FOR UPDATE SKIP LOCKED)       │
│        │                                                          │
│  AdapterRegistry: kie │ openai-images │ gemini-image │ async-http   │
│                                                                  │
│  Postgres: provider_channels / provider_models / product_models /  │
│  generation_jobs / generation_attempts / generation_assets /       │
│  channel_metrics / config_audit_log / provider_calls               │
└──────────────────────────┬────────────────────────────────────────┘
                           ▼
            KIE.AI / ainb / change2pro / 未来任意上游
```

- **HTTP 请求即返回**：建任务只做校验、预扣、落库；`GET` 纯读 DB；所有上游交互在 submitter/watchdog。
- **watchdog 是唯一推进者**：不依赖「用户打开页面」，不引入 Redis 队列。单实例规模下 Postgres 租约扫表足够；将来多实例时按租约天然水平扩展，届时再评估消息队列。
- **回调只是提前唤醒**：校验后把该任务的 `nextPollAt` 置为立即到期，副作用全部由 watchdog 完成。

---

## 5. 数据模型

```
provider_channels（渠道：一个上游 API 站点）
  id, name, protocol            // kie | openai-images | gemini-image | async-http
  baseUrl, authMode             // bearer | header | query
  apiKeyEnc                     // AES-256-GCM 密文或 env 引用名（沿用 provider-secret 机制）
  config Json                   // 协议参数整体入 Json（headers/超时/并发/限速/熔断阈值）
  group, priority, enabled

provider_models（上游模型：渠道下的一个可调用模型）
  id, channelId, upstreamModel  // 上游真实模型名
  capabilities Json             // ["text_to_image","image_to_image"]
  paramSchema Json              // JSON Schema：参数名/类型/枚举/默认值
  quirks Json                   // 声明式特例（§6.5），消灭散落 if/else
  sizeMapping Json              // 尺寸方言：pixels | ratio-resolution | enum-map
  enabled

product_models（产品模型：C 端看到的"模型"）
  id(对外 slug), displayName, iconKey, tagline, badges, sortOrder
  candidates Json               // [{ qualityId, chain:[providerModelId 有序降级链] }]
                                // qualityId 引用 qualities 字典真实 id（不再 "1K" 字符串键）
  supportsTextToImage/ImageToImage, costCredits, enabled

generation_jobs（瘦任务行）
  id, userId, productModelId, prompt, refImageUrls Json
  qualityId, ratioId, count     // 结构化 id，引用字典表，不再 label 字符串
  status                        // queued→submitted→running→settling→
                                //   succeeded|partial|failed|cancelled
  pricing Json                  // { costCredits, walletBillNo?, walletState }
  clientRequestId               // unique(userId, clientRequestId)：客户端防重扣
  providerSnapshot Json         // 当次提交所用配置快照，单列（替代 ~25 个 provider* 列）
  errorCode(内部), userErrorCode, progress, stageKey(i18n key)
  deadlineAt, queuedAt, submittedAt, finishedAt
  leasedBy?, leaseUntil?        // watchdog 租约列
  creditsCharged, creditsRefunded

generation_attempts（新表，替代 job 行内 providerAttempts Json）
  id, jobId, chainIndex, providerModelId, state
  //   pending_submit→submitted→running→succeeded|failed|timeout|cancelled
  providerTaskId                // 上游任务句柄，提交成功后第一时间写回
  errorKind, errorCode, latencyMs, requestSnapshot Json
  nextPollAt?, pollCount?       // watchdog 轮询调度依据

generation_assets（结果资产，每图一行）
  id, jobId, index
  status                        // pending→transferring→stored|failed
  sourceUrl, sourceExpiresAt, ossKey, ossUrl, width, height, sizeBytes
  transferAttempts, nextAttemptAt
  workId                        // 全部 stored 后统一建草稿作品
```

配套表：`channel_metrics`（渠道×天：调用量/成功数/错误分型/耗时累计，attempt 终态时增量更新，健康面板不再现扫 job 表）、`config_audit_log`（配置变更 who/when/before/after）、`provider_calls`（失败请求与试运行的原始请求/响应采样，脱敏，7 天保留）。

要点：

- **产品模型与上游解耦**：每档分辨率是一条有序降级链；运营改链、换商、调价不碰代码。
- **Attempt 表是枢纽**：故障转移决策、健康统计、admin 诊断、审计全部出自这一张表。
- **资产级状态承载部分成功**：`partial` 终态 = 有 stored 有 failed，按 stored 张数结算。

---

## 6. 协议适配层

### 6.1 统一接口（注册表唯一存在于 `adapters/index.ts`）

```ts
interface ProviderAdapter {
  readonly kind: "kie" | "openai-images" | "gemini-image" | "async-http";
  submit(ctx: AdapterContext, req: NormalizedRequest): Promise<SubmitResult>;
  // SubmitResult =
  //   | { kind:"async", providerTaskId }            // 需要轮询
  //   | { kind:"inline", images: RawImage[] }       // 同步返回结果
  poll?(ctx, providerTaskId): Promise<ProviderSnapshot>;
  parseCallback?(payload: unknown): ProviderSnapshot;
}
// RawImage = { url? } | { b64?, mime? } —— url/base64 双形态在适配器内消化
// ProviderSnapshot = { state:"running"|"succeeded"|"failed",
//                      images?, errorKind?, errorCode?, raw? }
```

admin 白名单、前端枚举、表单元数据、schema 文档全部由注册表派生——**结构上不可能再漂移**（修复现状前端 3 种/后端 4 种）。

### 6.2 四个内置协议（覆盖当前全部线路）

| 协议 | 承接 | 提交 | 取结果 |
|------|------|------|--------|
| `kie` | seedream-4-5 线路 | `createTask`，回调地址带 per-job token | `recordInfo` 轮询 + 回调提前唤醒 |
| `openai-images` | ainb 线路、generic 同步线路 | `/v1/images/generations|edits`（参考图 multipart） | 响应即结果（inline）；配置了查询端点则轮询 |
| `gemini-image` | change2pro 线路 | `:generateContent`，参考图 base64 inline，`x-goog-api-key` | 响应即结果（inline） |
| `async-http` | 长尾/中转站/新上游 | 声明式模板（§6.4），即现 generic 的完善版 | 声明式轮询映射（可选） |

- **删除 spawn curl**：HTTP 统一走原生 fetch + `AbortController` 超时；multipart 统一构建；`_filter_none` 式空参数剔除。
- 响应归一化采用容错多形态解析（`data/images/results`、b64/url 双兼容）；解析失败抛 `parse` 类错误并列出实际字段，不静默猜。
- 上游不支持 `n>1` 时由引擎并发 n 次单图提交、按张计费/退款（部分失败语义天然成立）。

### 6.3 现有四个模型的迁移落点（代码零特判）

`gpt-image-2` → openai-images + quirk「拒绝 response_format」；`nano-banana-2/pro` → gemini-image + 比例吸附；`seedream-4-5` → kie + 参考图字段名进模板。ainb 平台退化为 openai-images/async-http 的一个配置实例（省约 500 行）。

### 6.4 async-http 协议（声明式逃生舱）

管理端可配置：

```
submit:   { method, path, headers{}, bodyTemplate }   // {{prompt}} {{refImages}} {{size.width}} {{params.*}}
response: { taskIdPath, errorPath }                   // JSONPath
poll:     { method, pathTemplate, intervalMs, statusPath, successValue,
            failValue, progressPath, imagesPath, imageKind:"url"|"b64" }
```

表达式求值限定为 JSONPath + 字符串模板，不执行任意代码；试运行面板即时验证。

### 6.5 quirk 机制（per-model 特例收敛点）

`provider_models.quirks` 声明开关，适配器统一读取：`dropResponseFormat`、`sizeStep:16`/`sizeMaxEdge:3840`（像素吸附）、`aspectSnap:"gemini"`、`refImageField:"image[]"|"image_urls"|…`。遇到新特例 = 加一个 quirk 类型（小改动带单测），而不是往 service 加 if。

### 6.6 错误分类决策表（唯一事实源）

```
kind: auth | forbidden | bad_request | content_policy | rate_limit
    | upstream_5xx | timeout | network | parse | quota_exhausted
```

| kind | 同线路重试 | 换线重试 | 用户文案方向 |
|------|-----------|---------|-------------|
| auth / bad_request / quota_exhausted | ✗ | ✗（配置问题，换线无意义） | 「模型暂不可用」 |
| content_policy | ✗ | ✗ | 「内容未通过安全检测」 |
| rate_limit / timeout / network / upstream_5xx | ✓（15s 内快速失败才允许，1 次） | ✓（链内下一个） | 「生成拥挤，已自动重试」 |
| parse | ✗ | ✓ | 同上 |

决策实现为纯函数 `decide(attempt, error) → retry_same | switch_provider | refund`；换线用条件 `updateMany` 乐观抢占（保留现有 `provider-attempts.ts` 中已验证正确的实现）。错误码三端同源放 `packages/shared/src/error-codes.ts`（数字分段：41001 模型不存在、41002 配置已变更、41003 积分不足、42001 上游暂不可用、42002 上游策略拒绝、42003 上游配额不足、42004 失败已退款、42005 部分失败按张退款、43001 转存失败可重试…），前端只做 `code → 文案`。

---

## 7. 任务生命周期：watchdog 单一推进者

### 7.1 机制

- 单循环定时扫表（轮询调度 2s 一轮、补偿类 30s 一轮），每类工作以「到期行」为输入：attempt 的 `nextPollAt`、job 的 `deadlineAt`、asset 的 `nextAttemptAt`、计费补偿的 `nextAttemptAt`。
- 领取即加租约（`leasedBy`/`leaseUntil` + `FOR UPDATE SKIP LOCKED`），租约超时自动回收——多实例安全，单实例零成本。
- **启动恢复并入 watchdog**：扫描即恢复，不再需要单独的 `onApplicationBootstrap` 全量逻辑；修复 KIE queued 任务永久卡死缺口（attempt 仍在 `pending_submit` → 重新提交或进入确认流程，绝不盲目重发计费请求）。

### 7.2 提交顺序（铁律）

```
attempt 落库(pending_submit) → 调 adapter.submit → 立即写回 providerTaskId(submitted)
   → 后续一切以 attempt 行为准；"已受理但响应丢失"走确认流程，不重发
```

### 7.3 各环节

- **建任务**：事务内 内容安全前置校验（敏感词 + `msg_sec_check`）→ 参考图必须本站 OSS（`assertManagedImageUrl`）→ 积分预扣（`refId=charge:{jobId}`）→ 写 job + 首个 attempt。保留 `pg_advisory_xact_lock` 与「单活跃任务」（改为读 AppSetting 可配置）。
- **轮询**：watchdog 按 `nextPollAt` 调 `adapter.poll`，间隔指数退避 2s→5s 封顶 + 抖动；真实更新 `progress/stageKey`（排队/生成中/转存中），前端删除本地伪进度公式。
- **deadline**：job 创建时即写 `deadlineAt`（按渠道配置，默认 35min，消除两处魔法数）；到点强判 timeout → 失败结算。
- **转存**：**全线路统一**一条路径——asset 落行后由 watchdog 驱动下载→OSS→stored（退避 1/3/10/30/60min，最多 6 次），全部 stored 后事务内建草稿作品 + 关联 workId。删除 KIE 同步转存特例与 `setInterval` worker。转存实现隔离在 `TransferWorker` 接口后（§13）。
- **取消**：仅 `queued`（未提交上游）可自助取消并全额退款；已提交返回明确的结构化不可取消原因。
- **熔断**：渠道级滑动窗口失败率超阈值 → 熔断 `cooldownSec`，选线自动跳过并记审计；管理端可见、可手动恢复。

---

## 8. 计费与一致性

1. **预扣**：事务内 `credits.consume(refId="charge:{jobId}")`（现有 refId 幂等保留）。微信钱包模式：扣款指令落 `walletState="pending"` 由 watchdog 补偿执行（重试 + 死信告警），调用移出关键事务但不再有「扣了不记账」窗口。
2. **结算**：全部 stored → 按 count 结算；`partial` → 按 stored 张数结算、差额一笔退（`refund:{jobId}:{n}`）；failed/cancelled → 全额退。**废除「先全退再重扣」两步式**。
3. **退款幂等**：所有退款经补偿队列由 watchdog 重试（attempts 上限 + 告警）；退款/扣款业务标识全局唯一。
4. **对账**：watchdog 每日任务——扫「charged 超 24h 未终态」「walletState=pending 超 1h」，强制终态并补退款，产出告警。
5. 文案与账务解耦：用户文案只由 `userErrorCode` 决定；「积分已退还」只在退款事务提交后才可能出现在对外视图。

---

## 9. 安全基线（本次必须修复）

- 回调：per-job 随机 `callbackToken`（URL 路径段），timing-safe 比对，未配置时拒绝而非放行；回调只做唤醒，不承载业务副作用（防伪造回调写入任意 URL / 触发退款）。
- API Key：AES-256-GCM 加密列；管理端只回显尾 4 位 hint；`duplicate` 服务器内复制；多 Key 轮换池列二期。
- 出网校验：结果 `sourceUrl` 仅允许渠道配置声明的结果域名；配置出网域名/IP 白名单校验（防 SSRF）。
- 管理端全部路由维持 AdminJwtGuard，**角色落地**：平台/密钥/定价类配置仅 `super_admin` 可写，其余角色只读（guard 现成，只差 role 校验）。

---

## 10. 对小程序的 API 契约（v2）

```
GET  /api/engine/catalog                // 免登录，一次下发全部枚举
   → { schemaVersion, revision,
       models:[{ id, displayName, icon, tagline, badges, capabilities,
                 tiers:[{ qualityId, creditsPerImage, expectedSeconds }], … }],
       qualities[], ratios[], maxCount, maxRefImages, styles[], gameplays[] }
POST /api/engine/jobs
   { clientRequestId, productModelId, qualityId, ratioId, prompt,
     refImageUrls?, count, styleId?, gameplayId? }
   → { jobId }
GET  /api/engine/jobs/:id               // 纯读 DB
GET  /api/engine/jobs?active=1          // 断线恢复
GET  /api/engine/jobs/by-request/:clientRequestId   // 幂等查找
POST /api/engine/jobs/:id/cancel
POST /api/engine/callbacks/:adapter     // 上游回调统一入口
```

- 任务视图分层：`{ status, progress, stage, assets:[{status, url?, workId?}], billing:{state,cost,refund}, failure:{code,message?} }`；图片一律返回本站 OSS 永久 URL（删除前端临时/永久 URL 补丁）。
- 提交参数只允许取 catalog 里的结构化 id（qualityId/ratioId/modelId），类型层面杜绝「展示文本当参数」（修复 1K/2K/4K 三处正则）。
- 反推提示词：纳入真实化（走同一适配器体系 + vision 能力 + 统一计费），详见 §16 决策点。

---

## 11. 管理端配置架构

### 11.1 三层配置（原型内已有对应模块，做能力升级）

| 页面（原型名） | 承载 | 关键变化 |
|----------------|------|---------|
| API 平台 | provider_channels + provider_models | 协议四选一（由注册表派生）；超时/并发/限速/熔断参数；Key hint 回显；组内排序走专用 order 接口 |
| 模型管理 | product_models 编排 | 每档质量档位的降级链可视化编辑（档位从「分辨率配置」字典动态读取，删除前端写死的 1K/2K/4K）；`模型 + 路由 + 定价 + 能力位`一个聚合表单 |
| 分辨率配置 / 尺寸比例 | qualities / ratios 字典 | 不变，成为路由维度的事实源 |

### 11.2 后端 admin-engine API（替换裸 Record 接口）

- `GET/POST/PATCH/DELETE /admin/engine/platforms(+/duplicate,/order)` + `GET /meta`（返回适配器注册表元数据：每种协议的字段清单/类型/必填/默认映射/适用 requestMode——**前端表单按它渲染，枚举永远同源**）+ `POST /:id/test`（试运行）+ `GET /:id/health`（来自 attempt/metrics 的真实成功率与错误分型）。
- DTO 全部 class-validator（消灭 `Record<string,unknown>` 与 120 行手写校验链）；服务端重新校验一切。
- 模型路由键引用 qualities/ratios 真实 id；能力位可配（删除前端恒 true 的写法）。

### 11.3 试运行（Test Run）——配置闭环的关键

配置页「发送测试请求」：后端用**草稿配置**提交一次真实调用（固定测试 prompt + 可选参考图，标记 `isTestRun` 不计费不建作品），返回归一化结果、原始响应（脱敏）、各阶段耗时、错误分类。保存前可验证，杜绝「配错映射上线才发现」。

### 11.4 可观测

- 渠道卡片读 `channel_metrics` 增量表（成功率/调用量/错误分型/P95）。
- `provider_calls` 采样查看失败请求与试运行原始报文（脱敏，7 天）。
- 熔断状态直接展示（熔断中/手动恢复）。

### 11.5 前端配置架构与 mock 收敛

- 表单按 `/meta` 元数据分组渲染（连接/鉴权/请求/响应映射五段），新建平台提供**协议预设模板**一键填充（OpenAI 兼容/Gemini/KIE/通用异步），运营只改域名和密钥。
- 通用 CRUD 脚手架：`useResource<T>()`（list/create/update/remove/reorder + 缓存失效 + 统一错误反馈）+ `ResourceTable` + schema 驱动 `ResourceForm`，覆盖 15+ 同构页面；排序改专用 order 接口；修复 7 处 `pageSize=100` 截断。
- mock 双路径拆除：`VITE_ENABLE_MOCK_DATA` 收敛到 http 传输层切换 mock transport（保留 AGENTS.md 要求的完整体验流程能力），删除每页 `useMock ? 改内存 : 调 API` 与 `mock.ts/api.ts/service.ts` 三处同步；删除类型从 mock 文件导入的反模式。
- **旧页面直接替换，不并存**（吸取 v2 尝试翻车点）：`OpsApiProvider`/`OpsModel` 重写为新架构页面。

### 11.6 需要确认的原型外扩展

试运行面板、调用日志、熔断状态为原型未覆盖的配置工程能力，计划在现有「API 平台」原型段内扩展（不新增一级导航）。若希望更克制，可先砍掉 `provider_calls` 采样页，仅保留试运行与指标数字。

---

## 12. 小程序端改造（架构与交互，不含样式）

1. **统一 typed API client**：`uni.request` 加 15s 超时；GET 单次幂等重试；提交/轮询支持取消；保留现有 401 单飞刷新（这部分是好的）。类型从 `packages/shared/src/contracts.ts` 导入，按业务域拆文件（`api/engine.ts / works.ts / users.ts / …`），删除 `unknown` 进 `as` 出与 3 份漂移的 `BackendGenerateJob`。
2. **Pinia 生成 store（收编三处轮询）**：提交（携带持久化 `clientRequestId`）→ 单例轮询（2s 起步、退避至 8s、总上限与后端 deadline 一致）→ `onHide` 暂停、`onShow` 走 `jobs?active=1` 重水合 → 终态结算（刷新积分、通知画廊）。创作页、画廊页、生成记录页全部消费同一 store；删除 `generateTaskState.ts` storage 轮询 hack 与事件总线；创作页补「取消任务」入口。
3. **catalog 单一来源**：`useCatalogStore` 唯一拉取/缓存 `/api/engine/catalog`（按 revision 失效）；删除 `createData.ts` 硬编码清单、`fallbackByIndex` 按下标兜底、5 处重复 bootstrap 解析。
4. **错误与进度**：文案按错误码映射（删除 40 行正则与供应商名残留）；进度以后端为准，本地仅按 catalog 下发的 `expectedSeconds` 做平滑过渡动画（集中一个模块）。
5. **mock 传输层收敛**：与 admin 同方案，删除 29 个文件里的 `useMockData` 分支。

---

## 13. 转存路径决策（单实现）

**推荐：API 进程内转存**（watchdog 驱动、并发上限 3、退避重试），并删除阿里云 FC 依赖与 `/generate/transfers/complete`、`/generate/executions/complete` 两个回调协议。理由：当前规模（单实例、低并发）带宽完全够用；少一个 serverless 组件、少两套回调协议，本地开发与测试显著变简单。`TransferWorker` 做成接口隔离，若日后 4K 大图转存成为带宽瓶颈，可在不动引擎其余部分的前提下把实现换回 FC。`.env.example` 中「大图不经过 API 服务器」的设计意图由此接口保留弹性。

---

## 14. 迁移与上线（全量替换，不双跑）

| 阶段 | 内容 | 验收 | 预估 |
|------|------|------|------|
| **P0 安全网** | 为扣费/退款/failover/回调补集成测试（当前 0 覆盖）；修 schema 注释漂移 | 测试全绿，线上零改动 | 0.5-1 天 |
| **P1 后端引擎** | 新表迁移 + 配置导入脚本（旧 `GenerationProvider/ModelConfig` → 三层新表）+ `engine/` 模块（job/submitter/failover/watchdog/billing/storage + 4 适配器）+ `/api/engine/*`、`/admin/engine/*`；旧 `/generate/*` 保留薄壳转调 | 接口级测试通过；mock 关闭走真实 API；旧接口行为不变 | 2-4 天（服务器阶段） |
| **P2 管理端** | `/meta` 元数据驱动表单 + CRUD 脚手架 + 试运行 + 健康/熔断面板；旧页直接替换 | 构建检查 + 表单/试运行/列表/操作反馈手测 + mock 开关可用 | 1-2 天 |
| **P3 小程序** | typed client + Pinia store + catalog store + mock 传输层收敛，切新契约 | 构建检查 + 创作全流程手测（提交/轮询/恢复/取消/失败退款）+ 原型对照 | 1-2 天 |
| **P4 切换与清理** | 一次性脚本：旧未终态任务统一退款关闭 → 域名切新 API → 冒烟 → 删除旧 `generate` 模块与旧 admin 页（执行 §15 清单）→ 旧表改名归档 | 公网验收 + `git status --short` 无敏感信息 | 0.5 天 |

执行顺序遵循项目规则：P2/P3 前端部分先本地 mock 开发调整满意，P1 在服务器 Remote SSH 阶段联调；每阶段一次 git 提交并部署公网验收。

**回滚策略**：切换前打 tag；旧表仅改名归档不删除，出问题 10 分钟内切回（切换窗口内新产生的任务按退款处理）。

---

## 15. 清理清单（重构顺带完成）

- 删除：spawn curl 调用、三张错误正则表、双轨 env 兜底分支（`kie.client.ts:173-186` 等）、`kie_task_id` 塞 base64 的用法、死代码（`createDraftWork`/`publishGenerateResult`/`resolveProviderId`/`isConfiguredFor` 系）、mobile 3 份 `BackendGenerateJob` 与 8 份 `PageResult`、admin mock 形状类型、`FOOT_STYLE` 复制粘贴。
- 文档同步：`后端API接口契约.md`、`技术文档.md` 更新为新契约；schema 注释与状态机对齐。

---

## 16. 待你拍板的决策点（已给推荐）

1. **反推提示词**：当前收 2 积分返回硬编码模板，属资损 + 口碑风险。推荐接入真实多模态视觉模型（走同一适配器体系加 `vision` 能力）；若暂不做则下线入口并停止扣费。
2. **单活跃任务限制**：推荐维持每用户同时 1 个任务（改为 AppSetting 可配置）。
3. **转存路径**：推荐进程内 watchdog 转存（§13），确认可接受删除 FC 依赖。
4. **配置生效方式**：推荐保存即生效（新任务用新配置，进行中任务走快照不受影响）+ 试运行兜底；不引入草稿/发布两步快照。
5. **平台范围确认**：4 种协议适配器（kie / openai-images / gemini-image / async-http）是否已覆盖当前全部在用上游？若还有其他在用线路请告知。

---

## 17. 后续任务拆分（遵循最小原则，每个任务一次提交并部署验收）

1. P0：资金链路集成测试安全网
2. P1：新数据模型迁移 + 配置导入脚本
3. P1：适配器注册表 + kie 适配器
4. P1：openai-images 适配器（含 ainb 配置化）
5. P1：gemini-image + async-http 适配器
6. P1：submitter + failover（attempt 表 + 快照单列）
7. P1：watchdog（轮询/超时/恢复/熔断）
8. P1：billing 三段计费 + 退款补偿 + 对账
9. P1：统一转存 + 回调安全改造 + `/api/engine/*` 契约
10. P2：管理端 meta 表单 + 渠道/模型页
11. P2：管理端产品模型编排 + 试运行 + 健康
12. P3：小程序 typed client + catalog store
13. P3：小程序 Pinia 生成 store 收编三处轮询
14. P4：切换、旧代码下线与归档
