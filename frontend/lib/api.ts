// frontend/lib/api.ts (corrected – duplicate removed)
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ========== Type definitions ==========
interface CardData {
  title?: string;
  description?: string;
  dueDate?: string;
  labels?: string[];
  assignedTo?: string;
  position?: number;
  boardId?: string;
  targetListIndex?: number;
  newPosition?: number;
  code?: string;
  codeFileUrl?: string;
  list?: string;
}

// ========== Auth endpoints ==========
// Sign-in is Google-only — one call handles both first-time sign-up and
// returning login. `credential` is the ID token string Google Identity
// Services hands back to the button's callback.
export interface GoogleAuthResponse {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  token: string;
  isNewUser: boolean;
}
export const googleAuth = (credential: string) =>
  api.post<GoogleAuthResponse>('/auth/google', { credential });

export const getMe = () => api.get('/auth/me');

// ========== Workspace endpoints ==========
export const getWorkspaces = () => api.get('/workspaces');
export const createWorkspace = (data: { name: string; description?: string }) =>
  api.post('/workspaces', data);
export const inviteMember = (workspaceId: string, email: string) =>
  api.post(`/workspaces/${workspaceId}/members`, { email });
export const getWorkspaceById = (id: string) => api.get(`/workspaces/${id}`);
export const deleteWorkspace = (id: string) => api.delete(`/workspaces/${id}`);
export const removeWorkspaceMember = (workspaceId: string, userId: string) =>
  api.delete(`/workspaces/${workspaceId}/members/${userId}`);
export const acceptWorkspaceInvite = (workspaceId: string) =>
  api.post(`/workspaces/${workspaceId}/accept-invite`);
export const declineWorkspaceInvite = (workspaceId: string) =>
  api.post(`/workspaces/${workspaceId}/decline-invite`);
// `identifier` may be a user id or a raw invited email (see MembersPanel) —
// encode it since emails contain characters like '@'.
export const cancelWorkspaceInvite = (workspaceId: string, identifier: string) =>
  api.delete(`/workspaces/${workspaceId}/invites/${encodeURIComponent(identifier)}`);

// ========== Board endpoints ==========
export const getBoardsByWorkspace = (workspaceId: string) =>
  api.get(`/boards/workspace/${workspaceId}`);
export const createBoard = (data: { title: string; workspaceId: string }) =>
  api.post('/boards', data);
export const addList = (boardId: string, title: string) =>
  api.post(`/boards/${boardId}/lists`, { title });
export const addCard = (boardId: string, listIndex: number, data: CardData) =>
  api.post(`/boards/${boardId}/lists/${listIndex}/cards`, data);
export const updateCard = (cardId: string, data: CardData) => api.put(`/cards/${cardId}`, data);
export const moveCard = (
  cardId: string,
  data: { targetBoardId: string; targetListIndex: number; newPosition: number },
) => api.patch(`/cards/${cardId}/move`, data);
export const deleteCard = (cardId: string) => api.delete(`/cards/${cardId}`); // ✅ only one!

// ========== Document endpoints ==========
export const getDocumentsByWorkspace = (workspaceId: string) =>
  api.get(`/documents/workspace/${workspaceId}`);
export const createDocument = (data: { title: string; content: string; workspaceId: string }) =>
  api.post('/documents', data);
export const updateDocument = (id: string, data: { title?: string; content?: string }) =>
  api.put(`/documents/${id}`, data);
export const deleteDocument = (id: string) => api.delete(`/documents/${id}`);

// ========== User profile endpoints ==========
export const updateProfile = (data: { name?: string; avatar?: string }) =>
  api.put('/auth/profile', data);

export const deleteAccount = () => api.delete('/auth/account');

// ========== Notification endpoints ==========
export interface NotificationItem {
  _id: string;
  type:
    | 'task_assigned'
    | 'workspace_invite'
    | 'invite_accepted'
    | 'invite_declined'
    | 'new_message'
    | 'new_comment'
    | 'incoming_call'
    | 'generic';
  message: string;
  workspace?: { _id: string; name: string } | string;
  card?: string;
  read: boolean;
  createdAt: string;
}
export const getNotifications = () => api.get<NotificationItem[]>('/notifications');
export const markNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

// Avatar upload — this `api` axios instance sets a default
// 'Content-Type: application/json' header on every request, which can fight
// with FormData's required multipart boundary. Rather than rely on axios to
// strip that default, use plain fetch() here — the same pattern already
// proven to work for card file uploads in TaskDetailsModal — and let the
// browser set Content-Type itself.
export const uploadAvatar = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('avatar', file);
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: formData,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Upload failed');
  return res.json();
};

export default api;
