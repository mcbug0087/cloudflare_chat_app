
import { User, PrivateChat, Group, GroupMember, Message, Invitation } from './types';
import { Errors } from './errors';

export function generateId(): string {
  return crypto.randomUUID();
}

export class DB {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
    return result;
  }

  async getUserByNickname(nickname: string): Promise<User | null> {
    const result = await this.db.prepare('SELECT * FROM users WHERE nickname_lower = ?').bind(nickname.toLowerCase()).first<User>();
    return result;
  }

  async searchUsers(query: string): Promise<User[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const result = await this.db.prepare('SELECT * FROM users WHERE nickname_lower LIKE ? LIMIT 20').bind(searchTerm).all<User>();
    return result.results;
  }

  async createUser(nickname: string): Promise<User> {
    const id = generateId();
    const nicknameLower = nickname.toLowerCase();
    await this.db.prepare('INSERT INTO users (id, nickname, nickname_lower) VALUES (?, ?, ?)').bind(id, nickname, nicknameLower).run();
    return this.getUserById(id) as Promise<User>;
  }

  async getPrivateChat(user1Id: string, user2Id: string): Promise<PrivateChat | null> {
    const result = await this.db.prepare('SELECT * FROM private_chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)')
      .bind(user1Id, user2Id, user2Id, user1Id)
      .first<PrivateChat>();
    return result;
  }

  async createPrivateChat(user1Id: string, user2Id: string): Promise<PrivateChat> {
    const id = generateId();
    const sortedIds = [user1Id, user2Id].sort();
    await this.db.prepare('INSERT INTO private_chats (id, user1_id, user2_id) VALUES (?, ?, ?)')
      .bind(id, sortedIds[0], sortedIds[1])
      .run();
    return this.getPrivateChatById(id) as Promise<PrivateChat>;
  }

  async getPrivateChatById(id: string): Promise<PrivateChat | null> {
    const result = await this.db.prepare('SELECT * FROM private_chats WHERE id = ?').bind(id).first<PrivateChat>();
    return result;
  }

  async getUserPrivateChats(userId: string): Promise<PrivateChat[]> {
    const result = await this.db.prepare('SELECT * FROM private_chats WHERE user1_id = ? OR user2_id = ?').bind(userId, userId).all<PrivateChat>();
    return result.results;
  }

  async createGroup(name: string, ownerId: string): Promise<Group> {
    const id = generateId();
    await this.db.prepare('INSERT INTO groups (id, name, owner_id) VALUES (?, ?, ?)').bind(id, name, ownerId).run();
    await this.db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').bind(id, ownerId, 'owner').run();
    return this.getGroupById(id) as Promise<Group>;
  }

  async getGroupById(id: string): Promise<Group | null> {
    const result = await this.db.prepare('SELECT * FROM groups WHERE id = ?').bind(id).first<Group>();
    return result;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const result = await this.db.prepare('SELECT g.* FROM groups g INNER JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = ? AND g.is_active = 1').bind(userId).all<Group>();
    return result.results;
  }

  async getGroupMembers(groupId: string): Promise<(GroupMember & { nickname: string })[]> {
    const result = await this.db.prepare('SELECT gm.*, u.nickname FROM group_members gm INNER JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?').bind(groupId).all<any>();
    return result.results;
  }

  async getGroupMember(groupId: string, userId: string): Promise<GroupMember | null> {
    const result = await this.db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').bind(groupId, userId).first<GroupMember>();
    return result;
  }

  async addGroupMember(groupId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise<void> {
    await this.db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').bind(groupId, userId, role).run();
  }

  async updateGroupMemberRole(groupId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise<void> {
    await this.db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').bind(role, groupId, userId).run();
  }

  async removeGroupMember(groupId: string, userId: string): Promise<void> {
    await this.db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').bind(groupId, userId).run();
  }

  async updateGroupName(groupId: string, name: string): Promise<void> {
    await this.db.prepare('UPDATE groups SET name = ? WHERE id = ?').bind(name, groupId).run();
  }

  async transferGroupOwnership(groupId: string, newOwnerId: string): Promise<void> {
    await this.db.prepare('UPDATE groups SET owner_id = ? WHERE id = ?').bind(newOwnerId, groupId).run();
  }

  async disbandGroup(groupId: string): Promise<void> {
    await this.db.prepare('UPDATE groups SET is_active = 0 WHERE id = ?').bind(groupId).run();
  }

  async createMessage(chatType: 'private' | 'group', chatId: string, senderId: string, content: string): Promise<Message> {
    const id = generateId();
    await this.db.prepare('INSERT INTO messages (id, chat_type, chat_id, sender_id, content) VALUES (?, ?, ?, ?, ?)')
      .bind(id, chatType, chatId, senderId, content)
      .run();
    return this.getMessageById(id) as Promise<Message>;
  }

  async getMessageById(id: string): Promise<Message | null> {
    const result = await this.db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first<Message>();
    return result;
  }

  async getMessages(chatType: 'private' | 'group', chatId: string, before?: number, limit: number = 50): Promise<(Message & { nickname: string })[]> {
    let query = 'SELECT m.*, u.nickname FROM messages m INNER JOIN users u ON m.sender_id = u.id WHERE m.chat_type = ? AND m.chat_id = ?';
    const params: any[] = [chatType, chatId];
    if (before) {
      query += ' AND m.created_at < ?';
      params.push(before);
    }
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);
    const result = await this.db.prepare(query).bind(...params).all<any>();
    return result.results;
  }

  async createInvitation(groupId: string, inviterId: string, inviteeId: string): Promise<Invitation> {
    const id = generateId();
    await this.db.prepare('INSERT INTO invitations (id, group_id, inviter_id, invitee_id) VALUES (?, ?, ?, ?)')
      .bind(id, groupId, inviterId, inviteeId)
      .run();
    return this.getInvitationById(id) as Promise<Invitation>;
  }

  async getInvitationById(id: string): Promise<Invitation | null> {
    const result = await this.db.prepare('SELECT * FROM invitations WHERE id = ?').bind(id).first<Invitation>();
    return result;
  }

  async updateInvitationStatus(id: string, status: 'pending' | 'accepted' | 'rejected'): Promise<void> {
    await this.db.prepare('UPDATE invitations SET status = ? WHERE id = ?').bind(status, id).run();
  }
}

