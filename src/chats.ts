
import { Env } from './types';
import { DB } from './db';
import { authMiddleware } from './middleware';
import { createSuccessResponse } from './errors';
import { Errors } from './errors';

export async function handleGetPrivateChats(request: Request, env: Env): Promise&lt;Response&gt; {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);
  const chats = await db.getUserPrivateChats(user.id);

  const enrichedChats = await Promise.all(chats.map(async chat =&gt; {
    const otherUserId = chat.user1_id === user.id ? chat.user2_id : chat.user1_id;
    const otherUser = await db.getUserById(otherUserId);
    return { ...chat, other_user: otherUser };
  }));

  return createSuccessResponse(enrichedChats);
}

export async function handleCreatePrivateChat(request: Request, env: Env): Promise&lt;Response&gt; {
  const user = await authMiddleware(request, env);
  const body = await request.json&lt;any&gt;();
  const { target_user_id } = body;

  if (!target_user_id) {
    throw Errors.InvalidParams('目标用户ID不能为空');
  }

  const db = new DB(env.DB);
  const targetUser = await db.getUserById(target_user_id);
  if (!targetUser) {
    throw Errors.NotFound('目标用户不存在');
  }

  let chat = await db.getPrivateChat(user.id, target_user_id);
  if (!chat) {
    chat = await db.createPrivateChat(user.id, target_user_id);
  }

  return createSuccessResponse({ ...chat, other_user: targetUser });
}

export async function handleGetPrivateChatMessages(request: Request, env: Env, chatId: string): Promise&lt;Response&gt; {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const chat = await db.getPrivateChatById(chatId);
  if (!chat) {
    throw Errors.NotFound('聊天不存在');
  }

  if (chat.user1_id !== user.id &amp;&amp; chat.user2_id !== user.id) {
    throw Errors.Forbidden();
  }

  const url = new URL(request.url);
  const before = url.searchParams.get('before');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const messages = await db.getMessages('private', chatId, before ? parseInt(before) : undefined, limit);
  return createSuccessResponse(messages);
}

export async function handleSendPrivateChatMessage(request: Request, env: Env, chatId: string): Promise&lt;Response&gt; {
  const user = await authMiddleware(request, env);
  const body = await request.json&lt;any&gt;();
  const { content } = body;

  if (!content || content.length &gt; 5000) {
    throw Errors.InvalidParams('消息内容不能为空且不能超过5000字符');
  }

  const db = new DB(env.DB);
  const chat = await db.getPrivateChatById(chatId);
  if (!chat) {
    throw Errors.NotFound('聊天不存在');
  }

  if (chat.user1_id !== user.id &amp;&amp; chat.user2_id !== user.id) {
    throw Errors.Forbidden();
  }

  const message = await db.createMessage('private', chatId, user.id, content);

  const durableObjId = env.CHAT_ROOM.idFromName(`private:${chatId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/new-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_type: 'private', chat_id: chatId, message: { ...message, nickname: user.nickname } })
  });

  return createSuccessResponse({ ...message, nickname: user.nickname });
}

