
# Cloudflare Chat API 文档

## 基础信息
- 所有 API 路径前缀为 `/api`
- 除注册和登录外，所有请求需在 Header 中携带 `Authorization: Bearer <token>`
- 所有响应格式为 `{ data?: any, error?: { code: string, message: string } }`

## 认证接口

### 注册用户
```
POST /api/auth/register
Content-Type: application/json

{
  "nickname": "用户昵称"
}

Response:
{
  "data": {
    "token": "session_token",
    "user": {
      "id": "user_id",
      "nickname": "用户昵称",
      "nickname_lower": "用户昵称",
      "created_at": 1234567890
    }
  }
}
```

### 登录用户
```
POST /api/auth/login
Content-Type: application/json

{
  "nickname": "用户昵称"
}

Response: 同注册
```

## 用户接口

### 获取当前用户信息
```
GET /api/users/me

Response:
{
  "data": {
    "id": "user_id",
    "nickname": "用户昵称",
    "nickname_lower": "用户昵称",
    "created_at": 1234567890
  }
}
```

### 搜索用户
```
GET /api/users/search?q=关键词

Response:
{
  "data": [
    {
      "id": "user_id",
      "nickname": "用户昵称",
      "nickname_lower": "用户昵称",
      "created_at": 1234567890
    }
  ]
}
```

## 私聊接口

### 获取私聊列表
```
GET /api/chats/private

Response:
{
  "data": [
    {
      "id": "chat_id",
      "user1_id": "user_id",
      "user2_id": "user_id",
      "created_at": 1234567890,
      "other_user": { /* 用户信息 */ }
    }
  ]
}
```

### 创建私聊
```
POST /api/chats/private
Content-Type: application/json

{
  "target_user_id": "目标用户ID"
}

Response:
{
  "data": { /* 私聊信息，同获取私聊列表 */ }
}
```

### 获取私聊消息
```
GET /api/chats/private/:chatId/messages?before=&limit=50

Response:
{
  "data": [
    {
      "id": "message_id",
      "chat_type": "private",
      "chat_id": "chat_id",
      "sender_id": "user_id",
      "content": "消息内容",
      "created_at": 1234567890,
      "nickname": "发送者昵称"
    }
  ]
}
```

### 发送私聊消息
```
POST /api/chats/private/:chatId/messages
Content-Type: application/json

{
  "content": "消息内容"
}

Response:
{
  "data": { /* 消息信息，同获取私聊消息 */ }
}
```

## 群聊接口

### 创建群聊
```
POST /api/groups
Content-Type: application/json

{
  "name": "群名称"
}

Response:
{
  "data": {
    "id": "group_id",
    "name": "群名称",
    "owner_id": "user_id",
    "is_active": 1,
    "created_at": 1234567890
  }
}
```

### 获取我的群聊列表
```
GET /api/groups

Response:
{
  "data": [
    { /* 群信息，同创建群聊 */ }
  ]
}
```

### 获取群聊详情
```
GET /api/groups/:groupId

Response:
{
  "data": {
    "group": { /* 群信息 */ },
    "members": [
      {
        "group_id": "group_id",
        "user_id": "user_id",
        "role": "owner|admin|member",
        "joined_at": 1234567890,
        "nickname": "用户昵称"
      }
    ]
  }
}
```

### 修改群名称
```
PUT /api/groups/:groupId
Content-Type: application/json

{
  "name": "新群名称"
}

Response:
{
  "data": { /* 更新后的群信息 */ }
}
```

### 解散群聊
```
DELETE /api/groups/:groupId

Response:
{
  "data": { "success": true }
}
```

### 加入群聊
```
POST /api/groups/:groupId/join

Response:
{
  "data": { "success": true }
}
```

### 退出群聊
```
POST /api/groups/:groupId/leave

Response:
{
  "data": { "success": true }
}
```

### 踢人
```
DELETE /api/groups/:groupId/members/:userId

Response:
{
  "data": { "success": true }
}
```

### 转让群主
```
PUT /api/groups/:groupId/owner
Content-Type: application/json

{
  "new_owner_id": "新群主ID"
}

Response:
{
  "data": { "success": true }
}
```

### 设置/取消管理员
```
PUT /api/groups/:groupId/admins/:userId

Response:
{
  "data": { "success": true }
}
```

### 获取群聊消息
```
GET /api/groups/:groupId/messages?before=&limit=50

Response: 同私聊消息
```

### 发送群聊消息
```
POST /api/groups/:groupId/messages
Content-Type: application/json

{
  "content": "消息内容"
}

Response: 同私聊消息
```

## WebSocket 协议

### 连接
```
wss://your-domain/ws?token=<session_token>&chat_id=<chat_id>&chat_type=private|group
```

### 客户端 -> 服务端消息
```json
{ "type": "ping" }
{ "type": "typing", "chat_id": "xxx", "chat_type": "private|group", "is_typing": true }
```

### 服务端 -> 客户端消息
```json
{ "type": "pong" }
{ "type": "user_online", "user_id": "xxx", "nickname": "xxx" }
{ "type": "user_offline", "user_id": "xxx" }
{ "type": "typing", "chat_id": "xxx", "user_id": "xxx", "nickname": "xxx", "is_typing": true }
{ "type": "new_message", "chat_type": "private|group", "chat_id": "xxx", "message": { /* 消息对象 */ } }
{ "type": "group_update", "chat_id": "xxx", "action": "name_change|member_join|member_leave|member_kicked|owner_change|admin_change|disband", "data": { /* 更新数据 */ } }
```

## 错误码
| 状态码 | 错误码 | 说明 |
|--------|--------|------|
| 400 | INVALID_PARAMS | 参数校验失败 |
| 401 | UNAUTHORIZED | Token 无效或过期 |
| 403 | FORBIDDEN | 无操作权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | NICKNAME_TAKEN | 昵称已被占用 |
| 410 | GROUP_DISBANDED | 群聊已解散 |
| 422 | CANNOT_KICK_SELF | 不能踢自己 |
| 422 | CANNOT_KICK_ADMIN | 管理员不能踢管理员/群主 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
