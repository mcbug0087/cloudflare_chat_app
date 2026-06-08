# Cloudflare Chat App

基于 Cloudflare Workers 的实时群聊应用，支持私聊、群聊、好友管理、实时消息推送。

## 技术栈

| 组件 | 技术 |
|------|------|
| 运行时 | Cloudflare Workers |
| 数据库 | Cloudflare D1 (SQLite) |
| 缓存 | Cloudflare KV |
| 实时通信 | Cloudflare Durable Objects + WebSocket |
| 前端 | 原生 HTML/CSS/JS（响应式） |

## 功能

- 用户注册/登录（密码认证，SHA-256 哈希）
- 修改昵称、修改密码、注销账号
- 好友系统（添加、删除、备注）
- 私聊
- 群聊（创建、加入、退出、解散）
- 群号（9位随机数字，可通过群号搜索加入）
- 群管理（邀请好友、踢人、设置管理员、转让群主、群昵称）
- 超级管理员系统（封禁/解封用户、删除用户、修改用户密码、解散任意群）
- 实时消息推送（WebSocket）
- 移动端适配
- 所有 API 鉴权

## 超级管理员

- 默认昵称：`admin`
- 默认密码：`123456`
- 首次登录建议修改密码

## 项目结构

```
├── wrangler.toml              # Wrangler 配置
├── package.json
├── tsconfig.json
├── README.md
├── API.md                     # API 接口文档
├── migrations/
│   └── 0001_init.sql          # D1 数据库初始化
├── src/
│   ├── index.ts               # Worker 入口 + 前端
│   ├── types.ts               # 类型定义
│   ├── errors.ts              # 错误处理
│   ├── db.ts                  # 数据库操作
│   ├── auth.ts                # 认证（密码哈希/验证）
│   ├── middleware.ts          # Token 校验中间件
│   ├── users.ts               # 用户 API
│   ├── chats.ts               # 私聊 API
│   ├── groups.ts              # 群聊 API
│   ├── friends.ts             # 好友 API
│   ├── admin.ts               # 超级管理员 API
│   └── ws.ts                  # WebSocket / Durable Object
└── .github/
    └── workflows/
        └── deploy.yml         # 自动部署 CI
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 Cloudflare 资源

```bash
# 创建 D1 数据库
npx wrangler d1 create chat-db

# 创建 KV 命名空间
npx wrangler kv:namespace create CHAT_KV
```

将输出的 `database_id` 和 KV `id` 填入 `wrangler.toml`。

### 3. 执行数据库迁移

```bash
npx wrangler d1 migrations apply chat-db --remote
```

### 4. 本地开发

```bash
npm run dev
```

### 5. 部署

```bash
npm run deploy
```

## GitHub Actions 自动部署

在仓库 Settings → Secrets and variables → Actions 中添加：

| Secret | 说明 |
|--------|------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token（需 Workers、D1、KV 权限） |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账户 ID |

推送代码到 `main` 分支后自动部署。

## API 文档

详见 [API.md](API.md)

## 许可证

MIT