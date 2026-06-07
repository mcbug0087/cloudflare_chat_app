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
{ "nickname": "用户昵称" }
Response: { "data": { "token": "...", "user": { ... } } }
```

### 登录用户
```
POST /api/auth/login
Content-Type: application/json
{ "nickname": "用户昵称" }
Response: 同注册
```

## 用户接口

### 获取当前用户信息
`GET /api/users/me`

### 搜索用户
`GET /api/users/search?q=关键词`

## 好友接口

### 获取好友列表
`GET /api/friends`
Response: `{ "data": [ { "id", "nickname", "remark", "created_at" } ] }`

### 添加好友
```
POST /api/friends
{ "user_id": "目标用户ID", "remark": "备注（可选）" }
```

### 删除好友
`DELETE /api/friends/:friendId`

### 修改好友备注
```
PUT /api/friends/:friendId/remark
{ "remark": "新备注" }
```

## 私聊接口

### 获取私聊列表
`GET /api/chats/private`

### 创建私聊
```
POST /api/chats/private
{ "target_user_id": "目标用户ID" }
```

### 获取私聊消息
`GET /api/chats/private/:chatId/messages?before=&limit=50`

### 发送私聊消息
```
POST /api/chats/private/:chatId/messages
{ "content": "消息内容" }
```

## 群聊接口

### 创建群聊
```
POST /api/groups
{ "name": "群名称" }
Response: 包含 group_code（9位随机数字）
```

### 获取我的群聊列表
`GET /api/groups`

### 通过群号搜索群
`GET /api/groups/search?code=123456789`

### 获取群聊详情（含成员列表和当前用户角色）
`GET /api/groups/:groupId`
Response: `{ "data": { "group", "members", "my_role" } }`

### 修改群名称
```
PUT /api/groups/:groupId
{ "name": "新群名称" }
```
权限：群主/管理员

### 解散群聊（清除所有聊天记录）
`DELETE /api/groups/:groupId`
权限：仅群主。解散后删除该群所有消息。

### 加入群聊
`POST /api/groups/:groupId/join`

### 退出群聊
`POST /api/groups/:groupId/leave`

### 踢人
`DELETE /api/groups/:groupId/members/:userId`
权限：群主可踢任何人，管理员可踢普通成员

### 转让群主
```
PUT /api/groups/:groupId/owner
{ "new_owner_id": "新群主ID" }
```
权限：仅群主

### 设置/取消管理员
`PUT /api/groups/:groupId/admins/:userId`
权限：仅群主

### 邀请好友进群
```
POST /api/groups/:groupId/invite
{ "target_user_id": "用户ID" }
```
权限：群主/管理员

### 设置群昵称
```
PUT /api/groups/:groupId/nickname/:userId
{ "group_nickname": "群昵称" }
```
权限：群主/管理员

### 获取群聊消息
`GET /api/groups/:groupId/messages?before=&limit=50`

### 发送群聊消息
```
POST /api/groups/:groupId/messages
{ "content": "消息内容" }
```
发送者若有群昵称则显示群昵称

## WebSocket 协议

### 连接
`wss://your-domain/ws?token=<session_token>&chat_id=<chat_id>&chat_type=private|group`

### 客户端 -> 服务端
```json
{ "type": "ping" }
{ "type": "typing", "chat_id": "xxx", "chat_type": "private|group", "is_typing": true }
```

### 服务端 -> 客户端
```json
{ "type": "pong" }
{ "type": "user_online", "user_id": "xxx", "nickname": "xxx" }
{ "type": "user_offline", "user_id": "xxx" }
{ "type": "typing", "chat_id": "xxx", "user_id": "xxx", "nickname": "xxx", "is_typing": true }
{ "type": "new_message", "chat_type": "private|group", "chat_id": "xxx", "message": { ... } }
{ "type": "group_update", "chat_id": "xxx", "action": "name_change|member_join|member_leave|member_kicked|owner_change|admin_change|disband", "data": { ... } }
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