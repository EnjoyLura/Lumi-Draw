# 露米绘画 AI 后端 API 接口契约

## 1. 目标与边界

本文档用于指导服务器端 AI 在 `apps/api` 中实现 NestJS 后端，并让小程序前端与管理后台前端在关闭模拟数据开关后接入真实接口。

后端第一阶段目标：

- 提供统一 REST API，基础路径为 `/api`。
- 支持微信静默登录、用户资料、积分、作品、配置、AI 生成任务、支付、审核和管理后台。
- 保留前端模拟数据开关；开关开启时前端走 mock，关闭时走本文档接口。
- KIE.AI 统一由后端发起任务、接收回调、轮询兜底，前端不直接持有 KIE Key。
- OSS 上传、微信支付、微信内容审核等敏感能力全部由后端签名或代理。

非目标：

- 不在前端保存任何真实密钥。
- 不让小程序直接请求 KIE、OSS 管理接口、微信支付商户接口。
- 不在本文档写真实密钥值。

## 2. 通用约定

### 2.1 基础 URL

本地开发：

```text
http://localhost:3000/api
```

生产环境：

```text
https://ejoyflie.cloud/api
```

### 2.2 认证

小程序用户接口：

```http
Authorization: Bearer <accessToken>
```

管理后台接口：

```http
Authorization: Bearer <adminAccessToken>
```

内部回调接口：

```http
X-Callback-Secret: <server-side-secret>
```

### 2.3 通用响应

成功：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

失败：

```json
{
  "code": 40001,
  "message": "未登录",
  "data": null,
  "requestId": "req_xxx"
}
```

