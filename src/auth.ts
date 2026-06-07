
import { Env, User, AuthResult } from './types';
import { DB, generateId } from './db';
import { Errors } from './errors';

const TOKEN_EXPIRE_SECONDS = 7 * 24 * 60 * 60;

export async function register(nickname: string, env: Env): Promise&lt;AuthResult&gt; {
  const db = new DB(env.DB);

  if (!nickname || nickname.length &lt; 1 || nickname.length &gt; 20) {
    throw Errors.InvalidParams('昵称长度必须在 1-20 个字符之间');
  }

  const existingUser = await db.getUserByNickname(nickname);
  if (existingUser) {
    throw Errors.NicknameTaken();
  }

  const user = await db.createUser(nickname);
  const token = await createSession(user.id, env);

  return { token, user };
}

export async function login(nickname: string, env: Env): Promise&lt;AuthResult&gt; {
  const db = new DB(env.DB);

  const user = await db.getUserByNickname(nickname);
  if (!user) {
    throw Errors.NotFound('用户不存在');
  }

  const token = await createSession(user.id, env);

  return { token, user };
}

async function createSession(userId: string, env: Env): Promise&lt;string&gt; {
  const token = generateId();
  await env.CHAT_KV.put(`session:${token}`, userId, { expirationTtl: TOKEN_EXPIRE_SECONDS });
  return token;
}

export async function validateToken(token: string, env: Env): Promise&lt;User | null&gt; {
  const userId = await env.CHAT_KV.get(`session:${token}`);
  if (!userId) return null;

  const db = new DB(env.DB);
  return await db.getUserById(userId);
}

export async function getUserFromRequest(request: Request, env: Env): Promise&lt;User&gt; {
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

