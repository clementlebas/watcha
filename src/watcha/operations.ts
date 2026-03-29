import { type PostNote, type PostArticle, type User } from 'wasp/entities';
import {
  type GetNotes,
  type CreateNote,
  type UpdateNote,
  type DeleteNote,
  type GetArticles,
  type CreateArticle,
  type DeleteArticle,
  type UpdateUserSettings
} from 'wasp/server/operations';
import { HttpError } from 'wasp/server';

// ==========================================
// NOTES (PostNote)
// ==========================================

export const getNotes: GetNotes<void, PostNote[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  return context.entities.PostNote.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
    include: { file: true }
  });
};

type CreateNoteArgs = {
  title?: string;
  text?: string;
  date?: string;
  elapsedTime?: string;
  elapsedTimeInSecond?: number;
  categories?: string[];
  color?: string;
  urlImage?: string;
  imageKey?: string;
  fileId?: string;
};

export const createNote: CreateNote<CreateNoteArgs, PostNote> = async ({ fileId, ...args }, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  return context.entities.PostNote.create({
    data: {
      ...args,
      user: { connect: { id: context.user.id } },
      ...(fileId && { file: { connect: { id: fileId } } }),
    },
  });
};

type UpdateNoteArgs = {
  id: string;
  title?: string;
  text?: string;
  categories?: string[];
  color?: string;
  isBookmark?: boolean;
  urlImage?: string;
};

export const updateNote: UpdateNote<UpdateNoteArgs, PostNote> = async ({ id, ...updateData }, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  // Verify ownership
  const note = await context.entities.PostNote.findUnique({ where: { id } });
  if (!note || note.userId !== context.user.id) {
    throw new HttpError(403, 'Unauthorized or Not Found');
  }

  return context.entities.PostNote.update({
    where: { id },
    data: updateData,
  });
};

export const deleteNote: DeleteNote<{ id: string }, void> = async ({ id }, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  // Verify ownership
  const note = await context.entities.PostNote.findUnique({ where: { id } });
  if (!note || note.userId !== context.user.id) {
    throw new HttpError(403, 'Unauthorized or Not Found');
  }

  await context.entities.PostNote.delete({
    where: { id },
  });
};


// ==========================================
// ARTICLES (PostArticle)
// ==========================================

export const getArticles: GetArticles<void, PostArticle[]> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  return context.entities.PostArticle.findMany({
    where: { holderId: context.user.id },
    orderBy: { createdAt: 'desc' },
  });
};

type CreateArticleArgs = {
  title?: string;
  publishedAt?: string;
  urlImage?: string;
  source?: string;
  url?: string;
  urlFavicon?: string;
  topic?: string;
};

export const createArticle: CreateArticle<CreateArticleArgs, PostArticle> = async (args, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  return context.entities.PostArticle.create({
    data: {
      ...args,
      holder: { connect: { id: context.user.id } },
    },
  });
};

export const deleteArticle: DeleteArticle<{ id: string }, void> = async ({ id }, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  // Verify ownership
  const article = await context.entities.PostArticle.findUnique({ where: { id } });
  if (!article || article.holderId !== context.user.id) {
    throw new HttpError(403, 'Unauthorized or Not Found');
  }

  await context.entities.PostArticle.delete({
    where: { id },
  });
};


// ==========================================
// SETTINGS
// ==========================================

type UpdateSettingsArgs = {
  firstName?: string;
  picture?: string;
  defaultTimer?: string;
  routine?: any;
  topics?: string[];
  tagsList?: string[];
  categories?: string[];
};

export const updateUserSettings: UpdateUserSettings<UpdateSettingsArgs, User> = async (args, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  return context.entities.User.update({
    where: { id: context.user.id },
    data: args,
  });
};
