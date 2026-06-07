import { Env } from './types';
import { DB } from './db';
import { authMiddleware } from './middleware';
import { createSuccessResponse } from './errors';
import { Errors } from './errors';

export async function handleCreateGroup(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { name } = body;

  if (!name || name.length < 1 || name.length > 50) {
    throw Errors.InvalidParams('群名称长度必须在 1-50 个字符之间');
  }

  const db = new DB(env.DB);
  const group = await db.createGroup(name, user.id);
  return createSuccessResponse(group);
}

export async function handleGetGroups(request: Request, env: Env): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);
  const groups = await db.getUserGroups(user.id);
  return createSuccessResponse(groups);
}

export async function handleGetGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  const member = await db.getGroupMember(groupId, user.id);
  if (!member) {
    throw Errors.Forbidden();
  }

  const members = await db.getGroupMembers(groupId);
  const myRole = member.role;
  return createSuccessResponse({ group, members, my_role: myRole });
}

export async function handleSearchGroupByCode(request: Request, env: Env): Promise<Response> {
  await authMiddleware(request, env);
  const url = new URL(request.url);
  const code = url.searchParams.get('code') || '';

  if (!code || code.length !== 9) {
    throw Errors.InvalidParams('群号必须为9位数字');
  }

  const db = new DB(env.DB);
  const group = await db.getGroupByCode(code);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  return createSuccessResponse({ id: group.id, name: group.name, group_code: group.group_code });
}

export async function handleUpdateGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { name } = body;

  const db = new DB(env.DB);
  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  const member = await db.getGroupMember(groupId, user.id);
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw Errors.Forbidden();
  }

  await db.updateGroupName(groupId, name);
  const updatedGroup = await db.getGroupById(groupId);

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/group-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, action: 'name_change', data: { name } })
  });

  return createSuccessResponse(updatedGroup);
}

export async function handleDisbandGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  if (group.owner_id !== user.id) {
    throw Errors.Forbidden();
  }

  await db.deleteGroupMessages(groupId);
  await db.disbandGroup(groupId);

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/group-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, action: 'disband', data: {} })
  });

  return createSuccessResponse({ success: true });
}

export async function handleJoinGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  const existingMember = await db.getGroupMember(groupId, user.id);
  if (existingMember) {
    return createSuccessResponse({ success: true });
  }

  await db.addGroupMember(groupId, user.id);

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/group-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, action: 'member_join', data: { user_id: user.id, nickname: user.nickname } })
  });

  return createSuccessResponse({ success: true });
}

export async function handleLeaveGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (group.owner_id === user.id) {
    throw Errors.InvalidParams('群主不能退出群，请先转让群主或解散群');
  }

  const member = await db.getGroupMember(groupId, user.id);
  if (!member) {
    throw Errors.NotFound('你不是群成员');
  }

  await db.removeGroupMember(groupId, user.id);

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/group-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, action: 'member_leave', data: { user_id: user.id, nickname: user.nickname } })
  });

  return createSuccessResponse({ success: true });
}

export async function handleKickMember(request: Request, env: Env, groupId: string, targetUserId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  if (user.id === targetUserId) {
    throw Errors.CannotKickSelf();
  }

  const currentMember = await db.getGroupMember(groupId, user.id);
  if (!currentMember) {
    throw Errors.Forbidden();
  }

  const targetMember = await db.getGroupMember(groupId, targetUserId);
  if (!targetMember) {
    throw Errors.NotFound('目标用户不是群成员');
  }

  if (currentMember.role !== 'owner') {
    if (targetMember.role === 'owner' || targetMember.role === 'admin') {
      throw Errors.CannotKickAdmin();
    }
    if (currentMember.role !== 'admin') {
      throw Errors.Forbidden();
    }
  }

  await db.removeGroupMember(groupId, targetUserId);

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/group-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, action: 'member_kicked', data: { user_id: targetUserId } })
  });

  return createSuccessResponse({ success: true });
}

export async function handleTransferOwner(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { new_owner_id } = body;

  const db = new DB(env.DB);
  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  if (group.owner_id !== user.id) {
    throw Errors.Forbidden();
  }

  const newOwnerMember = await db.getGroupMember(groupId, new_owner_id);
  if (!newOwnerMember) {
    throw Errors.NotFound('新群主不是群成员');
  }

  await db.updateGroupMemberRole(groupId, user.id, 'member');
  await db.updateGroupMemberRole(groupId, new_owner_id, 'owner');
  await db.transferGroupOwnership(groupId, new_owner_id);

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/group-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, action: 'owner_change', data: { new_owner_id } })
  });

  return createSuccessResponse({ success: true });
}

