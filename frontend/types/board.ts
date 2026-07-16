// frontend/types/board.ts
export interface Card {
  _id: string;
  title: string;
  description?: string;
  labels?: string[];
  dueDate?: string;
  assignedTo?: string;
  position: number;
  code?: string; // for Monaco editor code
  codeFileUrl?: string; // for uploaded file URL
}

export interface List {
  _id?: string;
  title: string;
  cards: Card[];
}

export interface Board {
  _id: string;
  title: string;
  lists: List[];
}
