import { type Prisma } from '@prisma/client';
import { type User } from 'wasp/entities';
import { HttpError, prisma } from 'wasp/server';
import { type GetPaginatedUsers, type UpdateIsUserAdminById, type UpdateUserSettings } from 'wasp/server/operations';
import * as z from 'zod';
import { SubscriptionStatus } from '../payment/plans';
import { ensureArgsSchemaOrThrowHttpError } from '../server/validation';

const updateUserAdminByIdInputSchema = z.object({
  id: z.string().nonempty(),
  isAdmin: z.boolean(),
});

type UpdateUserAdminByIdInput = z.infer<typeof updateUserAdminByIdInputSchema>;

export const updateIsUserAdminById: UpdateIsUserAdminById<UpdateUserAdminByIdInput, User> = async (
  rawArgs,
  context
) => {
  const { id, isAdmin } = ensureArgsSchemaOrThrowHttpError(updateUserAdminByIdInputSchema, rawArgs);

  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users are allowed to perform this operation');
  }

  if (!context.user.isAdmin) {
    throw new HttpError(403, 'Only admins are allowed to perform this operation');
  }

  return context.entities.User.update({
    where: { id },
    data: { isAdmin },
  });
};

type GetPaginatedUsersOutput = {
  users: Pick<
    User,
    'id' | 'email' | 'username' | 'subscriptionStatus' | 'paymentProcessorUserId' | 'isAdmin'
  >[];
  totalPages: number;
};

const getPaginatorArgsSchema = z.object({
  skipPages: z.number(),
  filter: z.object({
    emailContains: z.string().nonempty().optional(),
    isAdmin: z.boolean().optional(),
    subscriptionStatusIn: z.array(z.nativeEnum(SubscriptionStatus).nullable()).optional(),
  }),
});

type GetPaginatedUsersInput = z.infer<typeof getPaginatorArgsSchema>;

export const getPaginatedUsers: GetPaginatedUsers<GetPaginatedUsersInput, GetPaginatedUsersOutput> = async (
  rawArgs,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users are allowed to perform this operation');
  }

  if (!context.user.isAdmin) {
    throw new HttpError(403, 'Only admins are allowed to perform this operation');
  }

  const {
    skipPages,
    filter: { subscriptionStatusIn: subscriptionStatus, emailContains, isAdmin },
  } = ensureArgsSchemaOrThrowHttpError(getPaginatorArgsSchema, rawArgs);

  const includeUnsubscribedUsers = !!subscriptionStatus?.some((status) => status === null);
  const desiredSubscriptionStatuses = subscriptionStatus?.filter((status) => status !== null);

  const pageSize = 10;

  const userPageQuery: Prisma.UserFindManyArgs = {
    skip: skipPages * pageSize,
    take: pageSize,
    where: {
      AND: [
        {
          email: {
            contains: emailContains,
            mode: 'insensitive',
          },
          isAdmin,
        },
        {
          OR: [
            {
              subscriptionStatus: {
                in: desiredSubscriptionStatuses,
              },
            },
            {
              subscriptionStatus: includeUnsubscribedUsers ? null : undefined,
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      username: true,
      isAdmin: true,
      subscriptionStatus: true,
      paymentProcessorUserId: true,
    },
    orderBy: {
      username: 'asc',
    },
  };

  const [pageOfUsers, totalUsers] = await prisma.$transaction([
    context.entities.User.findMany(userPageQuery),
    context.entities.User.count({ where: userPageQuery.where }),
  ]);
  const totalPages = Math.ceil(totalUsers / pageSize);

  return {
    users: pageOfUsers,
    totalPages,
  };
};

const updateUserSettingsSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
  avatarUrl: z.string().optional(),
  about: z.string().optional(),
  topics: z.array(z.string()).optional(),
  defaultTimer: z.number().optional(),
  routine: z.any().optional(),
});

type UpdateUserSettingsInput = z.infer<typeof updateUserSettingsSchema>;

export const updateUserSettings: UpdateUserSettings<UpdateUserSettingsInput, User> = async (
  rawArgs,
  context
) => {
  if (!context.user) {
    throw new HttpError(401, 'Only authenticated users are allowed to perform this operation');
  }

  const { firstName, lastName, name, picture, avatarUrl, about, topics, defaultTimer, routine } = ensureArgsSchemaOrThrowHttpError(updateUserSettingsSchema, rawArgs);

  let finalAvatarUrl = avatarUrl;
  if (avatarUrl?.startsWith('s3-file-id:')) {
    const fileId = avatarUrl.split(':')[1];
    const file = await context.entities.File.findUnique({
      where: { id: fileId },
    });
    if (file) {
      // We store the key. In the frontend, we'll need to resolve it if it's not a full URL.
      finalAvatarUrl = file.key;
    }
  }

  return context.entities.User.update({
    where: { id: context.user.id },
    data: {
      firstName,
      lastName,
      name,
      picture,
      avatarUrl: finalAvatarUrl,
      about,
      topics,
      defaultTimer,
      routine,
    },
  });
};
