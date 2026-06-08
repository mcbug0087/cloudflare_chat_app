import { Env, User, AuthResult } from './types';
import { DB, generateId } from './db';
import { Errors } from './errors';

const TOKEN_EXPIRE_SECONDS = 7 * 24 * 60 * 60;
const DEFAULT_ADMIN_PASSWORD = '123456';
const DEFAULT_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
}

function isDefaultPassword(user: User): boolean {
  return user.role === 'super_admin' && user.password_hash === DEFAULT_PASSWORD_HASH;
}

export async function ensureAdminAccount(env: Env): Promise<void> {
  const db = new DB(env.DB);
  const existing = await db.getUserById('admin-seed-0001');
  if (!existing) {
    await db.createUser('admin', DEFAULT_PASSWORD_HASH, 'super_admin');
  }
}

export async function register(nickname: string, password: string, env: Env): Promise<AuthResult> {
  const db = new DB(env.DB);

  if (!nickname || nickname.length < 1 || nickname.length > 20) {
    throw Errors.InvalidParams('昵称长度必须在 1-20 个字符之间');
  }

  if (!password || password.length < 6) {
    throw Errors.InvalidParams('密码长度不能少于 6 个字符');
  }

  const existingUser = await db.getUserByNickname(nickname);
  if (existingUser) {
    throw Errors.NicknameTaken();
  }

  const passwordHash = await hashPassword(password);
  const user = await db.createUser(nickname, passwordHash);
  const token = await createSession(user.id, env);

  return { token, user };
}

export async function login(nickname: string, password: string, env: Env): Promise<AuthResult> {
  const db = new DB(env.DB);

  const user = await db.getUserByNickname(nickname);
  if (!user) {
    throw Errors.NotFound('用户不存在');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw Errors.WrongPassword();
  }

  if (user.is_banned) {
    throw Errors.Banned();
  }

  const token = await createSession(user.id, env);
  const defaultPassword = isDefaultPassword(user);

  return { token, user, defaultPassword };
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string, env: Env): Promise<void> {
  const db = new DB(env.DB);

  if (!newPassword || newPassword.length < 6) {
    throw Errors.WeakPassword('新密码长度不能少于 6 个字符');
  }

  const user = await db.getUserById(userId);
  if (!user) {
    throw Errors.NotFound('用户不存在');
  }

  const valid = await verifyPassword(oldPassword, user.password_hash);
  if (!valid) {
    throw Errors.WrongPassword('旧密码错误');
  }

  const newHash = await hashPassword(newPassword);
  await db.updateUserPassword(userId, newHash);
}

export async function deleteAccount(userId: string, password: string, env: Env): Promise<void> {
  const db = new DB(env.DB);

  const user = await db.getUserById(userId);
  if (!user) {
    throw Errors.NotFound('用户不存在');
  }

  if (user.role === 'super_admin') {
    throw Errors.Forbidden('不能删除超级管理员账号');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw Errors.WrongPassword('密码错误，无法注销');
  }

  const tokenHeader = ''; // We'll clear sessions in the API handler
  await db.deleteUser(userId);
}

async function createSession(userId: string, env: Env): Promise<string> {
  const token = generateId();
  await env.CHAT_KV.put(`session:${token}`, userId, { expirationTtl: TOKEN_EXPIRE_SECONDS });
  return token;
}

export async function validateToken(token: string, env: Env): Promise<User | null> {
  const userId = await env.CHAT_KV.get(`session:${token}`);
  if (!userId) return null;

  const db = new DB(env.DB);
  const user = await db.getUserById(userId);
  if (user && user.is_banned) return null;
  return user;
}

export async function getUserFromRequest(request: Request, env: Env): Promise<User> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Errors.Unauthorized();
  }

  const token = authHeader.slice(7);
  const user = await validateToken(token, env);
  if (!user) {
    throw Errors.Unauthorized();
  }

  return user;
}