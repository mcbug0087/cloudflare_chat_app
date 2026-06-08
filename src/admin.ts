import { Env } from './types';
import { DB } from './db';
import { authMiddleware } from './middleware';
import { createSuccessResponse } from './errors';
import { Errors } from './errors';
import { hashPassword } from './auth';

export async function requireSuperAdmin(request: Request, env: Env) {
  const user = await authMiddleware(request, env);
  if (user.role !== 'super_admin') {
    throw Errors.Forbidden('需要超级管理员权限');
  }
  return user;
}

export async function handleAdminGetUsers(request: Request, env: Env): Promise<Response> {
  await requireSuperAdmin(request, env);
  const db = new DB(env.DB);
  const users = await db.getAllUsers();
  return createSuccessResponse(users);
}

export async function handleAdminGetGroups(request: Request, env: Env): Promise<Response> {
  await requireSuperAdmin(request, env);
  const db = new DB(env.DB);
  const groups = await db.getAllGroups();
  return createSuccessResponse(groups);
}

export async function handleAdminBanUser(request: Request, env: Env, targetUserId: string): Promise<Response> {
  await requireSuperAdmin(request, env);
  const db = new DB(env.DB);
  const targetUser = await db.getUserById(targetUserId);
  if (!targetUser) {
    throw Errors.NotFound('用户不存在');
  }
  if (targetUser.role === 'super_admin') {
    throw Errors.Forbidden('不能封禁超级管理员');
  }
  await db.banUser(targetUserId);
  return createSuccessResponse({ success: true });
}

export async function handleAdminUnbanUser(request: Request, env: Env, targetUserId: string): Promise<Response> {
  await requireSuperAdmin(request, env);
  const db = new DB(env.DB);
  const targetUser = await db.getUserById(targetUserId);
  if (!targetUser) {
    throw Errors.NotFound('用户不存在');
  }
  await db.unbanUser(targetUserId);
  return createSuccessResponse({ success: true });
}

export async function handleAdminDeleteUser(request: Request, env: Env, targetUserId: string): Promise<Response> {
  await requireSuperAdmin(request, env);
  const db = new DB(env.DB);
  const targetUser = await db.getUserById(targetUserId);
  if (!targetUser) {
    throw Errors.NotFound('用户不存在');
  }
  if (targetUser.role === 'super_admin') {
    throw Errors.Forbidden('不能删除超级管理员账号');
  }
  await db.deleteUser(targetUserId);
  return createSuccessResponse({ success: true });
}

export async function handleAdminChangeUserPassword(request: Request, env: Env, targetUserId: string): Promise<Response> {
  await requireSuperAdmin(request, env);
  const body = await request.json<any>();
  const { new_password } = body;

  if (!new_password || new_password.length < 6) {
    throw Errors.WeakPassword('新密码长度不能少于 6 个字符');
  }

  const db = new DB(env.DB);
  const targetUser = await db.getUserById(targetUserId);
  if (!targetUser) {
    throw Errors.NotFound('用户不存在');
  }

  const newHash = await hashPassword(new_password);
  await db.updateUserPassword(targetUserId, newHash);
  return createSuccessResponse({ success: true });
}

export async function handleAdminDisbandGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  await requireSuperAdmin(request, env);
  const db = new DB(env.DB);
  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }
  await db.deleteGroupMessages(groupId);
  await db.disbandGroup(groupId);
  return createSuccessResponse({ success: true });
}

export async function handleAdminUpdateSettings(request: Request, env: Env): Promise<Response> {
  const user = await requireSuperAdmin(request, env);
  const body = await request.json<any>();
  const db = new DB(env.DB);

  if (body.nickname) {
    if (body.nickname.length < 1 || body.nickname.length > 20) {
      throw Errors.InvalidParams('昵称长度必须在 1-20 个字符之间');
    }
    const existing = await db.getUserByNickname(body.nickname);
    if (existing && existing.id !== user.id) {
      throw Errors.NicknameTaken();
    }
    await db.updateUserNickname(user.id, body.nickname);
  }

  if (body.new_password) {
    if (body.new_password.length < 6) {
      throw Errors.WeakPassword();
    }
    const newHash = await hashPassword(body.new_password);
    await db.updateUserPassword(user.id, newHash);
  }

  const updated = await db.getUserById(user.id);
  return createSuccessResponse(updated);
}