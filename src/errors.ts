
import { ApiError } from './types';

export class AppError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AppError';
  }
}

export function createErrorResponse(error: AppError): Response {
  const body: { error: ApiError } = {
    error: {
      code: error.code,
      message: error.message
    }
  };
  return new Response(JSON.stringify(body), {
    status: error.statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

export function createSuccessResponse<T>(data: T): Response {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const Errors = {
  InvalidParams: (message: string = '参数校验失败') => new AppError('INVALID_PARAMS', message, 400),
  Unauthorized: (message: string = 'Token 无效或过期') => new AppError('UNAUTHORIZED', message, 401),
  Forbidden: (message: string = '无操作权限') => new AppError('FORBIDDEN', message, 403),
  NotFound: (message: string = '资源不存在') => new AppError('NOT_FOUND', message, 404),
  NicknameTaken: (message: string = '该昵称已被使用') => new AppError('NICKNAME_TAKEN', message, 409),
  GroupDisbanded: (message: string = '群聊已解散') => new AppError('GROUP_DISBANDED', message, 410),
  CannotKickSelf: (message: string = '不能踢自己') => new AppError('CANNOT_KICK_SELF', message, 422),
  CannotKickAdmin: (message: string = '管理员不能踢管理员/群主') => new AppError('CANNOT_KICK_ADMIN', message, 422),
  WrongPassword: (message: string = '密码错误') => new AppError('WRONG_PASSWORD', message, 401),
  Banned: (message: string = '该账号已被封禁') => new AppError('ACCOUNT_BANNED', message, 403),
  DefaultPassword: (message: string = '请修改默认密码') => new AppError('DEFAULT_PASSWORD', message, 403),
  WeakPassword: (message: string = '密码强度不足') => new AppError('WEAK_PASSWORD', message, 400),
};

