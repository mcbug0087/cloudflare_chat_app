
import { Env, User, ChatType } from './types';
import { validateToken } from './auth';

interface WebSocketWithMetadata extends WebSocket {
  userId?: string;
  userNickname?: string;
}

export class ChatRoom {
  private sessions: Map&lt;string, WebSocketWithMetadata&gt; = new Map();
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise&lt;Response&gt; {
    const url = new URL(request.url);

    if (url.pathname === '/ws') {
      return await this.handleWebSocket(request);
    }

    if (url.pathname === '/durable/new-message') {
      return await this.handleNewMessage(request);
    }

    if (url.pathname === '/durable/group-update') {
      return await this.handleGroupUpdate(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private async handleWebSocket(request: Request): Promise&lt;Response&gt; {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response('Token required', { status: 401 });
    }

    const user = await validateToken(token, this.env);
    if (!user) {
      return new Response('Invalid token', { status: 401 });
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1] as WebSocketWithMetadata;

    server.accept();

    this.sessions.set(user.id, server);
    server.userId = user.id;
    server.userNickname = user.nickname;

    this.broadcast({ type: 'user_online', user_id: user.id, nickname: user.nickname });

    server.addEventListener('message', async (event) =&gt; {
      try {
        const message = JSON.parse(event.data as string);
        await this.handleClientMessage(user, message, server);
      } catch (e) {
        console.error('Error handling message:', e);
      }
    });

    server.addEventListener('close', () =&gt; {
      this.sessions.delete(user.id);
      this.broadcast({ type: 'user_offline', user_id: user.id });
    });

    server.addEventListener('error', () =&gt; {
      this.sessions.delete(user.id);
      this.broadcast({ type: 'user_offline', user_id: user.id });
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async handleClientMessage(user: User, message: any, ws: WebSocketWithMetadata): Promise&lt;void&gt; {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      case 'typing':
        this.broadcast({
          type: 'typing',
          chat_id: message.chat_id,
          user_id: user.id,
          nickname: user.nickname,
          is_typing: message.is_typing
        });
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private async handleNewMessage(request: Request): Promise&lt;Response&gt; {
    const data = await request.json&lt;any&gt;();
    this.broadcast({
      type: 'new_message',
      chat_type: data.chat_type,
      chat_id: data.chat_id,
      message: data.message
    });
    return new Response('OK');
  }

  private async handleGroupUpdate(request: Request): Promise&lt;Response&gt; {
    const data = await request.json&lt;any&gt;();
    this.broadcast({
      type: 'group_update',
      chat_id: data.chat_id,
      action: data.action,
      data: data.data
    });
    return new Response('OK');
  }

  private broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    this.sessions.forEach(ws =&gt; {
      try {
        ws.send(messageStr);
      } catch (e) {
        console.error('Error broadcasting message:', e);
      }
    });
  }
}

export async function handleWebSocket(request: Request, env: Env): Promise&lt;Response&gt; {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const chatId = url.searchParams.get('chat_id');
  const chatType = url.searchParams.get('chat_type') as ChatType;

  if (!token || !chatId || !chatType) {
    return new Response('Missing parameters', { status: 400 });
  }

  const durableObjId = env.CHAT_ROOM.idFromName(`${chatType}:${chatId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  return durableObj.fetch(new URL(`/ws?token=${token}`, request.url).toString(), request);
}

