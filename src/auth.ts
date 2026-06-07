import { Env, User, AuthResult } from './types';
import { DB, generateId } from './db';
import { Errors } from './errors';

const TOKEN_EXPIRE_SECONDS = 7 * 24 * 60 * 60;

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashedInput = await hashPassword(password);
  return hashedInput === hash;
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

  const token = await createSession(user.id, env);

  return { token, user };
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
  return await db.getUserById(userId);
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