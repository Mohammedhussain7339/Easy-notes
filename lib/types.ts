
export type Category =
  | "Personal"
  | "Work"
  | "Ideas"
  | "Journal"
  | "To-do"
  | "Other";

export const CATEGORIES: Category[] = [
  "Personal",
  "Work",
  "Ideas",
  "Journal",
  "To-do",
  "Other",
];

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: Category;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NoteDraft = Pick<
  Note,
  "title" | "content" | "category"
>;
