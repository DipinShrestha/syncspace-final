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
export const register = (name: string, email: string, password: string) =>
  api.post('/auth/register', { name, email, password });

export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const getMe = () => api.get('/auth/me');

// ========== Workspace endpoints ==========
export const getWorkspaces = () => api.get('/workspaces');
export const createWorkspace = (data: { name: string; description?: string }) =>
  api.post('/workspaces', data);
export const inviteMember = (workspaceId: string, email: string) =>
  api.post(`/workspaces/${workspaceId}/members`, { email });
export const getWorkspaceById = (id: string) =>
  api.get(`/workspaces/${id}`);
export const deleteWorkspace = (id: string) => api.delete(`/workspaces/${id}`);
export const removeWorkspaceMember = (workspaceId: string, userId: string) =>
  api.delete(`/workspaces/${workspaceId}/members/${userId}`);

// ========== Board endpoints ==========
export const getBoardsByWorkspace = (workspaceId: string) =>
  api.get(`/boards/workspace/${workspaceId}`);
export const createBoard = (data: { title: string; workspaceId: string }) =>
  api.post('/boards', data);
export const addList = (boardId: string, title: string) =>
  api.post(`/boards/${boardId}/lists`, { title });
export const addCard = (boardId: string, listIndex: number, data: CardData) =>
  api.post(`/boards/${boardId}/lists/${listIndex}/cards`, data);
export const updateCard = (cardId: string, data: CardData) =>
  api.put(`/cards/${cardId}`, data);
export const moveCard = (cardId: string, data: { targetBoardId: string; targetListIndex: number; newPosition: number }) =>
  api.patch(`/cards/${cardId}/move`, data);
export const deleteCard = (cardId: string) => api.delete(`/cards/${cardId}`);   // ✅ only one!

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

export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api.put('/auth/password', data);

export const deleteAccount = () => api.delete('/auth/account');

// NOTE: avatar upload used to go through /upload/avatar via a manually-set
// 'Content-Type: multipart/form-data' header, which breaks multipart parsing
// because axios never gets the chance to attach the required boundary. The
// route was also never mounted on the backend, and the Settings page uses a
// plain avatar URL field instead — so the dead, broken function was removed
// rather than fixed. If avatar file upload is added back, use the same
// pattern as the working /upload endpoint (lib/api.ts callers pass FormData
// and let axios/fetch set Content-Type automatically — never set it by hand).

export default api;

