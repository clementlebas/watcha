import { type PostNote, type PostArticle, type User } from 'wasp/entities';
import {
  type GetNotes,
  type CreateNote,
  type UpdateNote,
  type DeleteNote,
  type GetArticles,
  type CreateArticle,
  type DeleteArticle,
  type UpdateUserSettings,
  type GetUserStatistics
} from 'wasp/server/operations';
import { HttpError } from 'wasp/server';

// ==========================================
// STATISTICS
// ==========================================

type TimeByCategory = {
  name: string;
  totalSeconds: number;
};

type ActivityDay = {
  date: string;
  count: number;
};

type UserStatisticsResult = {
  totalNotes: number;
  totalTimeSeconds: number;
  averageTimeSeconds: number;
  timeByTopic: TimeByTopic[];
  topTopics: string[];
  activityTimeline: ActivityDay[];
};

type TimeByTopic = {
  name: string;
  totalSeconds: number;
};

export const getUserStatistics: GetUserStatistics<void, UserStatisticsResult> = async (_args, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  const notes = await context.entities.PostNote.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
  });

  const totalNotes = notes.length;

  // Total & average time (uses elapsedTimeInSecond field)
  const totalTimeSeconds = notes.reduce((sum, n) => sum + (n.elapsedTimeInSecond ?? 0), 0);
  const averageTimeSeconds = totalNotes > 0 ? Math.round(totalTimeSeconds / totalNotes) : 0;

  // Time by topic
  const topicMap = new Map<string, number>();
  for (const note of notes) {
    const noteTime = note.elapsedTimeInSecond ?? 0;
    for (const top of note.topics) {
      topicMap.set(top, (topicMap.get(top) ?? 0) + noteTime);
    }
  }
  const timeByTopic: TimeByTopic[] = Array.from(topicMap.entries())
    .map(([name, totalSeconds]) => ({ name, totalSeconds }))
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  // Top 3 topics (by usage count, not time)
  const topicCount = new Map<string, number>();
  for (const note of notes) {
    for (const top of note.topics) {
      topicCount.set(top, (topicCount.get(top) ?? 0) + 1);
    }
  }
  const topTopics = Array.from(topicCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // Activity timeline (last 30 days)
  const today = new Date();
  const activityTimeline: ActivityDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const count = notes.filter(n => {
      const noteDate = n.createdAt.toISOString().slice(0, 10);
      return noteDate === dateStr;
    }).length;
    activityTimeline.push({ date: dateStr, count });
  }

  return {
    totalNotes,
    totalTimeSeconds,
    averageTimeSeconds,
    timeByTopic,
    topTopics,
    activityTimeline,
  };
};

// ==========================================
// NOTES (PostNote)
// ==========================================

type GetNotesArgs = {
  search?: string;
  topic?: string;
  color?: string;
  isBookmark?: boolean;
};

export const getNotes: GetNotes<GetNotesArgs, PostNote[]> = async (args, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  return context.entities.PostNote.findMany({
    where: { 
      userId: context.user.id,
      ...(args.search && { title: { contains: args.search, mode: 'insensitive' } }),
      ...(args.topic && { topics: { has: args.topic } }),
      ...(args.color && { color: args.color }),
      ...(args.isBookmark !== undefined && { isBookmark: args.isBookmark }),
    },
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
  topics?: string[];
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
  topics?: string[];
  color?: string;
  isBookmark?: boolean;
  fileId?: string;
  removeImage?: boolean;
};

export const updateNote: UpdateNote<UpdateNoteArgs, PostNote> = async ({ id, fileId, removeImage, ...updateData }, context) => {
  if (!context.user) throw new HttpError(401, 'User must be logged in');

  // Verify ownership
  const note = await context.entities.PostNote.findUnique({ where: { id } });
  if (!note || note.userId !== context.user.id) {
    throw new HttpError(403, 'Unauthorized or Not Found');
  }

  return context.entities.PostNote.update({
    where: { id },
    data: {
      ...updateData,
      ...(fileId && { file: { connect: { id: fileId } } }),
      ...(removeImage && { file: { disconnect: true } }),
    },
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


