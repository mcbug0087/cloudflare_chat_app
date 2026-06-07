export interface User {
  id: string;
  nickname: string;
  nickname_lower: string;
  password_hash: string;
  created_at: number;
}

export interface Friend {
  user_id: string;
  friend_id: string;
  remark: string;
  created_at: number;
}

export interface FriendInfo {
  id: string;
  nickname: string;
  remark: string;
  created_at: number;
}

export interface PrivateChat {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: number;
}

export interface Group {
  id: string;
  name: string;
  owner_id: string;
  group_code: string;
  is_active: number;
  created_at: number;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  group_nickname: string;
  joined_at: number;
}

export interface Message {
  id: string;
  chat_type: 'private' | 'group';
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: number;
}

export interface Invitation {
  id: string;
  group_id: string;
  inviter_id: string;
  invitee_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
}

export interface Env {
  DB: D1Database;
  CHAT_KV: KVNamespace;
  CHAT_ROOM: DurableObjectNamespace;
}

export interface AuthResult {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export type ChatType = 'private' | 'group';

export interface ChatSubscription {
  chat_id: string;
  chat_type: ChatType;
}