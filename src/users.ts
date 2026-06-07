
import { Env } from './types';
import { DB } from './db';
import { authMiddleware } from './middleware';
import { createSuccessResponse } from './errors';
import { register, login } from './auth';

export async function handleRegister(request: Request, env: Env): Promise&lt;Response&gt; {
  const body = await request.json&lt;any&gt;();
  const { nickname } = body;
  const result = await register(nickname, env);
  return createSuccessResponse(result);
}

export async function handleLogin(request: Request, env: Env): Promise&lt;Response&gt; {
  const body = await request.json&lt;any&gt;();
  const { nickname } = body;
  const result = await login(nickname, env);
  return createSuccessResponse(result);
}

export async function handleGetMe(request: Request, env: Env): Promise&lt;Response&gt; {
  const user = await authMiddleware(request, env);
  return createSuccessResponse(user);
}

export async function handleSearchUsers(request: Request, env: Env): Promise&lt;Response&gt; {
  const user = await authMiddleware(request, env);
  const url = new URL(request.url);
  const query = url.searchParams.get('q') || '';
  const db = new DB(env.DB);
  const users = await db.searchUsers(query);
  return createSuccessResponse(users);
}

