
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

  async getUserById(id: string): Promise&lt;User | null&gt; {
    const result = await this.db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first&lt;User&gt;();
    return result;
  }

  async getUserByNickname(nickname: string): Promise&lt;User | null&gt; {
    const result = await this.db.prepare('SELECT * FROM users WHERE nickname_lower = ?').bind(nickname.toLowerCase()).first&lt;User&gt;();
    return result;
  }

  async searchUsers(query: string): Promise&lt;User[]&gt; {
    const searchTerm = `%${query.toLowerCase()}%`;
    const result = await this.db.prepare('SELECT * FROM users WHERE nickname_lower LIKE ? LIMIT 20').bind(searchTerm).all&lt;User&gt;();
    return result.results;
  }

  async createUser(nickname: string): Promise&lt;User&gt; {
    const id = generateId();
    const nicknameLower = nickname.toLowerCase();
    await this.db.prepare('INSERT INTO users (id, nickname, nickname_lower) VALUES (?, ?, ?)').bind(id, nickname, nicknameLower).run();
    return this.getUserById(id) as Promise&lt;User&gt;;
  }

  async getPrivateChat(user1Id: string, user2Id: string): Promise&lt;PrivateChat | null&gt; {
    const result = await this.db.prepare('SELECT * FROM private_chats WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)')
      .bind(user1Id, user2Id, user2Id, user1Id)
      .first&lt;PrivateChat&gt;();
    return result;
  }

  async createPrivateChat(user1Id: string, user2Id: string): Promise&lt;PrivateChat&gt; {
    const id = generateId();
    const sortedIds = [user1Id, user2Id].sort();
    await this.db.prepare('INSERT INTO private_chats (id, user1_id, user2_id) VALUES (?, ?, ?)')
      .bind(id, sortedIds[0], sortedIds[1])
      .run();
    return this.getPrivateChatById(id) as Promise&lt;PrivateChat&gt;;
  }

  async getPrivateChatById(id: string): Promise&lt;PrivateChat | null&gt; {
    const result = await this.db.prepare('SELECT * FROM private_chats WHERE id = ?').bind(id).first&lt;PrivateChat&gt;();
    return result;
  }

  async getUserPrivateChats(userId: string): Promise&lt;PrivateChat[]&gt; {
    const result = await this.db.prepare('SELECT * FROM private_chats WHERE user1_id = ? OR user2_id = ?').bind(userId, userId).all&lt;PrivateChat&gt;();
    return result.results;
  }

  async createGroup(name: string, ownerId: string): Promise&lt;Group&gt; {
    const id = generateId();
    await this.db.prepare('INSERT INTO groups (id, name, owner_id) VALUES (?, ?, ?)').bind(id, name, ownerId).run();
    await this.db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').bind(id, ownerId, 'owner').run();
    return this.getGroupById(id) as Promise&lt;Group&gt;;
  }

  async getGroupById(id: string): Promise&lt;Group | null&gt; {
    const result = await this.db.prepare('SELECT * FROM groups WHERE id = ?').bind(id).first&lt;Group&gt;();
    return result;
  }

  async getUserGroups(userId: string): Promise&lt;Group[]&gt; {
    const result = await this.db.prepare('SELECT g.* FROM groups g INNER JOIN group_members gm ON g.id = gm.group_id WHERE gm.user_id = ? AND g.is_active = 1').bind(userId).all&lt;Group&gt;();
    return result.results;
  }

  async getGroupMembers(groupId: string): Promise&lt;(GroupMember &amp; { nickname: string })[]&gt; {
    const result = await this.db.prepare('SELECT gm.*, u.nickname FROM group_members gm INNER JOIN users u ON gm.user_id = u.id WHERE gm.group_id = ?').bind(groupId).all&lt;any&gt;();
    return result.results;
  }

  async getGroupMember(groupId: string, userId: string): Promise&lt;GroupMember | null&gt; {
    const result = await this.db.prepare('SELECT * FROM group_members WHERE group_id = ? AND user_id = ?').bind(groupId, userId).first&lt;GroupMember&gt;();
    return result;
  }

  async addGroupMember(groupId: string, userId: string, role: 'owner' | 'admin' | 'member' = 'member'): Promise&lt;void&gt; {
    await this.db.prepare('INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)').bind(groupId, userId, role).run();
  }

  async updateGroupMemberRole(groupId: string, userId: string, role: 'owner' | 'admin' | 'member'): Promise&lt;void&gt; {
    await this.db.prepare('UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?').bind(role, groupId, userId).run();
  }

  async removeGroupMember(groupId: string, userId: string): Promise&lt;void&gt; {
    await this.db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').bind(groupId, userId).run();
  }

  async updateGroupName(groupId: string, name: string): Promise&lt;void&gt; {
    await this.db.prepare('UPDATE groups SET name = ? WHERE id = ?').bind(name, groupId).run();
  }

  async transferGroupOwnership(groupId: string, newOwnerId: string): Promise&lt;void&gt; {
    await this.db.prepare('UPDATE groups SET owner_id = ? WHERE id = ?').bind(newOwnerId, groupId).run();
  }

  async disbandGroup(groupId: string): Promise&lt;void&gt; {
    await this.db.prepare('UPDATE groups SET is_active = 0 WHERE id = ?').bind(groupId).run();
  }

  async createMessage(chatType: 'private' | 'group', chatId: string, senderId: string, content: string): Promise&lt;Message&gt; {
    const id = generateId();
    await this.db.prepare('INSERT INTO messages (id, chat_type, chat_id, sender_id, content) VALUES (?, ?, ?, ?, ?)')
      .bind(id, chatType, chatId, senderId, content)
      .run();
    return this.getMessageById(id) as Promise&lt;Message&gt;;
  }

  async getMessageById(id: string): Promise&lt;Message | null&gt; {
    const result = await this.db.prepare('SELECT * FROM messages WHERE id = ?').bind(id).first&lt;Message&gt;();
    return result;
  }

  async getMessages(chatType: 'private' | 'group', chatId: string, before?: number, limit: number = 50): Promise&lt;(Message &amp; { nickname: string })[]&gt; {
    let query = 'SELECT m.*, u.nickname FROM messages m INNER JOIN users u ON m.sender_id = u.id WHERE m.chat_type = ? AND m.chat_id = ?';
    const params: any[] = [chatType, chatId];
    if (before) {
      query += ' AND m.created_at &lt; ?';
      params.push(before);
    }
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);
    const result = await this.db.prepare(query).bind(...params).all&lt;any&gt;();
    return result.results;
  }

  async createInvitation(groupId: string, inviterId: string, inviteeId: string): Promise&lt;Invitation&gt; {
    const id = generateId();
    await this.db.prepare('INSERT INTO invitations (id, group_id, inviter_id, invitee_id) VALUES (?, ?, ?, ?)')
      .bind(id, groupId, inviterId, inviteeId)
      .run();
    return this.getInvitationById(id) as Promise&lt;Invitation&gt;;
  }

  async getInvitationById(id: string): Promise&lt;Invitation | null&gt; {
    const result = await this.db.prepare('SELECT * FROM invitations WHERE id = ?').bind(id).first&lt;Invitation&gt;();
    return result;
  }

  async updateInvitationStatus(id: string, status: 'pending' | 'accepted' | 'rejected'): Promise&lt;void&gt; {
    await this.db.prepare('UPDATE invitations SET status = ? WHERE id = ?').bind(status, id).run();
  }
}

