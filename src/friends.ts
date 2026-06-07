import { Env } from './types';
import { DB } from './db';
import { authMiddleware } from './middleware';
import { createSuccessResponse } from './errors';
import { Errors } from './errors';

export async function handleGetFriends(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);
  const friends = await db.getFriends(user.id);
  return createSuccessResponse(friends);
}

export async function handleAddFriend(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { user_id, remark } = body;

  if (!user_id) {
    throw Errors.InvalidParams('用户ID不能为空');
  }

  if (user_id === user.id) {
    throw Errors.InvalidParams('不能添加自己为好友');
  }

  const db = new DB(env.DB);
  const targetUser = await db.getUserById(user_id);
  if (!targetUser) {
    throw Errors.NotFound('用户不存在');
  }

  const alreadyFriend = await db.isFriend(user.id, user_id);
  if (alreadyFriend) {
    return createSuccessResponse({ success: true, message: '已经是好友' });
  }

  await db.addFriend(user.id, user_id, remark || '');

  const friendInfo = {
    id: targetUser.id,
    nickname: targetUser.nickname,
    remark: remark || '',
    created_at: Math.floor(Date.now() / 1000)
  };

  return createSuccessResponse(friendInfo);
}

export async function handleRemoveFriend(request: Request, env: Env, friendId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const isFriend = await db.isFriend(user.id, friendId);
  if (!isFriend) {
    throw Errors.NotFound('不是好友');
  }

  await db.removeFriend(user.id, friendId);
  return createSuccessResponse({ success: true });
}

export async function handleUpdateRemark(request: Request, env: Env, friendId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { remark } = body;

  const db = new DB(env.DB);
  const isFriend = await db.isFriend(user.id, friendId);
  if (!isFriend) {
    throw Errors.NotFound('不是好友');
  }

  await db.updateFriendRemark(user.id, friendId, remark);
  return createSuccessResponse({ success: true, remark });
}