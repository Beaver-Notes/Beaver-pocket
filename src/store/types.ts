import { Content } from "@tiptap/react";

export type Note = {
  id: string;
  title: string;
  content: Content;
  updatedAt: Date;
  createdAt: Date;
  labels: string[];
  isBookmarked: boolean;
  isArchived: boolean;
  isLocked: boolean;
  lastCursorPosition: number;
};