export async function handleSetAdmin(request: Request, env: Env, groupId: string, targetUserId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  if (group.owner_id !== user.id) {
    throw Errors.Forbidden();
  }

  const targetMember = await db.getGroupMember(groupId, targetUserId);
  if (!targetMember) {
    throw Errors.NotFound('目标用户不是群成员');
  }

  const newRole = targetMember.role === 'admin' ? 'member' : 'admin';
  await db.updateGroupMemberRole(groupId, targetUserId, newRole);

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/group-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, action: 'admin_change', data: { user_id: targetUserId, role: newRole } })
  });

  return createSuccessResponse({ success: true });
}

export async function handleInviteToGroup(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { target_user_id } = body;

  if (!target_user_id) {
    throw Errors.InvalidParams('目标用户ID不能为空');
  }

  const db = new DB(env.DB);
  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  const currentMember = await db.getGroupMember(groupId, user.id);
  if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
    throw Errors.Forbidden();
  }

  const targetUser = await db.getUserById(target_user_id);
  if (!targetUser) {
    throw Errors.NotFound('目标用户不存在');
  }

  const existingMember = await db.getGroupMember(groupId, target_user_id);
  if (existingMember) {
    throw Errors.InvalidParams('该用户已在群中');
  }

  await db.addGroupMember(groupId, target_user_id);

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/group-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: groupId, action: 'member_join', data: { user_id: target_user_id, nickname: targetUser.nickname } })
  });

  return createSuccessResponse({ success: true });
}

export async function handleSetGroupNickname(request: Request, env: Env, groupId: string, targetUserId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { group_nickname } = body;

  const db = new DB(env.DB);
  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  const currentMember = await db.getGroupMember(groupId, user.id);
  if (!currentMember || (currentMember.role !== 'owner' && currentMember.role !== 'admin')) {
    throw Errors.Forbidden();
  }

  const targetMember = await db.getGroupMember(groupId, targetUserId);
  if (!targetMember) {
    throw Errors.NotFound('目标用户不是群成员');
  }

  await db.updateGroupMemberNickname(groupId, targetUserId, group_nickname || '');

  return createSuccessResponse({ success: true, group_nickname: group_nickname || '' });
}

export async function handleGetGroupMessages(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const db = new DB(env.DB);

  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  const member = await db.getGroupMember(groupId, user.id);
  if (!member) {
    throw Errors.Forbidden();
  }

  const url = new URL(request.url);
  const before = url.searchParams.get('before');
  const limit = parseInt(url.searchParams.get('limit') || '50');

  const messages = await db.getMessages('group', groupId, before ? parseInt(before) : undefined, limit);
  return createSuccessResponse(messages);
}

export async function handleSendGroupMessage(request: Request, env: Env, groupId: string): Promise<Response> {
  const user = await authMiddleware(request, env);
  const body = await request.json<any>();
  const { content } = body;

  if (!content || content.length > 5000) {
    throw Errors.InvalidParams('消息内容不能为空且不能超过5000字符');
  }

  const db = new DB(env.DB);
  const group = await db.getGroupById(groupId);
  if (!group) {
    throw Errors.NotFound('群不存在');
  }

  if (!group.is_active) {
    throw Errors.GroupDisbanded();
  }

  const member = await db.getGroupMember(groupId, user.id);
  if (!member) {
    throw Errors.Forbidden();
  }

  const message = await db.createMessage('group', groupId, user.id, content);

  const memberData = await db.getGroupMember(groupId, user.id);
  const displayName = (memberData && memberData.group_nickname) ? memberData.group_nickname : user.nickname;

  const durableObjId = env.CHAT_ROOM.idFromName(`group:${groupId}`);
  const durableObj = env.CHAT_ROOM.get(durableObjId);
  await durableObj.fetch(`http://durable/new-message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_type: 'group', chat_id: groupId, message: { ...message, nickname: displayName } })
  });

  return createSuccessResponse({ ...message, nickname: displayName });
}