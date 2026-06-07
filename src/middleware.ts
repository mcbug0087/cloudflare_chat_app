
import { Env, User } from './types';
import { getUserFromRequest } from './auth';
import { createErrorResponse } from './errors';
import { AppError } from './errors';

interface RequestWithUser extends Request {
  user?: User;
}

export async function authMiddleware(request: Request, env: Env): Promise&lt;User&gt; {
  return await getUserFromRequest(request, env);
}

export function asyncHandler(handler: (request: Request, env: Env) =&gt; Promise&lt;Response&gt;): (request: Request, env: Env) =&gt; Promise&lt;Response&gt; {
  return async (request: Request, env: Env) =&gt; {
    try {
      return await handler(request, env);
    } catch (e) {
      if (e instanceof AppError) {
        return createErrorResponse(e);
      }
      console.error('Unexpected error:', e);
      return new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
}

