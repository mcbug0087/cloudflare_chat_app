
import { Env } from './types';
import { asyncHandler } from './middleware';
import {
  handleRegister,
  handleLogin,
  handleGetMe,
  handleSearchUsers
} from './users';
import {
  handleGetPrivateChats,
  handleCreatePrivateChat,
  handleGetPrivateChatMessages,
  handleSendPrivateChatMessage
} from './chats';
import {
  handleCreateGroup,
  handleGetGroups,
  handleGetGroup,
  handleUpdateGroup,
  handleDisbandGroup,
  handleJoinGroup,
  handleLeaveGroup,
  handleKickMember,
  handleTransferOwner,
  handleSetAdmin,
  handleGetGroupMessages,
  handleSendGroupMessage
} from './groups';
import { ChatRoom, handleWebSocket } from './ws';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/ws') {
      return handleWebSocket(request, env);
    }

    if (path.startsWith('/public/')) {
      const file = path.slice('/public/'.length);
      return serveStatic(file);
    }

    if (path === '/' || path === '') {
      return serveStatic('index.html');
    }

    if (request.method === 'POST' && path === '/api/auth/register') {
      return asyncHandler(handleRegister)(request, env);
    }

    if (request.method === 'POST' && path === '/api/auth/login') {
      return asyncHandler(handleLogin)(request, env);
    }

    if (request.method === 'GET' && path === '/api/users/me') {
      return asyncHandler(handleGetMe)(request, env);
    }

    if (request.method === 'GET' && path.startsWith('/api/users/search')) {
      return asyncHandler(handleSearchUsers)(request, env);
    }

    if (request.method === 'GET' && path === '/api/chats/private') {
      return asyncHandler(handleGetPrivateChats)(request, env);
    }

    if (request.method === 'POST' && path === '/api/chats/private') {
      return asyncHandler(handleCreatePrivateChat)(request, env);
    }

    if (request.method === 'GET' && path.startsWith('/api/chats/private/') && path.endsWith('/messages')) {
      const chatId = path.split('/')[4];
      return asyncHandler((req, e) => handleGetPrivateChatMessages(req, e, chatId))(request, env);
    }

    if (request.method === 'POST' && path.startsWith('/api/chats/private/') && path.endsWith('/messages')) {
      const chatId = path.split('/')[4];
      return asyncHandler((req, e) => handleSendPrivateChatMessage(req, e, chatId))(request, env);
    }

    if (request.method === 'POST' && path === '/api/groups') {
      return asyncHandler(handleCreateGroup)(request, env);
    }

    if (request.method === 'GET' && path === '/api/groups') {
      return asyncHandler(handleGetGroups)(request, env);
    }

    if (request.method === 'GET' && path.startsWith('/api/groups/') && !path.includes('/')) {
      const groupId = path.split('/')[3];
      return asyncHandler((req, e) => handleGetGroup(req, e, groupId))(request, env);
    }

    if (request.method === 'PUT' && path.startsWith('/api/groups/') && !path.includes('/')) {
      const groupId = path.split('/')[3];
      return asyncHandler((req, e) => handleUpdateGroup(req, e, groupId))(request, env);
    }

    if (request.method === 'DELETE' && path.startsWith('/api/groups/') && !path.includes('/')) {
      const groupId = path.split('/')[3];
      return asyncHandler((req, e) => handleDisbandGroup(req, e, groupId))(request, env);
    }

    if (request.method === 'POST' && path.startsWith('/api/groups/') && path.endsWith('/join')) {
      const groupId = path.split('/')[3];
      return asyncHandler((req, e) => handleJoinGroup(req, e, groupId))(request, env);
    }

    if (request.method === 'POST' && path.startsWith('/api/groups/') && path.endsWith('/leave')) {
      const groupId = path.split('/')[3];
      return asyncHandler((req, e) => handleLeaveGroup(req, e, groupId))(request, env);
    }

    if (request.method === 'DELETE' && path.startsWith('/api/groups/') && path.includes('/members/')) {
      const parts = path.split('/');
      const groupId = parts[3];
      const userId = parts[5];
      return asyncHandler((req, e) => handleKickMember(req, e, groupId, userId))(request, env);
    }

    if (request.method === 'PUT' && path.startsWith('/api/groups/') && path.endsWith('/owner')) {
      const groupId = path.split('/')[3];
      return asyncHandler((req, e) => handleTransferOwner(req, e, groupId))(request, env);
    }

    if (request.method === 'PUT' && path.startsWith('/api/groups/') && path.includes('/admins/')) {
      const parts = path.split('/');
      const groupId = parts[3];
      const userId = parts[5];
      return asyncHandler((req, e) => handleSetAdmin(req, e, groupId, userId))(request, env);
    }

    if (request.method === 'GET' && path.startsWith('/api/groups/') && path.endsWith('/messages')) {
      const groupId = path.split('/')[3];
      return asyncHandler((req, e) => handleGetGroupMessages(req, e, groupId))(request, env);
    }

    if (request.method === 'POST' && path.startsWith('/api/groups/') && path.endsWith('/messages')) {
      const groupId = path.split('/')[3];
      return asyncHandler((req, e) => handleSendGroupMessage(req, e, groupId))(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

export { ChatRoom };

function serveStatic(file: string): Response {
  const assets: { [key: string]: string } = {
    'index.html': `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cloudflare Chat</title>
  <style>
    ${cssContent}
  </style>
</head>
<body>
  <div id="app"></div>
  <script>
    ${jsContent}
  </script>
</body>
</html>
    `
  };

  const content = assets[file];
  if (!content) {
    return new Response('Not found', { status: 404 });
  }

  let contentType = 'text/html';
  if (file.endsWith('.css')) contentType = 'text/css';
  if (file.endsWith('.js')) contentType = 'application/javascript';

  return new Response(content, {
    headers: { 'Content-Type': contentType }
  });
}

const cssContent = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }
#app { height: 100vh; display: flex; flex-direction: column; }

.auth-page { display: flex; align-items: center; justify-content: center; height: 100vh; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.auth-card { background: white; padding: 40px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 100%; max-width: 400px; }
.auth-card h1 { text-align: center; color: #333; margin-bottom: 30px; }
.auth-card input { width: 100%; padding: 15px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; font-size: 16px; }
.auth-card button { width: 100%; padding: 15px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; transition: background 0.3s; }
.auth-card button:hover { background: #5a6fd6; }

.chat-app { display: flex; height: 100vh; }
.sidebar { width: 300px; background: white; border-right: 1px solid #e0e0e0; display: flex; flex-direction: column; }
.sidebar-header { padding: 20px; border-bottom: 1px solid #e0e0e0; background: #667eea; color: white; }
.sidebar-header h2 { font-size: 20px; }
.chat-list { flex: 1; overflow-y: auto; }
.chat-item { padding: 15px 20px; cursor: pointer; border-bottom: 1px solid #f0f0f0; transition: background 0.2s; }
.chat-item:hover { background: #f5f5f5; }
.chat-item.active { background: #e8f0fe; }
.chat-item-name { font-weight: 600; color: #333; margin-bottom: 5px; }

.chat-main { flex: 1; display: flex; flex-direction: column; }
.chat-header { padding: 15px 20px; background: white; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between; }
.chat-header h3 { color: #333; }
.chat-messages { flex: 1; overflow-y: auto; padding: 20px; background: #f0f2f5; }
.message { margin-bottom: 15px; max-width: 70%; }
.message.sent { margin-left: auto; }
.message-bubble { padding: 12px 16px; border-radius: 18px; background: white; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
.message.sent .message-bubble { background: #667eea; color: white; }
.message-sender { font-size: 12px; color: #666; margin-bottom: 5px; }
.message-time { font-size: 11px; color: #999; margin-top: 5px; text-align: right; }

.chat-input { padding: 15px 20px; background: white; border-top: 1px solid #e0e0e0; display: flex; gap: 10px; }
.chat-input input { flex: 1; padding: 12px 16px; border: 1px solid #ddd; border-radius: 20px; font-size: 14px; }
.chat-input button { padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 20px; cursor: pointer; }

.new-chat-btn { margin: 10px 20px; padding: 10px; background: #4CAF50; color: white; border: none; border-radius: 8px; cursor: pointer; }
.modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
.modal-content { background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 400px; }
.modal-content h3 { margin-bottom: 20px; }
.modal-content input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; }
.modal-content button { padding: 10px 20px; margin-right: 10px; border: none; border-radius: 6px; cursor: pointer; }
.modal-content .btn-primary { background: #667eea; color: white; }
.modal-content .btn-secondary { background: #f0f0f0; }

@media (max-width: 768px) {
  .sidebar { position: fixed; left: -100%; top: 0; bottom: 0; z-index: 100; transition: left 0.3s; }
  .sidebar.open { left: 0; }
}
`;

const jsContent = `
let currentUser = null;
let token = null;
let ws = null;
let activeChat = null;

function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return fetch('/api' + path, { ...options, headers }).then(r => r.json());
}

function renderAuthPage() {
  const app = document.getElementById('app');
  app.innerHTML = \`
    <div class="auth-page">
      <div class="auth-card">
        <h1>Cloudflare Chat</h1>
        <input type="text" id="nickname" placeholder="输入昵称" maxlength="20">
        <button onclick="handleAuth()">登录 / 注册</button>
      </div>
    </div>
  \`;
}

async function handleAuth() {
  const nickname = document.getElementById('nickname').value.trim();
  if (!nickname) return;
  
  try {
    let result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ nickname }) });
    if (result.error && result.error.code === 'NOT_FOUND') {
      result = await api('/auth/register', { method: 'POST', body: JSON.stringify({ nickname }) });
    }
    if (result.error) {
      alert(result.error.message);
      return;
    }
    token = result.data.token;
    currentUser = result.data.user;
    localStorage.setItem('chat_token', token);
    localStorage.setItem('chat_user', JSON.stringify(currentUser));
    renderChatApp();
  } catch (e) {
    alert('登录失败');
  }
}

async function renderChatApp() {
  const app = document.getElementById('app');
  app.innerHTML = \`
    <div class="chat-app">
      <div class="sidebar" id="sidebar">
        <div class="sidebar-header">
          <h2>\${currentUser.nickname}</h2>
        </div>
        <button class="new-chat-btn" onclick="showNewChatModal()">+ 新建聊天</button>
        <div class="chat-list" id="chatList"></div>
      </div>
      <div class="chat-main">
        <div class="chat-header" id="chatHeader">
          <h3>选择聊天</h3>
        </div>
        <div class="chat-messages" id="chatMessages"></div>
        <div class="chat-input" id="chatInput" style="display: none;">
          <input type="text" id="messageInput" placeholder="输入消息...">
          <button onclick="sendMessage()">发送</button>
        </div>
      </div>
    </div>
  \`;
  
  loadChats();
}

async function loadChats() {
  const [privateChatsRes, groupsRes] = await Promise.all([
    api('/chats/private'),
    api('/groups')
  ]);
  
  const privateChats = privateChatsRes.data || [];
  const groups = groupsRes.data || [];
  
  const chatList = document.getElementById('chatList');
  chatList.innerHTML = '';
  
  privateChats.forEach(chat => {
    const name = chat.other_user ? chat.other_user.nickname : '私聊';
    addChatItem({ ...chat, name, type: 'private' });
  });
  
  groups.forEach(group => {
    addChatItem({ ...group, name: group.name, type: 'group' });
  });
}

function addChatItem(chat) {
  const chatList = document.getElementById('chatList');
  const item = document.createElement('div');
  item.className = 'chat-item';
  item.innerHTML = \`<div class="chat-item-name">\${chat.name}</div>\`;
  item.onclick = () => selectChat(chat);
  chatList.appendChild(item);
}

async function selectChat(chat) {
  activeChat = chat;
  
  document.querySelectorAll('.chat-item').forEach(el => el.classList.remove('active'));
  event.target.closest('.chat-item').classList.add('active');
  
  document.getElementById('chatHeader').innerHTML = \`<h3>\${chat.name}</h3>\`;
  document.getElementById('chatInput').style.display = 'flex';
  
  const path = chat.type === 'private' ? \`/chats/private/\${chat.id}/messages\` : \`/groups/\${chat.id}/messages\`;
  const res = await api(path);
  const messages = (res.data || []).reverse();
  renderMessages(messages);
}

function renderMessages(messages) {
  const container = document.getElementById('chatMessages');
  container.innerHTML = '';
  messages.forEach(msg => {
    const isSent = msg.sender_id === currentUser.id;
    const div = document.createElement('div');
    div.className = \`message \${isSent ? 'sent' : ''}\`;
    div.innerHTML = \`
      <div class="message-sender">\${isSent ? '我' : msg.nickname}</div>
      <div class="message-bubble">\${msg.content}</div>
      <div class="message-time">\${new Date(msg.created_at * 1000).toLocaleString()}</div>
    \`;
    container.appendChild(div);
  });
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const content = input.value.trim();
  if (!content || !activeChat) return;
  
  const path = activeChat.type === 'private' ? \`/chats/private/\${activeChat.id}/messages\` : \`/groups/\${activeChat.id}/messages\`;
  const res = await api(path, { method: 'POST', body: JSON.stringify({ content }) });
  if (res.error) {
    alert(res.error.message);
    return;
  }
  input.value = '';
}

function showNewChatModal() {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'newChatModal';
  modal.innerHTML = \`
    <div class="modal-content">
      <h3>新建聊天</h3>
      <input type="text" id="newChatName" placeholder="输入用户名或群名称">
      <button class="btn-primary" onclick="createNewChat()">创建</button>
      <button class="btn-secondary" onclick="closeModal()">取消</button>
    </div>
  \`;
  document.body.appendChild(modal);
}

async function createNewChat() {
  const name = document.getElementById('newChatName').value.trim();
  if (!name) return;
  
  const usersRes = await api(\`/users/search?q=\${encodeURIComponent(name)}\`);
  const users = usersRes.data || [];
  
  if (users.length > 0) {
    await api('/chats/private', { method: 'POST', body: JSON.stringify({ target_user_id: users[0].id }) });
  } else {
    await api('/groups', { method: 'POST', body: JSON.stringify({ name }) });
  }
  
  closeModal();
  loadChats();
}

function closeModal() {
  document.getElementById('newChatModal')?.remove();
}

document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    if (document.getElementById('messageInput') === document.activeElement) {
      sendMessage();
    } else if (document.getElementById('nickname') === document.activeElement) {
      handleAuth();
    }
  }
});

window.onload = () => {
  token = localStorage.getItem('chat_token');
  const userStr = localStorage.getItem('chat_user');
  if (token && userStr) {
    currentUser = JSON.parse(userStr);
    renderChatApp();
  } else {
    renderAuthPage();
  }
};
`;

