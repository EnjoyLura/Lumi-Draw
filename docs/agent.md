# Lumi-Draw AI Agent 开发指导文档

## 项目配置信息

### 微信配置
```bash
WX_APPID=wxbb3da1bed70db50f
WX_APPSECRET=30f3dc0e253e740e9c76a34eab3c9652
WX_MCH_ID=1114583055
WX_MCH_API_KEY=lbh45082120020908307718894800646
```

### KIE.AI 配置
```bash
KIE_API_BASE=https://api.kie.ai
KIE_API_KEY=009ee8a806d45dbda1a2bc37ef3a2165
KIE_CALLBACK_URL=https://ejoyflie.cloud/api/generate/callback
```

### 阿里云 OSS 配置
```bash
OSS_ACCESS_KEY_ID=YOUR_OSS_ACCESS_KEY_ID
OSS_ACCESS_KEY_SECRET=YOUR_OSS_ACCESS_KEY_SECRET
OSS_BUCKET=lumidraw
OSS_ENDPOINT=oss-cn-beijing.aliyuncs.com
```

### 服务器信息
```bash
服务器IP: 122.51.235.145
域名: ejoyflie.cloud (备案中，开发阶段使用IP)
```

## KIE.AI 模型接入

### 支持的 4 个模型

| 模型名称 | KIE model 字段 | 积分消耗 | 说明 |
|---------|---------------|---------|------|
| GPT Image 2 | `gpt-image-2-text-to-image` | 15 | 画质细腻，支持 1K/2K/4K |
| Nano Banana 2 | `nano-banana-2` | 8 | 速度快，性价比高 |
| Nano Banana Pro | `nano-banana-pro` | 12 | 增强版 |
| Seedream 4.5 | `seedream/4.5-text-to-image` | 10 | 写实风格 |

### API 调用方式

**统一端点**: `POST https://api.kie.ai/api/v1/jobs/createTask`

**请求头**:
```http
Authorization: Bearer {KIE_API_KEY}
Content-Type: application/json
```

**请求体**:
```json
{
  "model": "gpt-image-2-text-to-image",
  "callBackUrl": "https://ejoyflie.cloud/api/generate/callback",
  "input": {
    "prompt": "描述文本",
    "aspect_ratio": "3:4",
    "resolution": "2K"
  }
}
```

**响应**:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "taskId": "task_xxx"
  }
}
```

**查询任务状态**: `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=task_xxx`

**任务状态**: `waiting` | `queuing` | `generating` | `success` | `fail`

**成功结果**:
```json
{
  "code": 200,
  "data": {
    "taskId": "task_xxx",
    "state": "success",
    "resultJson": "{\"resultUrls\":[\"https://xxx.jpg\"]}"
  }
}
```

## 项目目录结构

```
Lumi-Draw/
├── docs/                    # 项目文档
├── server/                  # NestJS 后端
│   ├── src/
│   │   ├── modules/        # 业务模块
│   │   │   ├── auth/       # 认证模块
│   │   │   ├── user/       # 用户模块
│   │   │   ├── work/       # 作品模块
│   │   │   ├── generate/   # AI生成模块
│   │   │   ├── payment/    # 支付模块
│   │   │   ├── admin/      # 管理后台模块
│   │   │   ├── oss/        # OSS存储模块
│   │   │   └── notification/ # 通知模块
│   │   ├── common/         # 公共模块
│   │   └── app.module.ts
│   ├── Dockerfile
│   └── package.json
├── miniapp/                # uni-app 小程序
│   ├── src/
│   │   ├── pages/         # 页面
│   │   ├── components/    # 组件
│   │   ├── utils/         # 工具
│   │   └── store/         # 状态管理
│   └── package.json
├── admin/                  # React 管理后台
│   ├── src/
│   │   ├── pages/         # 页面
│   │   ├── components/    # 组件
│   │   └── utils/         # 工具
│   └── package.json
└── docker-compose.yml      # 容器编排
```

## 技术栈版本

- **Node.js**: 22.x
- **NestJS**: 10.x
- **TypeScript**: 5.x
- **PostgreSQL**: 16
- **Redis**: 7.x
- **Vue**: 3.x
- **React**: 18.x
- **Ant Design Pro**: 6.x

## API 接口规范

### 统一响应格式
```json
{
  "code": 200,
  "msg": "success",
  "data": {}
}
```

### 错误码定义
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 禁止访问
- `404`: 资源不存在
- `500`: 服务器内部错误

### 分页参数
```typescript
{
  page: number;      // 页码，从1开始
  pageSize: number;  // 每页数量
  total: number;     // 总数
}
```

## 数据库规范

### 表命名
- 使用小写字母和下划线
- 复数形式：`users`, `works`, `generations`
- 关联表：`user_works`, `work_tags`

### 字段命名
- 使用小写字母和下划线
- 主键：`id` (UUID)
- 外键：`{关联表单数}_id`，如 `user_id`
- 时间字段：`created_at`, `updated_at`, `deleted_at`

### 索引命名
- 唯一索引：`uk_{表名}_{字段名}`
- 普通索引：`idx_{表名}_{字段名}`

## Git 提交规范

### 提交格式
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 类型
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具变动

### 示例
```
feat(generate): 接入GPT Image 2模型

- 实现createTask调用
- 添加callback处理
- 集成积分扣减

Closes #123
```

## 开发流程

1. 每个任务开发一个界面
2. 参考原型图确保还原度
3. 完成后自主验证（功能完整性 + 样式还原度）
4. Git commit
5. 部署到公网验证
6. 确认无误后继续下一个任务

## 注意事项

- 开发阶段使用 IP `122.51.235.145`，备案完成后替换为 `ejoyflie.cloud`
- 所有图片上传到 OSS `lumidraw` bucket
- 小程序使用微信静默登录（wx.login）
- 管理后台使用账号密码 + JWT
- AI 生成使用异步模式（BullMQ + callback）