分页：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [],
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasMore": true
  }
}
```

### 2.4 通用请求头

| Header | 必填 | 说明 |
| --- | --- | --- |
| `Authorization` | 登录后必填 | Bearer Token |
| `X-Request-Id` | 否 | 前端生成请求追踪 ID |
| `Idempotency-Key` | 支付、生成、发布建议必填 | 幂等键 |
| `X-Client` | 否 | `mp-weixin`、`admin-web` |
| `X-App-Version` | 否 | 客户端版本 |

### 2.5 错误码

| code | 说明 |
| --- | --- |
| `0` | 成功 |
| `40000` | 参数错误 |
| `40001` | 未登录或 token 失效 |
| `40003` | 无权限 |
| `40004` | 资源不存在 |
| `40009` | 幂等冲突 |
| `40020` | 积分不足 |
| `40021` | 生成任务不存在 |
| `40022` | 生成任务状态不可操作 |
| `40030` | 内容审核不通过 |
| `40040` | 支付状态异常 |
| `50000` | 服务内部错误 |
| `50200` | 上游 AI 平台异常 |
| `50300` | 队列繁忙 |

### 2.6 枚举

```ts
type WorkStatus = "draft" | "pending" | "published" | "rejected" | "offline";
type ReviewStatus = "pending" | "approved" | "rejected";
type ReportStatus = "pending" | "processing" | "resolved" | "ignored";
type GenerateMode = "text-to-image" | "image-to-image";
type GenerateJobStatus = "queued" | "running" | "succeeded" | "partial_failed" | "failed" | "cancelled";
type PaymentStatus = "pending" | "paid" | "closed" | "failed" | "refunded";
type TransactionType = "recharge" | "consume" | "refund" | "checkin" | "invite" | "membership" | "adjust";
type AdminRole = "super_admin" | "operator" | "auditor" | "finance";
```

## 3. 数据模型摘要

### 3.1 User

```ts
interface User {
  id: number;
  openId: string;
  unionId?: string;
  nickname: string;
  avatarUrl?: string;
  avatarText: string;
  bio?: string;
  gender?: "unknown" | "male" | "female";
  credits: number;
  memberPlan?: string;
  memberExpireAt?: string;
  status: "normal" | "banned";
  createdAt: string;
  updatedAt: string;
}
```

### 3.2 Work

```ts
interface Work {
  id: number;
  userId: number;
  author: UserBrief;
  title: string;
  description: string;
  prompt: string;
  imageUrl: string;
  width: number;
  height: number;
  modelId: string;
  modelName: string;
  ratio: string;
  quality: string;
  style?: string;
  status: WorkStatus;
  isPublic: boolean;
  featured: boolean;
  recommend: boolean;
  likes: number;
  favorites: number;
  remakes: number;
  liked: boolean;
  favorited: boolean;
  createdAt: string;
}
```

### 3.3 GenerateJob

```ts
interface GenerateJob {
  id: string;
  userId: number;
  mode: GenerateMode;
  modelId: string;
  prompt: string;
  inputImageUrl?: string;
  ratio: string;
  quality: string;
  style?: string;
  count: number;
  costCredits: number;
  refundCredits: number;
  status: GenerateJobStatus;
  progress: number;
  stageText: string;
  kieTaskId?: string;
  results: GenerateResult[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}
```

### 3.4 GenerateResult

```ts
interface GenerateResult {
  id: string;
  jobId: string;
  status: "succeeded" | "failed";
  imageUrl?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  ossKey?: string;
  errorMessage?: string;
  workId?: number;
}
```

## 4. 小程序 API

### 4.1 认证

#### POST `/auth/wechat/login`

微信静默登录。前端调用 `wx.login` 获取 `code` 后提交。

请求：

```json
{
  "code": "wx_login_code"
}
```

响应：

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "expiresIn": 7200,
  "user": {
    "id": 1,
    "nickname": "云端造梦师",
    "avatarUrl": "",
    "avatarText": "梦",
    "credits": 1280,
    "memberPlan": "季卡"
  }
}
```

后端动作：

- 使用微信 `jscode2session` 换取 `openid`。
- openid 不存在则创建用户。
- 返回短期 access token 和 refresh token。

#### POST `/auth/refresh`

请求：

```json
{
  "refreshToken": "jwt"
}
```

响应同登录 token 字段。

#### POST `/auth/logout`

登出当前 refresh token。

#### GET `/auth/me`

返回当前用户资料、积分、会员状态、未读消息数。

### 4.2 用户与个人中心

#### GET `/users/me`

返回当前用户完整资料。

#### PATCH `/users/me`

请求：

```json
{
  "nickname": "新昵称",
  "avatarUrl": "https://...",
  "bio": "简介",
  "gender": "female"
}
```

#### GET `/users/:id/profile`

用户主页。

查询参数：

| 参数 | 说明 |
| --- | --- |
| `tab` | `works`、`liked` |
| `page` | 页码 |
| `pageSize` | 每页数量 |

#### POST `/users/:id/follow`

关注用户。

#### DELETE `/users/:id/follow`

取消关注。

#### GET `/users/me/follows`

关注列表。

查询参数：`type=following|followers&page=1&pageSize=20`

### 4.3 首页与公共配置

#### GET `/app/bootstrap`

小程序启动首屏聚合接口。

响应：

```json
{
  "user": null,
  "banners": [],
  "gameplays": [],
  "categories": [],
  "hotSearches": [],
  "models": [],
  "styles": [],
  "qualities": [],
  "ratios": [],
  "rechargeTiers": [],
  "memberPlans": [],
  "settings": {
    "reviewMode": "auto",
    "manualReviewEnabled": true
  }
}
```

#### GET `/config/banners`

走马灯。

#### GET `/config/gameplays`

玩法模板。

#### GET `/config/styles`

风格列表。

#### GET `/config/categories`

分类列表。

#### GET `/config/hot-searches`

热搜列表。

#### GET `/config/models`

AI 模型列表。

#### GET `/config/qualities`

分辨率配置。

#### GET `/config/ratios`

尺寸比例。

#### GET `/config/changelog`

更新日志。

#### GET `/config/agreements/:type`

协议内容。

`type`：`user`、`privacy`、`membership`。

### 4.4 作品与广场

#### GET `/works/feed`

首页推荐/最新。

查询参数：

| 参数 | 说明 |
| --- | --- |
| `tab` | `recommend`、`latest` |
| `page` | 页码 |
| `pageSize` | 每页数量 |

#### GET `/works/plaza`

广场作品。

查询参数：

| 参数 | 说明 |
| --- | --- |
| `categoryId` | 分类 |
| `sort` | `hot`、`latest` |
| `page` | 页码 |
| `pageSize` | 每页数量 |

#### GET `/works/search`

搜索作品。

查询参数：`keyword`、`page`、`pageSize`。

#### GET `/works/:id`

作品详情。

#### POST `/works/:id/like`

点赞。

#### DELETE `/works/:id/like`

取消点赞。

#### POST `/works/:id/favorite`

收藏。

#### DELETE `/works/:id/favorite`

取消收藏。

#### POST `/works/:id/remake`

一键同款。返回创作页需要的参数。

响应：

```json
{
  "prompt": "提示词",
  "modelId": "gpt-image-2",
  "ratio": "1:1",
  "quality": "2K",
  "style": "国风"
}
```

#### POST `/works`

发布作品。

请求：

```json
{
  "generateResultId": "result_xxx",
  "title": "作品标题",
  "description": "作品说明",
  "isPublic": true,
  "tags": ["国风"]
}
```

响应：`Work`。

#### PATCH `/works/:id`

编辑作品。

#### DELETE `/works/:id`

删除作品或移入草稿/下架，具体由 `action` 决定。

#### GET `/works/me/gallery`

我的画廊。

查询参数：`status=published|draft|pending|offline&page&pageSize`

#### GET `/works/me/drafts`

草稿箱。

#### GET `/works/me/history`

浏览记录。

#### POST `/works/:id/view`

记录浏览。

### 4.5 举报与反馈

#### POST `/reports`

举报作品。

请求：

```json
{
  "workId": 1,
  "reason": "色情低俗",
  "description": "补充说明"
}
```

#### POST `/feedback`

用户反馈。

请求：

```json
{
  "type": "Bug反馈",
  "content": "问题描述",
  "imageUrls": [],
  "wechat": "contact"
}
```

### 4.6 上传与 OSS

#### POST `/uploads/policy`

获取上传凭证或签名 URL。

请求：

```json
{
  "scene": "avatar|prompt-image|feedback|work",
  "filename": "a.png",
  "contentType": "image/png",
  "sizeBytes": 102400
}
```

响应：

```json
{
  "uploadUrl": "https://oss...",
  "method": "PUT",
  "headers": {},
  "publicUrl": "https://...",
  "ossKey": "uploads/..."
}
```

#### POST `/uploads/complete`

上传完成登记。

### 4.7 AI 生成

#### POST `/generate/jobs`

创建生成任务。

请求：

```json
{
  "mode": "text-to-image",
  "modelId": "gpt-image-2",
  "prompt": "一只猫",
  "inputImageUrl": "",
  "gameplayId": 1,
  "styleId": 2,
  "ratio": "1:1",
  "quality": "2K",
  "count": 2
}
```

响应：

```json
{
  "jobId": "job_xxx",
  "status": "queued",
  "costCredits": 30,
  "creditsAfter": 1250
}
```

后端动作：

- 校验登录、模型、积分、参数。
- 调用微信内容安全检查提示词和参考图。
- 扣减积分并创建积分流水。
- 写入 BullMQ 队列。
- Worker 调用 KIE `/api/v1/jobs/createTask`。
- 优先等待 KIE 回调，必要时用 `/api/v1/jobs/recordInfo` 轮询兜底。
- 成功图片转存 OSS。
- 失败按结果数量退还积分。

#### GET `/generate/jobs/:jobId`

查询任务状态。

响应：

```json
{
  "id": "job_xxx",
  "status": "running",
  "progress": 66,
  "stageText": "高清渲染输出，即将完成...",
  "results": [],
  "refundCredits": 0
}
```

#### POST `/generate/jobs/:jobId/cancel`

取消排队中任务。运行中任务可标记取消，但不保证 KIE 已取消。

#### POST `/generate/jobs/:jobId/retry`

重试失败任务。

#### POST `/generate/reverse-prompt`

反推提示词。

请求：

```json
{
  "imageUrl": "https://...",
  "language": "zh-CN"
}
```

响应：

```json
{
  "prompt": "反推后的提示词",
  "tags": ["写实", "人像"]
}
```

#### POST `/generate/callback`

KIE 回调地址。公网固定为：

```text
https://ejoyflie.cloud/api/generate/callback
```

要求：

- 校验回调签名或共享 secret。
- 根据 KIE task id 找到本地任务。
- 保存结果、转存 OSS、更新积分退款、触发站内消息。
- 回调必须幂等。

### 4.8 积分、签到、邀请、会员

#### GET `/credits/balance`

当前积分余额。

#### GET `/credits/records`

积分流水。

查询参数：`type=earn|spend|all&page&pageSize`

#### POST `/checkin`

每日签到。

响应：

```json
{
  "checked": true,
  "credits": 10,
  "continuousDays": 3,
  "balance": 1290
}
```

#### GET `/checkin/status`

签到状态和连续签到配置。

#### GET `/invite/summary`

邀请统计。

#### POST `/invite/bind`

绑定邀请码。

#### GET `/membership/plans`

会员方案。

#### POST `/membership/orders`

创建会员购买订单。

### 4.9 微信支付

#### POST `/payments/recharge/orders`

创建积分充值订单。

请求：

```json
{
  "tierId": 4,
  "amount": null
}
```

#### POST `/payments/membership/orders`

创建会员购买订单。

请求：

```json
{
  "planId": 2
}
```

订单响应：

```json
{
  "id": "payment_order_id",
  "orderNo": "R20260706123000ABCDEF",
  "type": "recharge",
  "status": "pending",
  "amountFen": 6800,
  "amountYuan": 68,
  "subject": "积分充值",
  "credits": 680,
  "bonusCredits": 80,
  "paymentParams": {
    "provider": "wechat",
    "configured": true,
    "timeStamp": "1720000000",
    "nonceStr": "xxx",
    "package": "prepay_id=xxx",
    "signType": "RSA",
    "paySign": "xxx"
  }
}
```

说明：开发环境 `PAYMENT_ALLOW_MOCK=true` 时 `paymentParams.provider=mock`，前端可调用 `/payments/:id/mock-complete` 完成模拟支付；生产环境微信商户证书配置不完整时返回 `configured:false` 和提示信息。

#### GET `/payments/:paymentId`

查询支付状态。

#### POST `/payments/:paymentId/mock-complete`

仅开发/测试环境可用。完成模拟支付并发放积分或会员权益。

#### POST `/payments/wechat/notify`

微信支付回调。必须幂等。

后端动作：

- 验签。
- 更新订单状态。
- 发放积分或会员权益。
- 记录交易流水。

## 5. 管理后台 API

管理后台统一前缀：

```text
/api/admin
```

### 5.1 管理员认证

#### POST `/admin/auth/login`

MVP 可先做账号密码登录；后续可接企业微信或二次验证。

请求：

```json
{
  "username": "admin",
  "password": "******"
}
```

#### GET `/admin/auth/me`

返回管理员资料和权限。

### 5.2 仪表盘

#### GET `/admin/dashboard/summary`

工作台核心指标和待办。

#### GET `/admin/dashboard/trends`

数据大屏趋势。

查询参数：`range=7d|30d`。

#### GET `/admin/dashboard/detail`

数据详情。

查询参数：`metric=users|active|works|income&range=7d`

### 5.3 用户管理

#### GET `/admin/users`

查询参数：

| 参数 | 说明 |
| --- | --- |
| `keyword` | 昵称、手机号、ID |
| `status` | `normal`、`banned` |
| `member` | 会员类型 |
| `page` | 页码 |
| `pageSize` | 每页数量 |

#### GET `/admin/users/:id`

用户详情。

#### PATCH `/admin/users/:id`

修改用户资料、状态、积分备注。

#### POST `/admin/users/:id/ban`

封禁用户。

#### POST `/admin/users/:id/unban`

解封用户。

#### POST `/admin/users/:id/credits/adjust`

人工调整积分。

请求：

```json
{
  "amount": 100,
  "reason": "人工补偿"
}
```

### 5.4 作品管理

#### GET `/admin/works`

查询参数：`keyword`、`status`、`categoryId`、`featured`、`recommend`、`page`、`pageSize`。

#### GET `/admin/works/:id`

作品详情。

#### POST `/admin/works/upload-image`

管理员上传作品图片。请求类型为 `multipart/form-data`，文件字段名为 `file`，支持 JPG、PNG、WEBP、GIF，最大 30MB。

#### POST `/admin/works`

管理员代用户直接发布作品。该接口要求管理员鉴权，作品会直接进入公开已发布状态，不创建生成任务，也不变动用户积分。

请求：

```json
{
  "userId": 1,
  "imageUrl": "https://example.com/work.jpg",
  "title": "作品标题",
  "description": "作品描述",
  "prompt": "完整提示词",
  "modelId": "gpt-image-2",
  "ratio": "1:1",
  "quality": "1K",
  "style": "写实",
  "tags": ["写实", "人像"],
  "featured": false,
  "recommend": false
}
```

#### PATCH `/admin/works/:id`

修改作品元信息。

#### POST `/admin/works/:id/feature`

设置精选。

请求：

```json
{
  "featured": true
}
```

#### POST `/admin/works/:id/recommend`

设置推荐。

#### POST `/admin/works/:id/offline`

下架。

#### POST `/admin/works/:id/restore`

恢复上架。

### 5.5 内容审核

#### GET `/admin/reviews`

作品审核列表。

查询参数：`type=work|report&status=pending|approved|rejected&page&pageSize`

#### GET `/admin/reviews/:id`

审核详情。

#### POST `/admin/reviews/:id/approve`

通过审核。

#### POST `/admin/reviews/:id/reject`

驳回。

请求：

```json
{
  "reason": "原因"
}
```

#### GET `/admin/reports`

举报列表。

#### POST `/admin/reports/:id/resolve`

处理举报。

### 5.6 运营配置

#### GET `/admin/banners`
#### POST `/admin/banners`
#### PATCH `/admin/banners/:id`
#### DELETE `/admin/banners/:id`

走马灯管理。

#### GET `/admin/gameplays`
#### POST `/admin/gameplays`
#### PATCH `/admin/gameplays/:id`
#### DELETE `/admin/gameplays/:id`

玩法模板。

#### GET `/admin/styles`
#### POST `/admin/styles`
#### PATCH `/admin/styles/:id`
#### DELETE `/admin/styles/:id`

风格管理。

#### GET `/admin/categories`
#### POST `/admin/categories`
#### PATCH `/admin/categories/:id`
#### DELETE `/admin/categories/:id`

分类管理。

#### GET `/admin/hot-searches`
#### POST `/admin/hot-searches`
#### PATCH `/admin/hot-searches/:id`
#### DELETE `/admin/hot-searches/:id`

热搜管理。

#### GET `/admin/models`
#### POST `/admin/models`
#### PATCH `/admin/models/:id`
#### DELETE `/admin/models/:id`

模型管理。

模型字段：

```ts
interface AdminModelConfig {
  id: string;
  provider: "kie";
  providerModel: "gpt-image-2" | "nano-banana-2" | "nano-banana-pro" | "seedream-4-5";
  name: string;
  description: string;
  tags: string[];
  costCredits: number;
  supportsTextToImage: boolean;
  supportsImageToImage: boolean;
  enabled: boolean;
  sort: number;
}
```

#### GET `/admin/qualities`
#### POST `/admin/qualities`
#### PATCH `/admin/qualities/:id`
#### DELETE `/admin/qualities/:id`

分辨率配置。

#### GET `/admin/ratios`
#### POST `/admin/ratios`
#### PATCH `/admin/ratios/:id`
#### DELETE `/admin/ratios/:id`

尺寸比例。

### 5.7 财务管理

#### GET `/admin/finance/summary`

财务概览。

#### GET `/admin/recharge-tiers`
#### POST `/admin/recharge-tiers`
#### PATCH `/admin/recharge-tiers/:id`
#### DELETE `/admin/recharge-tiers/:id`

充值方案。

#### GET `/admin/member-plans`
#### POST `/admin/member-plans`
#### PATCH `/admin/member-plans/:id`
#### DELETE `/admin/member-plans/:id`

会员方案。

#### GET `/admin/checkin-config`
#### PUT `/admin/checkin-config`

签到配置。

#### GET `/admin/invite-config`
#### PUT `/admin/invite-config`

邀请配置。

#### GET `/admin/transactions`

交易记录。

查询参数：`type`、`status`、`userId`、`dateStart`、`dateEnd`、`page`、`pageSize`。

#### GET `/admin/credits/config`
#### PUT `/admin/credits/config`

积分基础配置。

### 5.8 消息管理

#### GET `/admin/announcements`
#### POST `/admin/announcements`
#### PATCH `/admin/announcements/:id`
#### DELETE `/admin/announcements/:id`

弹窗公告。

#### GET `/admin/pushes`
#### POST `/admin/pushes`
#### PATCH `/admin/pushes/:id`
#### POST `/admin/pushes/:id/send`
#### POST `/admin/pushes/:id/revoke`

系统通知。

#### GET `/admin/feedback`
#### GET `/admin/feedback/:id`
#### PATCH `/admin/feedback/:id`
#### POST `/admin/feedback/:id/reply`

用户反馈。

### 5.9 系统设置

#### GET `/admin/settings`
#### PUT `/admin/settings`

系统设置。

#### GET `/admin/review-settings`
#### PUT `/admin/review-settings`

审核设置。

字段：

```ts
interface ReviewSettings {
  wxTextSecCheckEnabled: boolean;
  wxImageSecCheckEnabled: boolean;
  manualReviewEnabled: boolean;
  autoPublishAfterPass: boolean;
}
```

#### GET `/admin/sensitive-words`
#### POST `/admin/sensitive-words`
#### DELETE `/admin/sensitive-words/:id`

敏感词管理。

#### GET `/admin/versions`
#### POST `/admin/versions`
#### PATCH `/admin/versions/:id`
#### DELETE `/admin/versions/:id`

版本管理。

#### GET `/admin/agreements`
#### GET `/admin/agreements/:type`
#### PUT `/admin/agreements/:type`

协议管理。

## 6. 后端模块建议

`apps/api` 建议模块：

```text
src/
  main.ts
  app.module.ts
  common/
    dto/
    filters/
    guards/
    interceptors/
  config/
  auth/
  users/
  works/
  generate/
  payments/
  credits/
  membership/
  checkin/
  invite/
  uploads/
  config-center/
  review/
  admin/
  queue/
  oss/
  kie/
  wechat/
```

## 7. 数据库表建议

MVP 必需表：

- `users`
- `admin_users`
- `refresh_tokens`
- `works`
- `work_interactions`
- `follows`
- `generate_jobs`
- `generate_results`
- `credit_accounts`
- `credit_transactions`
- `payment_orders`
- `member_plans`
- `user_memberships`
- `checkin_records`
- `invite_records`
- `reports`
- `feedback`
- `notifications`
- `announcements`
- `banners`
- `gameplays`
- `styles`
- `categories`
- `hot_searches`
- `model_configs`
- `quality_configs`
- `ratio_configs`
- `review_records`
- `sensitive_words`
- `agreements`
- `versions`
- `upload_assets`

## 8. 前端联调顺序

### 第 1 阶段：后端基础可运行

1. 新建 `apps/api`。
2. `/api/health`。
3. 环境变量校验。
4. Docker Compose 接入 PostgreSQL、Redis。
5. 全局响应封装和错误码。

### 第 2 阶段：只读接口替换 mock

1. `/app/bootstrap`。
2. `/config/*`。
3. `/works/feed`、`/works/plaza`、`/works/search`、`/works/:id`。
4. `/admin/dashboard/*`。
5. `/admin/users`、`/admin/works`、`/admin/*` 配置类列表。

### 第 3 阶段：登录与用户态

1. `/auth/wechat/login`。
2. `/auth/me`。
3. `/users/me`。
4. 关注、点赞、收藏、浏览记录。

### 第 4 阶段：创作闭环

1. `/uploads/policy`。
2. `/generate/jobs`。
3. BullMQ Worker。
4. KIE createTask。
5. `/generate/callback`。
6. OSS 转存。
7. 作品发布。

### 第 5 阶段：支付与积分

1. `/payments/recharge/orders`。
2. `/payments/membership/orders`。
3. `/payments/wechat/notify`。
4. 积分流水。
5. 会员订单。

### 第 6 阶段：审核与运营

1. 微信内容审核。
2. 人工审核后台。
3. 举报/反馈处理。
4. 运营配置 CRUD。

## 9. 验收标准

进入后端联调完成态需要满足：

- 小程序关闭 mock 后可以静默登录。
- 首页、广场、搜索、作品详情读取真实接口。
- 创作页可以创建任务、轮询状态、展示 OSS 图片。
- 积分扣减、失败退款、充值到账有流水。
- 管理后台关闭 mock 后不再抛未实现错误。
- 管理后台能查看和修改用户、作品、审核、运营、财务、消息、系统配置。
- KIE 回调、微信支付回调均可重复调用且幂等。
- 所有敏感配置只存在服务器环境变量或本地 `agent.md`，不进入 Git。

## 10. 当前实现补充：作品互动 / 社交闭环

本轮真实实现统一放在 `/social` 模块下，均需要小程序用户 `Authorization: Bearer <accessToken>`。

### 10.1 作品互动

- `GET /social/works/:id/state`：返回当前用户对作品的互动状态。
  - 响应：`{ liked: boolean, favorited: boolean, following: boolean }`
- `POST /social/works/:id/view`：记录或刷新浏览记录。
  - 响应：`{ viewed: true }`
- `POST /social/works/:id/like`：点赞/取消点赞切换。
  - 响应：`{ liked: boolean, likes: number, favorites: number }`
- `POST /social/works/:id/favorite`：收藏/取消收藏切换。
  - 响应：`{ favorited: boolean, likes: number, favorites: number }`
- `POST /social/works/:id/remake`：记录一键同款次数。
  - 响应：`{ remakes: number }`

### 10.2 用户主页与关注

- `GET /social/users/:id/profile`：用户主页资料，包含 `isFollowing`。
- `GET /social/users/:id/works?page=1&pageSize=20`：用户公开作品列表。
- `POST /social/users/:id/follow`：关注用户。
  - 响应：`{ following: true, followers: number }`
- `DELETE /social/users/:id/follow`：取消关注用户。
  - 响应：`{ following: false, followers: number }`
- `GET /social/follows?type=following|followers&page=1&pageSize=50`：关注/粉丝列表。粉丝列表中的 `isFollowing` 表示当前用户是否已关注该粉丝。

### 10.3 浏览记录

- `GET /social/history?page=1&pageSize=60`：当前用户浏览记录，按 `viewedAt` 倒序。
- `DELETE /social/history`：清空当前用户浏览记录。

## 11. 当前实现补充：AI 生成任务第一阶段

本轮先实现生成任务的数据库模型、基础接口、积分预扣、查询、取消和重试骨架。BullMQ、KIE 调用、KIE 回调、OSS 转存和生成结果入库属于下一阶段。

### 11.1 已实现接口

以下接口均需要小程序用户 `Authorization: Bearer <accessToken>`。

- `POST /generate/jobs`：创建生成任务，校验模型/清晰度/比例并预扣积分。
  - 请求字段：`mode`、`modelId`、`prompt`、`inputImageUrl?`、`gameplayId?`、`style?`、`ratio`、`quality`、`count`
  - 响应字段：`jobId`、`status`、`costCredits`、`creditsAfter`、`job`
- `GET /generate/jobs?page=1&pageSize=20&status=queued`：查询当前用户生成任务列表。
- `GET /generate/jobs/:id`：查询单个生成任务详情。
- `POST /generate/jobs/:id/cancel`：取消未结束任务，并退回未退过的预扣积分。
- `POST /generate/jobs/:id/retry`：对 `failed`、`partial_failed`、`cancelled` 任务重新创建一条任务，并重新扣积分。

### 11.2 状态约定

- 当前阶段新任务状态固定从 `queued` 开始，`stageText` 为“任务已创建，等待进入生成队列”。
- `cancelled` 会写入 `cancelledAt`、`finishedAt` 和 `refundCredits`。
- 下一阶段接入队列后，由 Worker 推进 `running`、`succeeded`、`partial_failed`、`failed`，并写入 `generate_results`。
## 12. 当前实现补充：AI 生成 KIE 提交与回调

本轮在 `generate` 模块内接入 KIE Market 通用任务接口，仍保持后端持有 KIE Key，前端只访问本项目 API。

### 12.1 创建任务后的后端动作

- `POST /generate/jobs` 仍先完成模型、清晰度、比例校验，并预扣积分。
- 清晰度入参兼容 `全高清 1K` / `超清 2K` / `超高清 4K` 以及 `1K` / `2K` / `4K` 简写。
- 如果服务端配置了 KIE Key，后端会调用 `POST {KIE_API_BASE}/api/v1/jobs/createTask`。
- KIE 返回 `taskId` 后，后端写入 `generate_jobs.kieTaskId`，并把任务状态推进为 `running`。
- 如果提交 KIE 失败，任务会标记为 `failed`，并通过积分流水自动退回本次预扣积分。

### 12.2 KIE 回调

`POST /generate/callback?secret=<CALLBACK_SECRET>`

- 该接口不需要用户 JWT，但生产环境会校验 `CALLBACK_SECRET`。
- 回调根据 `taskId` 匹配 `generate_jobs.kieTaskId`。
- KIE 状态映射：
  - `waiting` / `queuing` -> `queued`
  - `generating` -> `running`
  - `success` -> `succeeded`
  - `fail` -> `failed`
- 成功回调会从 `resultJson.resultUrls`、`result_urls`、`urls`、`images`、`imageUrls` 等常见字段提取图片 URL，服务端转存到 OSS 后写入 `generate_results.imageUrl` 和 `ossKey`。
- 每张成功生成图会自动创建一条 `draft` 作品，并回填 `generate_results.workId`；用户可在画廊草稿箱或发布页继续编辑发布。
- 如果 KIE 成功但 OSS 转存失败，任务会标记为 `failed`，并幂等退回尚未退过的积分。
- 失败回调会把任务标记为 `failed`，并幂等退回尚未退过的积分。
- 重复回调如果任务已处于终态，会直接返回当前任务视图，不重复写结果或退款。

### 12.3 尚未完成

- BullMQ Worker 还未接入；当前创建接口直接提交 KIE。
- 微信内容审核与作品自动入库仍属于后续任务。

### 12.4 生成结果发布为作品

`POST /generate/results/:id/publish`

需要小程序用户 `Authorization: Bearer <accessToken>`。

请求：

```json
{
  "title": "作品标题",
  "description": "可选作品描述",
  "isPublic": true
}
```

规则：

- 只能发布当前用户自己的生成结果。
- 生成结果必须是 `succeeded` 且有可访问的 `imageUrl`。
- 同一个生成结果只能发布一次；发布后会回填 `generate_results.workId`。
- 开启人工审核时公开作品进入 `pending`；关闭人工审核时进入 `published`。
- `isPublic=false` 时保存为 `draft`。

响应：

```json
{
  "workId": 123,
  "status": "pending",
  "isPublic": true,
  "work": {
    "id": 123,
    "imageUrl": "https://lumidraw.oss-cn-beijing.aliyuncs.com/...",
    "title": "作品标题",
    "prompt": "...",
    "ratio": "1:1",
    "quality": "全高清 1K",
    "modelId": "gpt-image-2",
    "style": "",
    "status": "pending",
    "isPublic": true,
    "createdAt": "2026-07-06T00:00:00.000Z"
  }
}
```
