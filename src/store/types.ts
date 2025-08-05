import { Content } from "@tiptap/react";

export type Note = {
  id: string;
  title: string;
  content: Content;
  updatedAt: number;
  createdAt: number;
  labels: string[];
  isBookmarked: boolean;
  isArchived: boolean;
  isLocked: boolean;
  folderId: string | null;
  lastCursorPosition: number;
};

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  color?: string | null;
  isExpanded?: boolean;
  icon?: string;
  sortOrder?: number;
}
