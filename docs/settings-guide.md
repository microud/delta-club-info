# 设置配置指南

本文档介绍「企业微信」和「AI 配置」两个设置项的配置方式，包括在第三方平台上的操作步骤和在本系统中的填写说明。

---

## 一、企业微信

### 1. 平台操作

#### 1.1 注册 / 登录企业微信管理后台

前往 [企业微信管理后台](https://work.weixin.qq.com/) 登录。如尚未注册企业，需先完成企业注册和认证。

#### 1.2 获取企业 ID (CorpId)

1. 登录管理后台后，点击左侧菜单「我的企业」
2. 滚动到页面底部，找到「企业 ID」字段
3. 复制该 ID，后续填入系统配置

#### 1.3 创建自建应用

1. 在管理后台左侧菜单点击「应用管理」
2. 在「自建」区域点击「创建应用」
3. 填写应用名称、Logo、可见范围等信息
4. 创建完成后进入应用详情页

#### 1.4 获取 AgentId 和 Secret

1. 在应用详情页顶部可以看到 **AgentId**
2. 在「Secret」一栏点击「查看」，通过企业微信扫码验证后获取 **Secret**
3. 复制保存这两个值

#### 1.5 配置接收消息回调（可选）

如需接收用户消息或事件回调：

1. 在应用详情页找到「接收消息」设置
2. 点击「设置 API 接收」
3. 填入回调 URL（即本系统的回调接口地址）
4. 系统会自动生成 **Token** 和 **EncodingAESKey**，也可自定义
5. 复制保存 Token 和 EncodingAESKey

### 2. 系统配置

在管理后台左侧菜单「设置 → 企业微信」中填入以下信息：

| 字段 | 说明 | 是否必填 |
|------|------|----------|
| 企业 ID (CorpId) | 「我的企业」页面中获取 | 是 |
| 应用 AgentId | 自建应用详情页中获取 | 是 |
| 应用 Secret | 自建应用详情页中获取，用于 API 调用鉴权 | 是 |
| Token | 接收消息回调时的签名验证 Token | 否（仅接收消息时需要） |
| EncodingAESKey | 接收消息回调时的消息加解密密钥 | 否（仅接收消息时需要） |

---

## 二、AI 配置

### 1. 平台操作

根据选用的 AI 服务商，到对应平台申请 API Key。

#### 1.1 OpenAI

1. 前往 [OpenAI Platform](https://platform.openai.com/)，注册并登录
2. 进入 **API Keys** 页面（Settings → API keys）
3. 点击「Create new secret key」，命名后创建
4. 复制生成的 API Key（仅展示一次，务必立即保存）
5. 常用模型：`gpt-4o`、`gpt-4o-mini`

#### 1.2 Anthropic

1. 前往 [Anthropic Console](https://console.anthropic.com/)，注册并登录
2. 进入 **API Keys** 页面
3. 点击「Create Key」，命名后创建
4. 复制生成的 API Key
5. 常用模型：`claude-sonnet-4-6`、`claude-haiku-4-5-20251001`

#### 1.3 DeepSeek

1. 前往 [DeepSeek 开放平台](https://platform.deepseek.com/)，注册并登录
2. 进入「API Keys」页面
3. 点击「创建 API Key」
4. 复制生成的 API Key
5. 常用模型：`deepseek-chat`、`deepseek-reasoner`

### 2. 系统配置

在管理后台左侧菜单「设置 → AI 配置」中填入以下信息：

| 字段 | 说明 | 是否必填 |
|------|------|----------|
| AI 服务商 | 选择 OpenAI / Anthropic / DeepSeek | 是 |
| API Key | 从对应平台获取的密钥 | 是 |
| Base URL | 自定义 API 端点，留空则使用各服务商默认地址 | 否 |
| 模型 | 要使用的模型名称，如 `gpt-4o`、`claude-sonnet-4-6` 等 | 是 |

#### Base URL 参考

如使用代理或自部署服务，可填写自定义 Base URL：

| 服务商 | 默认 Base URL |
|--------|--------------|
| OpenAI | `https://api.openai.com/v1` |
| Anthropic | `https://api.anthropic.com` |
| DeepSeek | `https://api.deepseek.com` |
