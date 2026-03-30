import * as z from 'zod';
import { HttpError } from 'wasp/server';
import { type File } from 'wasp/entities';
import {
  type CreateFile,
  type GetAllFilesByUser,
  type GetDownloadFileSignedURL,
  type DeleteFile,
} from 'wasp/server/operations';

import { getUploadFileSignedURLFromS3, getDownloadFileSignedURLFromS3, deleteFileFromS3 } from './s3Utils';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';
import { ALLOWED_FILE_TYPES } from './validation';

const createFileInputSchema = z.object({
  fileType: z.enum(ALLOWED_FILE_TYPES),
  fileName: z.string().nonempty(),
});

type CreateFileInput = z.infer<typeof createFileInputSchema>;

export const createFile: CreateFile<
  CreateFileInput,
  {
    s3UploadUrl: string;
    s3UploadFields: Record<string, string>;
  }
> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }

  const { fileType, fileName } = ensureArgsSchemaOrThrowHttpError(createFileInputSchema, rawArgs);

  const { s3UploadUrl, s3UploadFields, key } = await getUploadFileSignedURLFromS3({
    fileType,
    fileName,
    userId: context.user.id,
  });

  const file = await context.entities.File.create({
    data: {
      name: fileName,
      key,
      uploadUrl: s3UploadUrl,
      type: fileType,
      user: { connect: { id: context.user.id } },
    },
  });

  return {
    s3UploadUrl,
    s3UploadFields,
    fileId: file.id,
  };
};

export const getAllFilesByUser: GetAllFilesByUser<void, File[]> = async (_args, context) => {
  if (!context.user) {
    throw new HttpError(401);
  }
  return context.entities.File.findMany({
    where: {
      user: {
        id: context.user.id,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

const getDownloadFileSignedURLInputSchema = z.object({ key: z.string().nonempty() });

type GetDownloadFileSignedURLInput = z.infer<typeof getDownloadFileSignedURLInputSchema>;

export const getDownloadFileSignedURL: GetDownloadFileSignedURL<
  GetDownloadFileSignedURLInput,
  string
> = async (rawArgs, _context) => {
  const { key } = ensureArgsSchemaOrThrowHttpError(getDownloadFileSignedURLInputSchema, rawArgs);
  return await getDownloadFileSignedURLFromS3({ key });
};

const deleteFileInputSchema = z.object({ id: z.string().nonempty() });

type DeleteFileInput = z.infer<typeof deleteFileInputSchema>;

export const deleteFile: DeleteFile<DeleteFileInput, void> = async (rawArgs, context) => {
  if (!context.user) {
    throw new HttpError(401, 'Must be logged in');
  }
  if (!context.user.isAdmin) {
    throw new HttpError(403, 'Must be an admin to delete files');
  }

  const { id } = ensureArgsSchemaOrThrowHttpError(deleteFileInputSchema, rawArgs);

  const file = await context.entities.File.findUnique({
    where: { id },
  });

  if (!file) {
    throw new HttpError(404, 'File not found');
  }

  // Remove from S3
  try {
    await deleteFileFromS3(file.key);
  } catch (err) {
    console.error('Failed to delete file from S3', err);
    throw new HttpError(500, 'Failed to delete file from S3');
  }

  // First delete any PostNote that uses this file to avoid foreign key constraints,
  // or simply delete the file if cascade logic isn't strictly there
  // Actually PostNote has a nullable fileId, so we can just set fileId to null or let Prisma handle it if it cascades or delete the File.
  // Wait, if PostNote references File, we might need to nullify it first if cascade isn't set.
  // We'll update any PostNote that references this file, setting fileId to null.
  await context.entities.PostNote.updateMany({
    where: { fileId: id },
    data: { fileId: null },
  });

  // Remove from DB
  await context.entities.File.delete({
    where: { id },
  });
};
