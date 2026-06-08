import { Env } from './types';
import { DB } from './db';
import { authMiddleware } from './middleware';
import { createSuccessResponse } from './errors';
import { Errors } from './errors';
import { register, login, changePassword, deleteAccount, hashPassword } from './auth';

export async function handleRegister(request: Request, env: Env): Promise<Response> {
  const body = await request.json<any>();
  const { nickname, password } = body;
  const result = await register(nickname, password, env);
  return createSuccessResponse(result);
}

export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const body = await request.json<any>();
  const { nickname, password } = body;
  const result = await login(nickname, password, env);
  return createSuccessResponse(result);
}

export async function handleGetMe(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  return createSuccessResponse(user);
}

export async function handleSearchUsers(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const db = new DB(env.DB);
  const users = await db.searchUsers(query);
  return createSuccessResponse(users);
}

export async function handleChangePassword(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { old_password, new_password } = body;

  if (!old_password || !new_password) {
    throw Errors.InvalidParams('旧密码和新密码不能为空');
  }

  await changePassword(user.id, old_password, new_password, env);
  return createSuccessResponse({ success: true });
}

export async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { password } = body;

  if (!password) {
    throw Errors.InvalidParams('请输入密码确认');
  }

  await deleteAccount(user.id, password, env);
  return createSuccessResponse({ success: true });
}

export async function handleChangeNickname(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { nickname } = body;

  if (!nickname || nickname.length < 1 || nickname.length > 20) {
    throw Errors.InvalidParams('昵称长度必须在 1-20 个字符之间');
  }

  const db = new DB(env.DB);
  const existing = await db.getUserByNickname(nickname);
  if (existing && existing.id !== user.id) {
    throw Errors.NicknameTaken();
  }

  await db.updateUserNickname(user.id, nickname);
  const updated = await db.getUserById(user.id);
  return createSuccessResponse(updated);
}