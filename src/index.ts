import { Env } from './types';
import { asyncHandler } from './middleware';
import {
  handleRegister, handleLogin, handleGetMe, handleSearchUsers,
  handleChangePassword, handleDeleteAccount, handleChangeNickname
} from './users';
import {
  handleGetPrivateChats, handleCreatePrivateChat,
  handleGetPrivateChatMessages, handleSendPrivateChatMessage
} from './chats';
import {
  handleCreateGroup, handleGetGroups, handleGetGroup,
  handleUpdateGroup, handleDisbandGroup, handleJoinGroup,
  handleLeaveGroup, handleKickMember, handleTransferOwner,
  handleSetAdmin, handleGetGroupMessages, handleSendGroupMessage,
  handleSearchGroupByCode, handleInviteToGroup, handleSetGroupNickname
} from './groups';
import {
  handleGetFriends, handleAddFriend, handleRemoveFriend, handleUpdateRemark
} from './friends';
import {
  handleAdminGetUsers, handleAdminGetGroups,
  handleAdminBanUser, handleAdminUnbanUser,
  handleAdminDeleteUser, handleAdminChangeUserPassword,
  handleAdminDisbandGroup, handleAdminUpdateSettings
} from './admin';
import { ChatRoom, handleWebSocket } from './ws';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/ws') return handleWebSocket(request, env);
    if (path === '/' || path === '') return serveStatic('index.html');

    // Auth
    if (request.method === 'POST' && path === '/api/auth/register') return asyncHandler(handleRegister)(request, env);
    if (request.method === 'POST' && path === '/api/auth/login') return asyncHandler(handleLogin)(request, env);
    if (request.method === 'POST' && path === '/api/auth/change-password') return asyncHandler(handleChangePassword)(request, env);
    if (request.method === 'DELETE' && path === '/api/auth/delete-account') return asyncHandler(handleDeleteAccount)(request, env);

    // Users
    if (request.method === 'GET' && path === '/api/users/me') return asyncHandler(handleGetMe)(request, env);
    if (request.method === 'GET' && path.startsWith('/api/users/search')) return asyncHandler(handleSearchUsers)(request, env);
    if (request.method === 'PUT' && path === '/api/users/me/nickname') return asyncHandler(handleChangeNickname)(request, env);

    // Friends
    if (request.method === 'GET' && path === '/api/friends') return asyncHandler(handleGetFriends)(request, env);
    if (request.method === 'POST' && path === '/api/friends') return asyncHandler(handleAddFriend)(request, env);
    if (request.method === 'DELETE' && path.startsWith('/api/friends/')) {
      const friendId = path.split('/')[3];
      return asyncHandler((req, e) => handleRemoveFriend(req, e, friendId))(request, env);
    }
    if (request.method === 'PUT' && path.startsWith('/api/friends/') && path.endsWith('/remark')) {
      const friendId = path.split('/')[3];
      return asyncHandler((req, e) => handleUpdateRemark(req, e, friendId))(request, env);
    }

    // Private chats
    if (request.method === 'GET' && path === '/api/chats/private') return asyncHandler(handleGetPrivateChats)(request, env);
    if (request.method === 'POST' && path === '/api/chats/private') return asyncHandler(handleCreatePrivateChat)(request, env);
    if (request.method === 'GET' && path.startsWith('/api/chats/private/') && path.endsWith('/messages')) {
      return asyncHandler((req, e) => handleGetPrivateChatMessages(req, e, path.split('/')[4]))(request, env);
    }
    if (request.method === 'POST' && path.startsWith('/api/chats/private/') && path.endsWith('/messages')) {
      return asyncHandler((req, e) => handleSendPrivateChatMessage(req, e, path.split('/')[4]))(request, env);
    }

    // Admin API
    if (path.startsWith('/api/admin/')) {
      if (request.method === 'GET' && path === '/api/admin/users') return asyncHandler(handleAdminGetUsers)(request, env);
      if (request.method === 'GET' && path === '/api/admin/groups') return asyncHandler(handleAdminGetGroups)(request, env);
      if (request.method === 'PUT' && path === '/api/admin/settings') return asyncHandler(handleAdminUpdateSettings)(request, env);
      if (request.method === 'POST' && path.startsWith('/api/admin/ban/')) {
        return asyncHandler((req, e) => handleAdminBanUser(req, e, path.split('/')[4]))(request, env);
      }
      if (request.method === 'POST' && path.startsWith('/api/admin/unban/')) {
        return asyncHandler((req, e) => handleAdminUnbanUser(req, e, path.split('/')[4]))(request, env);
      }
      if (request.method === 'DELETE' && path.startsWith('/api/admin/users/')) {
        return asyncHandler((req, e) => handleAdminDeleteUser(req, e, path.split('/')[4]))(request, env);
      }
      if (request.method === 'PUT' && path.startsWith('/api/admin/users/') && path.endsWith('/password')) {
        return asyncHandler((req, e) => handleAdminChangeUserPassword(req, e, path.split('/')[4]))(request, env);
      }
      if (request.method === 'DELETE' && path.startsWith('/api/admin/groups/')) {
        return asyncHandler((req, e) => handleAdminDisbandGroup(req, e, path.split('/')[4]))(request, env);
      }
    }

    // Group search by code
    if (request.method === 'GET' && path === '/api/groups/search') return asyncHandler(handleSearchGroupByCode)(request, env);

    // Group operations (order matters - specific paths before generic)
    if (request.method === 'POST' && path.startsWith('/api/groups/') && path.endsWith('/invite')) {
      return asyncHandler((req, e) => handleInviteToGroup(req, e, path.split('/')[3]))(request, env);
    }
    if (request.method === 'PUT' && path.startsWith('/api/groups/') && path.includes('/nickname/')) {
      const parts = path.split('/');
      return asyncHandler((req, e) => handleSetGroupNickname(req, e, parts[3], parts[5]))(request, env);
    }
    if (request.method === 'POST' && path.startsWith('/api/groups/') && path.endsWith('/join')) {
      return asyncHandler((req, e) => handleJoinGroup(req, e, path.split('/')[3]))(request, env);
    }
    if (request.method === 'POST' && path.startsWith('/api/groups/') && path.endsWith('/leave')) {
      return asyncHandler((req, e) => handleLeaveGroup(req, e, path.split('/')[3]))(request, env);
    }
    if (request.method === 'DELETE' && path.startsWith('/api/groups/') && path.includes('/members/')) {
      const parts = path.split('/');
      return asyncHandler((req, e) => handleKickMember(req, e, parts[3], parts[5]))(request, env);
    }
    if (request.method === 'PUT' && path.startsWith('/api/groups/') && path.endsWith('/owner')) {
      return asyncHandler((req, e) => handleTransferOwner(req, e, path.split('/')[3]))(request, env);
    }
    if (request.method === 'PUT' && path.startsWith('/api/groups/') && path.includes('/admins/')) {
      const parts = path.split('/');
      return asyncHandler((req, e) => handleSetAdmin(req, e, parts[3], parts[5]))(request, env);
    }
    if (request.method === 'GET' && path.startsWith('/api/groups/') && path.endsWith('/messages')) {
      return asyncHandler((req, e) => handleGetGroupMessages(req, e, path.split('/')[3]))(request, env);
    }
    if (request.method === 'POST' && path.startsWith('/api/groups/') && path.endsWith('/messages')) {
      return asyncHandler((req, e) => handleSendGroupMessage(req, e, path.split('/')[3]))(request, env);
    }
    if (request.method === 'POST' && path === '/api/groups') return asyncHandler(handleCreateGroup)(request, env);
    if (request.method === 'GET' && path === '/api/groups') return asyncHandler(handleGetGroups)(request, env);
    if (request.method === 'GET' && path.startsWith('/api/groups/') && !path.split('/')[4]) {
      return asyncHandler((req, e) => handleGetGroup(req, e, path.split('/')[3]))(request, env);
    }
    if (request.method === 'PUT' && path.startsWith('/api/groups/') && !path.split('/')[4]) {
      return asyncHandler((req, e) => handleUpdateGroup(req, e, path.split('/')[3]))(request, env);
    }
    if (request.method === 'DELETE' && path.startsWith('/api/groups/') && !path.split('/')[4]) {
      return asyncHandler((req, e) => handleDisbandGroup(req, e, path.split('/')[3]))(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

export { ChatRoom };

function serveStatic(file: string): Response {
  if (file === 'index.html') {
    return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
  }
  return new Response('Not found', { status: 404 });
}

const HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<title>Cloudflare Chat</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f0f2f5;color:#333}
#app{height:100dvh;display:flex;flex-direction:column}

.auth-page{display:flex;align-items:center;justify-content:center;height:100dvh;background:linear-gradient(135deg,#667eea,#764ba2);padding:20px}
.auth-card{background:#fff;padding:36px 28px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.25);width:100%;max-width:380px}
.auth-card h1{text-align:center;color:#333;margin-bottom:28px;font-size:24px}
.auth-card input{width:100%;padding:14px 16px;border:1px solid #ddd;border-radius:10px;margin-bottom:14px;font-size:16px;outline:none}
.auth-card input:focus{border-color:#667eea}
.auth-card input[type="password"]{font-family:monospace;letter-spacing:2px}
.auth-card button{width:100%;padding:14px;background:#667eea;color:#fff;border:none;border-radius:10px;font-size:16px;cursor:pointer;transition:background .2s;margin-bottom:8px}
.auth-card button:hover{background:#5a6fd6}
.auth-card .btn-reg{background:#27ae60}
.auth-card .btn-reg:hover{background:#219a52}

.chat-app{display:flex;height:100dvh;overflow:hidden}
.sidebar{width:280px;background:#fff;border-right:1px solid #e0e0e0;display:flex;flex-direction:column;flex-shrink:0}
.sidebar-header{padding:16px;border-bottom:1px solid #e0e0e0;background:#667eea;color:#fff;display:flex;align-items:center;justify-content:space-between}
.sidebar-header h2{font-size:18px;font-weight:600}
.sidebar-header .menu-btn{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:4px 8px}

.tabs{display:flex;border-bottom:1px solid #e0e0e0}
.tab{flex:1;text-align:center;padding:12px 8px;cursor:pointer;font-size:13px;color:#666;border-bottom:2px solid transparent;transition:all .2s;background:none;border-left:none;border-right:none;border-top:none}
.tab.active{color:#667eea;border-bottom-color:#667eea;font-weight:600}

.tab-actions{display:flex;padding:8px;gap:6px}
.tab-actions input{flex:1;padding:9px 12px;border:1px solid #ddd;border-radius:8px;font-size:13px;outline:none}
.tab-actions button{padding:9px 14px;background:#667eea;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;white-space:nowrap}

.chat-list{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
.chat-item{padding:14px 16px;cursor:pointer;border-bottom:1px solid #f0f0f0;transition:background .15s;display:flex;justify-content:space-between;align-items:center}
.chat-item:hover{background:#f5f5f5}
.chat-item.active{background:#e8f0fe}
.chat-item-name{font-weight:600;color:#333;font-size:14px}
.chat-item-sub{font-size:11px;color:#999;margin-top:2px}
.chat-item-badge{font-size:10px;padding:2px 8px;border-radius:10px;background:#ddd;color:#666}
.chat-item .delete-btn{background:none;border:none;color:#ccc;cursor:pointer;font-size:16px;padding:2px 6px;display:none}
.chat-item:hover .delete-btn{display:block}
.chat-item .delete-btn:hover{color:#e74c3c}

.main{flex:1;display:flex;flex-direction:column;min-width:0}
.chat-header{padding:12px 16px;background:#fff;border-bottom:1px solid #e0e0e0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.chat-header h3{font-size:16px;color:#333}
.chat-header-actions{display:flex;gap:8px}
.chat-header-actions button{padding:7px 14px;border:none;border-radius:8px;cursor:pointer;font-size:13px;background:#f0f0f0;color:#333}
.chat-header-actions button.danger{background:#e74c3c;color:#fff}
.messages{flex:1;overflow-y:auto;padding:16px;background:#f0f2f5;-webkit-overflow-scrolling:touch}
.msg{margin-bottom:14px;max-width:75%;display:flex;flex-direction:column}
.msg.sent{align-self:flex-end;align-items:flex-end}
.msg.received{align-self:flex-start;align-items:flex-start}
.msg-sender{font-size:11px;color:#888;margin-bottom:3px;padding:0 4px}
.msg-bubble{padding:10px 14px;border-radius:18px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.08);font-size:14px;line-height:1.5;word-break:break-word}
.msg.sent .msg-bubble{background:#667eea;color:#fff}
.msg-time{font-size:10px;color:#aaa;margin-top:3px;padding:0 4px}

.input-area{padding:10px 16px;background:#fff;border-top:1px solid #e0e0e0;display:flex;gap:8px;flex-shrink:0}
.input-area input{flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:20px;font-size:14px;outline:none}
.input-area input:focus{border-color:#667eea}
.input-area button{padding:10px 20px;background:#667eea;color:#fff;border:none;border-radius:20px;cursor:pointer;font-size:14px}

.modal-mask{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px}
.modal-box{background:#fff;padding:24px;border-radius:14px;width:100%;max-width:420px;max-height:80dvh;overflow-y:auto}
.modal-box h3{margin-bottom:16px;font-size:17px}
.modal-box input,.modal-box select{width:100%;padding:11px 14px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px;font-size:14px;outline:none}
.modal-box input:focus{border-color:#667eea}
.modal-row{display:flex;gap:8px;margin-bottom:12px}
.modal-box .btn{padding:10px 20px;border:none;border-radius:8px;cursor:pointer;font-size:14px;margin-right:8px}
.modal-box .btn-primary{background:#667eea;color:#fff}
.modal-box .btn-danger{background:#e74c3c;color:#fff}
.modal-box .btn-secondary{background:#f0f0f0;color:#333}
.modal-box .btn-green{background:#27ae60;color:#fff}
.modal-box .btn-sm{padding:6px 12px;font-size:12px}

.member-list{max-height:250px;overflow-y:auto;margin-bottom:12px}
.member-item{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f0f0f0}
.member-item .name{font-size:14px;font-weight:500}
.member-item .role-badge{font-size:11px;padding:2px 8px;border-radius:8px;margin-left:6px}
.role-owner{background:#f39c12;color:#fff}
.role-admin{background:#3498db;color:#fff}
.role-member{background:#ddd;color:#666}

.placeholder{flex:1;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:15px}

.toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:10px 24px;border-radius:20px;font-size:14px;z-index:300;animation:fadeIn .3s}
@keyframes fadeIn{from{opacity:0;top:0}to{opacity:1;top:16px}}

.hamburger{display:none;background:none;border:none;color:#667eea;font-size:24px;cursor:pointer;padding:4px 8px}
.sidebar-overlay{display:none}

@media(max-width:768px){
  .hamburger{display:block}
  .sidebar{position:fixed;left:-100%;top:0;bottom:0;z-index:100;transition:left .25s;width:280px}
  .sidebar.open{left:0}
  .sidebar-overlay{display:block;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.4);z-index:99}
  .container{padding:0}
}
</style>
</head>
<body>
<div id="app"></div>
<script>
let token=null,currentUser=null,ws=null,activeChat=null,chatTab='private';
let sidebarOpen=false;

function api(path,options={}){
  const headers={'Content-Type':'application/json',...options.headers};
  if(token)headers['Authorization']='Bearer '+token;
  return fetch('/api'+path,{...options,headers}).then(r=>r.json());
}

function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2500)}

function setToken(t,u){token=t;currentUser=u;localStorage.setItem('chat_token',t);localStorage.setItem('chat_user',JSON.stringify(u))}
function clearToken(){token=null;currentUser=null;localStorage.removeItem('chat_token');localStorage.removeItem('chat_user')}

// AUTH
function renderAuth(){
  const a=document.getElementById('app');
  a.innerHTML=\`<div class="auth-page"><div class="auth-card"><h1>Cloudflare Chat</h1><input id="nicknameInp" placeholder="昵称（1-20字符）" maxlength="20"><input id="passwordInp" type="password" placeholder="密码（至少6位）" minlength="6"><button onclick="doLogin()">登录</button><button class="btn-reg" onclick="doRegister()">注册</button></div></div>\`;
}

async function doLogin(){
  const n=document.getElementById('nicknameInp').value.trim();
  const p=document.getElementById('passwordInp').value;
  if(!n)return toast('请输入昵称');
  if(!p||p.length<6)return toast('密码至少6位');
  try{
    const r=await api('/auth/login',{method:'POST',body:JSON.stringify({nickname:n,password:p})});
    if(r.error){toast(r.error.message);return}
    setToken(r.data.token,r.data.user);
    renderApp();
    if(r.data.defaultPassword){
      setTimeout(()=>{
        toast('检测到默认密码，请立即修改！');
        const np=prompt('您的密码仍为默认值，请输入新密码（至少6位）：');
        if(np&&np.length>=6)changeDefaultPassword(np);
      },500);
    }
  }catch(e){toast('登录失败')}
}

async function doRegister(){
  const n=document.getElementById('nicknameInp').value.trim();
  const p=document.getElementById('passwordInp').value;
  if(!n)return toast('请输入昵称');
  if(!p||p.length<6)return toast('密码至少6位');
  try{
    const r=await api('/auth/register',{method:'POST',body:JSON.stringify({nickname:n,password:p})});
    if(r.error){toast(r.error.message);return}
    setToken(r.data.token,r.data.user);
    renderApp();
  }catch(e){toast('注册失败')}
}

// APP
function renderApp(){
  const a=document.getElementById('app');
  a.innerHTML=\`<div class="chat-app">
    <div class="sidebar-overlay" id="sbOverlay" onclick="toggleSidebar()"></div>
    <div class="sidebar" id="sidebar"><div class="sidebar-header"><h2>Chat</h2><button class="menu-btn" onclick="showProfile()">☰</button></div>
      <div class="tabs"><button class="tab active" onclick="switchTab('private',this)">私聊</button><button class="tab" onclick="switchTab('group',this)">群聊</button><button class="tab" onclick="switchTab('friends',this)">好友</button></div>
      <div id="tabActions" class="tab-actions"></div>
      <div class="chat-list" id="chatList"></div>
      <div style="padding:12px;border-top:1px solid #e0e0e0"><button onclick="doLogout()" style="width:100%;padding:10px;border:none;border-radius:8px;cursor:pointer;background:#f0f0f0;color:#666;font-size:13px">退出登录</button></div>
    </div>
    <div class="main"><div class="chat-header" id="chatHeader"><button class="hamburger" onclick="toggleSidebar()">☰</button><h3 id="chatTitle">选择聊天</h3><div class="chat-header-actions" id="chatActions"></div></div>
      <div class="messages" id="chatMessages"><div class="placeholder">选择一个聊天开始对话</div></div>
      <div class="input-area" id="inputArea" style="display:none"><input id="msgInput" placeholder="输入消息..."><button onclick="sendMsg()">发送</button></div>
    </div></div>\`;
  loadChats();
}

function toggleSidebar(){sidebarOpen=!sidebarOpen;document.getElementById('sidebar').classList.toggle('open',sidebarOpen);document.getElementById('sbOverlay').style.display=sidebarOpen?'block':'none'}
function closeSidebar(){sidebarOpen=false;document.getElementById('sidebar').classList.remove('open');document.getElementById('sbOverlay').style.display='none'}

async function switchTab(tab,el){
  chatTab=tab;activeChat=null;
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  updateTabActions();
  await loadChats();
  document.getElementById('chatTitle').textContent='选择聊天';
  document.getElementById('chatMessages').innerHTML='<div class="placeholder">选择一个聊天开始对话</div>';
  document.getElementById('inputArea').style.display='none';
  document.getElementById('chatActions').innerHTML='';
  closeSidebar();
}

function updateTabActions(){
  const ta=document.getElementById('tabActions');
  if(chatTab==='friends'){
    ta.innerHTML=\`<input id="addFriendInp" placeholder="输入好友昵称添加"><button onclick="addFriend()">添加</button>\`;
  }else if(chatTab==='group'){
    ta.innerHTML=\`<input id="groupSearchInp" placeholder="输入群号搜索"><button onclick="searchGroup()">查找</button><button onclick="showCreateGroup()">+</button>\`;
  }else{
    ta.innerHTML=\`<input id="pmSearchInp" placeholder="搜索用户私聊"><button onclick="searchAndChat()">聊天</button>\`;
  }
}

// CHAT LIST
async function loadChats(){
  const cl=document.getElementById('chatList');cl.innerHTML='';
  if(chatTab==='private'){
    const r=await api('/chats/private');const chats=r.data||[];
    chats.forEach(c=>{
      const name=c.other_user?c.other_user.nickname:'私聊';
      const remark=c.other_user&&c.other_user.id?c.other_user.nickname:name;
      cl.appendChild(chatItemEl({...c,name,type:'private'}));
    });
    if(!chats.length)cl.innerHTML='<div style="text-align:center;color:#aaa;padding:30px;font-size:14px">暂无私聊</div>';
  }else if(chatTab==='group'){
    const r=await api('/groups');const groups=r.data||[];
    groups.forEach(g=>cl.appendChild(chatItemEl({...g,name:g.name,type:'group'})));
    if(!groups.length)cl.innerHTML='<div style="text-align:center;color:#aaa;padding:30px;font-size:14px">暂无群聊</div>';
  }else if(chatTab==='friends'){
    const r=await api('/friends');const friends=r.data||[];
    friends.forEach(f=>{
      const name=f.remark||f.nickname;
      cl.appendChild(chatItemEl({id:f.id,name,type:'private',friendData:f}));
    });
    if(!friends.length)cl.innerHTML='<div style="text-align:center;color:#aaa;padding:30px;font-size:14px">暂无好友，快去添加吧</div>';
  }
}

function chatItemEl(chat){
  const d=document.createElement('div');d.className='chat-item';
  const name=chat.name||'未知';
  let sub='';
  if(chat.type==='group')sub=\`<div class="chat-item-sub">群号: \${chat.group_code||''}</div>\`;
  if(chat.friendData&&chat.friendData.nickname&&chat.friendData.remark)sub=\`<div class="chat-item-sub">\${chat.friendData.nickname}</div>\`;
  d.innerHTML=\`<div><div class="chat-item-name">\${name}</div>\${sub}</div>\`;
  if(chatTab==='friends'){
    const del=document.createElement('button');del.className='delete-btn';del.textContent='×';
    del.onclick=e=>{e.stopPropagation();confirmDeleteFriend(chat.id,chat.friendData?.nickname)};
    d.appendChild(del);
  }
  d.onclick=()=>openChat(chat);
  return d;
}

async function openChat(chat){
  activeChat=chat;closeSidebar();
  document.querySelectorAll('.chat-item').forEach(el=>el.classList.remove('active'));
  const evt=window.event;if(evt){const tgt=evt.target.closest('.chat-item');if(tgt)tgt.classList.add('active')}
  
  const title=chat.name||'聊天';
  document.getElementById('chatTitle').textContent=title;
  document.getElementById('inputArea').style.display='flex';
  document.getElementById('msgInput').focus();
  
  if(chat.type==='group'){
    await loadGroupActions(chat.id);
  }else{
    document.getElementById('chatActions').innerHTML='';
  }
  
  const path=chat.type==='private'?\`/chats/private/\${chat.id}/messages\`:\`/groups/\${chat.id}/messages\`;
  const r=await api(path);
  renderMsgs((r.data||[]).reverse());
}

async function loadGroupActions(groupId){
  try{
    const r=await api('/groups/'+groupId);
    if(!r.data)return;
    const {my_role,group}=r.data;
    let btns='';
    if(my_role==='owner'||my_role==='admin')btns+=\`<button onclick="showManagePanel('\${groupId}')">管理</button>\`;
    document.getElementById('chatActions').innerHTML=btns;
    activeChat.myRole=my_role;
    activeChat.groupData=group;
  }catch(e){}
}

function renderMsgs(msgs){
  const c=document.getElementById('chatMessages');c.innerHTML='';
  msgs.forEach(m=>{
    const isSent=m.sender_id===currentUser.id;
    const d=document.createElement('div');d.className='msg '+(isSent?'sent':'received');
    d.innerHTML=\`<div class="msg-sender">\${isSent?'我':m.nickname}</div><div class="msg-bubble">\${escHtml(m.content)}</div><div class="msg-time">\${new Date(m.created_at*1000).toLocaleString()}</div>\`;
    c.appendChild(d);
  });
  c.scrollTop=c.scrollHeight;
}

function escHtml(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

async function sendMsg(){
  const inp=document.getElementById('msgInput');const content=inp.value.trim();
  if(!content||!activeChat)return;
  const path=activeChat.type==='private'?\`/chats/private/\${activeChat.id}/messages\`:\`/groups/\${activeChat.id}/messages\`;
  const r=await api(path,{method:'POST',body:JSON.stringify({content})});
  if(r.error){toast(r.error.message);return}
  inp.value='';
  const msgs=document.getElementById('chatMessages');
  const isSent=true;
  const d=document.createElement('div');d.className='msg sent';
  d.innerHTML=\`<div class="msg-sender">我</div><div class="msg-bubble">\${escHtml(content)}</div><div class="msg-time">刚刚</div>\`;
  msgs.appendChild(d);
  msgs.scrollTop=msgs.scrollHeight;
}

// GROUP MANAGEMENT PANEL
async function showManagePanel(groupId){
  try{
    const r=await api('/groups/'+groupId);
    if(!r.data)return;
    const {group,members,my_role}=r.data;
    let html=\`<div class="modal-mask" id="manageModal" onclick="if(event.target===this)closeModal('manageModal')"><div class="modal-box"><h3>群管理 - \${escHtml(group.name)}</h3>
    <div style="margin-bottom:12px;font-size:13px;color:#666">群号: \${group.group_code} | 群主: \${members.find(m=>m.role==='owner')?.nickname||'未知'}</div>\`;
    
    html+=\`<h4 style="font-size:14px;margin-bottom:8px">成员 (\${members.length})</h4><div class="member-list">\`;
    members.forEach(m=>{
      let roleBadge='';if(m.role==='owner')roleBadge='<span class="role-badge role-owner">群主</span>';else if(m.role==='admin')roleBadge='<span class="role-badge role-admin">管理员</span>';
      const gn=m.group_nickname? \`（\${escHtml(m.group_nickname)}）\`:'';
      html+=\`<div class="member-item"><div><span class="name">\${escHtml(m.nickname)}\${gn}</span>\${roleBadge}</div><div>\`;
      if(my_role==='owner'&&m.role!=='owner'){
        html+=\`<button class="btn btn-sm btn-primary" onclick="setAdminAction('\${groupId}','\${m.user_id}',\${m.role==='admin'})">\${m.role==='admin'?'取消管理':'设管理'}</button> \`;
        html+=\`<button class="btn btn-sm btn-secondary" onclick="transferOwnerAction('\${groupId}','\${m.user_id}')">转让</button> \`;
        html+=\`<button class="btn btn-sm btn-danger" onclick="kickAction('\${groupId}','\${m.user_id}')">踢出</button>\`;
      }else if(my_role==='admin'&&m.role==='member'){
        html+=\`<button class="btn btn-sm btn-danger" onclick="kickAction('\${groupId}','\${m.user_id}')">踢出</button>\`;
      }
      if((my_role==='owner'||my_role==='admin')&&m.user_id!==currentUser.id){
        html+=\`<button class="btn btn-sm btn-secondary" onclick="setNicknameAction('\${groupId}','\${m.user_id}','\${escHtml(m.group_nickname||'')}')">昵称</button>\`;
      }
      html+=\`</div></div>\`;
    });
    html+=\`</div><div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px">\`;
    if(my_role==='owner'||my_role==='admin')html+=\`<button class="btn btn-sm btn-green" onclick="showInviteModal('\${groupId}')">邀请好友</button>\`;
    if(my_role==='owner')html+=\`<button class="btn btn-sm btn-danger" onclick="confirmDisband('\${groupId}')">解散群聊</button>\`;
    html+=\`</div><button class="btn btn-secondary" onclick="closeModal('manageModal')">关闭</button></div></div>\`;
    document.body.insertAdjacentHTML('beforeend',html);
  }catch(e){toast('加载失败')}
}

async function setAdminAction(gid,uid,isAdmin){
  if(isAdmin&&!confirm('确认取消该用户的管理员权限？'))return;
  if(!isAdmin&&!confirm('确认设置该用户为管理员？'))return;
  const r=await api('/groups/'+gid+'/admins/'+uid,{method:'PUT'});
  if(r.error){toast(r.error.message);return}
  toast('操作成功');closeModal('manageModal');showManagePanel(gid);
}

async function transferOwnerAction(gid,uid){
  if(!confirm('确认将群主转让给该用户？转让后你将变为普通成员。'))return;
  const r=await api('/groups/'+gid+'/owner',{method:'PUT',body:JSON.stringify({new_owner_id:uid})});
  if(r.error){toast(r.error.message);return}
  toast('转让成功');closeModal('manageModal');showManagePanel(gid);
}

async function kickAction(gid,uid){
  if(!confirm('确认踢出该用户？'))return;
  const r=await api('/groups/'+gid+'/members/'+uid,{method:'DELETE'});
  if(r.error){toast(r.error.message);return}
  toast('已踢出');closeModal('manageModal');showManagePanel(gid);
}

async function setNicknameAction(gid,uid,currentNick){
  const nn=prompt('输入群昵称（留空清空）：',currentNick);
  if(nn===null)return;
  const r=await api('/groups/'+gid+'/nickname/'+uid,{method:'PUT',body:JSON.stringify({group_nickname:nn})});
  if(r.error){toast(r.error.message);return}
  toast('群昵称已更新');closeModal('manageModal');showManagePanel(gid);
}

async function showInviteModal(gid){
  const fr=await api('/friends');const friends=fr.data||[];
  let html=\`<div class="modal-mask" id="inviteModal" onclick="if(event.target===this)closeModal('inviteModal')"><div class="modal-box"><h3>邀请好友</h3>\`;
  if(!friends.length){html+='<p style="color:#666;font-size:14px">暂无好友</p>'}
  else{friends.forEach(f=>{html+=\`<div class="member-item"><span>\${escHtml(f.remark||f.nickname)}</span><button class="btn btn-sm btn-primary" onclick="inviteFriend('\${gid}','\${f.id}')">邀请</button></div>\`})}
  html+=\`<button class="btn btn-secondary" onclick="closeModal('inviteModal')" style="margin-top:12px">关闭</button></div></div>\`;
  document.body.insertAdjacentHTML('beforeend',html);
}

async function inviteFriend(gid,uid){
  const r=await api('/groups/'+gid+'/invite',{method:'POST',body:JSON.stringify({target_user_id:uid})});
  if(r.error){toast(r.error.message);return}
  toast('已邀请');closeModal('inviteModal');
}

async function confirmDisband(gid){
  if(!confirm('确认解散群聊？所有聊天记录将被永久删除！'))return;
  const r=await api('/groups/'+gid,{method:'DELETE'});
  if(r.error){toast(r.error.message);return}
  toast('群已解散');closeModal('manageModal');loadChats();
  activeChat=null;document.getElementById('chatTitle').textContent='选择聊天';
  document.getElementById('chatMessages').innerHTML='<div class="placeholder">选择一个聊天开始对话</div>';
  document.getElementById('inputArea').style.display='none';document.getElementById('chatActions').innerHTML='';
}

// FRIENDS
async function addFriend(){
  const inp=document.getElementById('addFriendInp');const name=inp.value.trim();
  if(!name)return;
  const usersR=await api('/users/search?q='+encodeURIComponent(name));
  const users=usersR.data||[];
  if(!users.length){toast('未找到用户');return}
  const u=users[0];
  if(u.id===currentUser.id){toast('不能添加自己');return}
  const r=await api('/friends',{method:'POST',body:JSON.stringify({user_id:u.id,remark:''})});
  if(r.error){toast(r.error.message);return}
  toast('好友已添加');inp.value='';loadChats();
}

async function confirmDeleteFriend(fid,nickname){
  if(!confirm('确认删除好友 '+nickname+' ？'))return;
  const r=await api('/friends/'+fid,{method:'DELETE'});
  if(r.error){toast(r.error.message);return}
  toast('已删除');loadChats();
}

// GROUP
async function searchAndChat(){
  const inp=document.getElementById('pmSearchInp');const name=inp.value.trim();
  if(!name)return;
  const usersR=await api('/users/search?q='+encodeURIComponent(name));
  const users=usersR.data||[];
  if(!users.length){toast('未找到用户');return}
  const u=users[0];
  if(u.id===currentUser.id){toast('不能和自己聊天');return}
  const r=await api('/chats/private',{method:'POST',body:JSON.stringify({target_user_id:u.id})});
  if(r.error){toast(r.error.message);return}
  inp.value='';loadChats();
}

async function searchGroup(){
  const inp=document.getElementById('groupSearchInp');const code=inp.value.trim();
  if(!code||code.length!==9){toast('请输入9位群号');return}
  const r=await api('/groups/search?code='+code);
  if(r.error){toast(r.error.message);return}
  const g=r.data;
  if(!confirm('找到群：'+g.name+'，是否加入？'))return;
  const jr=await api('/groups/'+g.id+'/join',{method:'POST'});
  if(jr.error){toast(jr.error.message);return}
  toast('已加入群聊');inp.value='';loadChats();
}

async function showCreateGroup(){
  const name=prompt('输入群名称（1-50字符）：');
  if(!name||name.length>50){toast('请输入有效群名');return}
  const r=await api('/groups',{method:'POST',body:JSON.stringify({name})});
  if(r.error){toast(r.error.message);return}
  toast('群聊已创建！群号：'+r.data.group_code);loadChats();
}

//PROFILE
function showProfile(){
  let html=\`<div class="modal-mask" id="profileModal" onclick="if(event.target===this)closeModal('profileModal')"><div class="modal-box"><h3>个人信息</h3>
    <p style="margin:8px 0;font-size:14px">昵称：\${escHtml(currentUser.nickname)}</p>
    <p style="margin:8px 0;font-size:14px;color:#666">ID：\${escHtml(currentUser.id)}</p>
    <p style="margin:8px 0;font-size:14px;color:#666">角色：\${currentUser.role==='super_admin'?'超级管理员':'普通用户'}</p>\`;
  html+=\`<div style="margin:16px 0"><button class="btn btn-sm btn-primary" onclick="showChangeNickname()">修改昵称</button>
    <button class="btn btn-sm btn-secondary" onclick="showChangePassword()">修改密码</button>
    <button class="btn btn-sm btn-danger" onclick="confirmDeleteAccount()">注销账号</button></div>\`;
  if(currentUser.role==='super_admin'){
    html+=\`<button class="btn btn-sm btn-primary" onclick="showAdminPanel()" style="width:100%;margin-top:8px">管理面板</button>\`;
  }
  html+=\`<button class="btn btn-secondary" onclick="closeModal('profileModal')" style="margin-top:12px">关闭</button></div></div>\`;
  document.body.insertAdjacentHTML('beforeend',html);
}

async function showChangeNickname(){
  const nn=prompt('输入新昵称（1-20字符，不能与他人重复）：',currentUser.nickname);
  if(!nn||nn.length>20||nn===currentUser.nickname)return;
  const r=await api('/users/me/nickname',{method:'PUT',body:JSON.stringify({nickname:nn})});
  if(r.error){toast(r.error.message);return}
  currentUser=r.data;localStorage.setItem('chat_user',JSON.stringify(currentUser));
  toast('昵称已修改');closeModal('profileModal');
}

async function showChangePassword(){
  const oldPw=prompt('请输入旧密码：');if(!oldPw)return;
  const newPw=prompt('请输入新密码（至少6位）：');if(!newPw||newPw.length<6){toast('密码至少6位');return}
  const r=await api('/auth/change-password',{method:'POST',body:JSON.stringify({old_password:oldPw,new_password:newPw})});
  if(r.error){toast(r.error.message);return}
  toast('密码已修改');closeModal('profileModal');
}

async function confirmDeleteAccount(){
  if(!confirm('确认注销账号？此操作不可撤销！'))return;
  const pw=prompt('请输入密码确认：');if(!pw)return;
  const r=await api('/auth/delete-account',{method:'DELETE',body:JSON.stringify({password:pw})});
  if(r.error){toast(r.error.message);return}
  toast('账号已注销');clearToken();renderAuth();
}

async function changeDefaultPassword(np){
  const r=await api('/auth/change-password',{method:'POST',body:JSON.stringify({old_password:'123456',new_password:np})});
  if(r.error){toast(r.error.message);return}
  toast('密码已修改');
}

async function showAdminPanel(){
  closeModal('profileModal');
  const usersR=await api('/admin/users');
  const groupsR=await api('/admin/groups');
  const users=usersR.data||[],groups=groupsR.data||[];
  let html=\`<div class="modal-mask" id="adminModal" onclick="if(event.target===this)closeModal('adminModal')"><div class="modal-box" style="max-width:600px"><h3>管理面板</h3>
    <h4 style="margin:12px 0 8px;font-size:14px">用户列表 (\${users.length})</h4><div class="member-list">\`;
  users.forEach(u=>{
    const banned=u.is_banned?'（已封禁）':'';
    const roleTag=u.role==='super_admin'?'<span class="role-badge role-owner">管理员</span>':'';
    html+=\`<div class="member-item"><div><span class="name">\${escHtml(u.nickname)}\${banned}</span>\${roleTag}</div><div>\`;
    if(u.role!=='super_admin'){
      if(u.is_banned)html+=\`<button class="btn btn-sm btn-green" onclick="adminUnban('\${u.id}')">解封</button> \`;
      else html+=\`<button class="btn btn-sm btn-danger" onclick="adminBan('\${u.id}')">封禁</button> \`;
      html+=\`<button class="btn btn-sm btn-secondary" onclick="adminChgPw('\${u.id}')">改密</button> \`;
      html+=\`<button class="btn btn-sm btn-danger" onclick="adminDelUser('\${u.id}')">删除</button>\`;
    }
    html+=\`</div></div>\`;
  });
  html+=\`</div><h4 style="margin:12px 0 8px;font-size:14px">群聊列表 (\${groups.length})</h4><div class="member-list">\`;
  groups.forEach(g=>{
    html+=\`<div class="member-item"><div><span class="name">\${escHtml(g.name)}</span><div class="chat-item-sub">群号:\${g.group_code} \${g.is_active?'':'已解散'}</div></div>\`;
    if(g.is_active)html+=\`<button class="btn btn-sm btn-danger" onclick="adminDisband('\${g.id}')">解散</button>\`;
    html+=\`</div>\`;
  });
  html+=\`</div><button class="btn btn-secondary" onclick="closeModal('adminModal')" style="margin-top:12px">关闭</button></div></div>\`;
  document.body.insertAdjacentHTML('beforeend',html);
}

async function adminBan(uid){const r=await api('/admin/ban/'+uid,{method:'POST'});if(r.error){toast(r.error.message);return}toast('已封禁');closeModal('adminModal');showAdminPanel()}
async function adminUnban(uid){const r=await api('/admin/unban/'+uid,{method:'POST'});if(r.error){toast(r.error.message);return}toast('已解封');closeModal('adminModal');showAdminPanel()}
async function adminDelUser(uid){if(!confirm('确认删除该用户？此操作不可撤销！'))return;const r=await api('/admin/users/'+uid,{method:'DELETE'});if(r.error){toast(r.error.message);return}toast('已删除');closeModal('adminModal');showAdminPanel()}
async function adminChgPw(uid){const np=prompt('输入新密码（至少6位）：');if(!np||np.length<6){toast('密码至少6位');return}const r=await api('/admin/users/'+uid+'/password',{method:'PUT',body:JSON.stringify({new_password:np})});if(r.error){toast(r.error.message);return}toast('密码已修改')}
async function adminDisband(gid){if(!confirm('确认解散该群？所有聊天记录将被删除！'))return;const r=await api('/admin/groups/'+gid,{method:'DELETE'});if(r.error){toast(r.error.message);return}toast('群已解散');closeModal('adminModal');showAdminPanel()}

function closeModal(id){document.getElementById(id)?.remove()}

function doLogout(){if(confirm('确认退出登录？')){clearToken();renderAuth()}}

//KEY BINDINGS
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&document.getElementById('msgInput')===document.activeElement){sendMsg()}
  else if(e.key==='Enter'&&document.getElementById('passwordInp')===document.activeElement){doLogin()}
});

//INIT
window.onload=()=>{
  token=localStorage.getItem('chat_token');
  const u=localStorage.getItem('chat_user');
  if(token&&u){currentUser=JSON.parse(u);renderApp()}else{renderAuth()}
};
<\/script>
</body>
</html>`;