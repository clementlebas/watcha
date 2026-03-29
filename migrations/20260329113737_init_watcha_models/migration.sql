-- AlterTable
ALTER TABLE "User" ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "defaultTimer" TEXT,
ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT,
ADD COLUMN     "picture" TEXT,
ADD COLUMN     "routine" JSONB,
ADD COLUMN     "tagsList" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "topics" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "PostNote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT,
    "date" TEXT,
    "elapsedTime" TEXT,
    "elapsedTimeInSecond" INTEGER,
    "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color" TEXT,
    "isBookmark" BOOLEAN NOT NULL DEFAULT false,
    "urlImage" TEXT,

    CONSTRAINT "PostNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostArticle" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "holderId" TEXT NOT NULL,
    "title" TEXT,
    "publishedAt" TEXT,
    "urlImage" TEXT,
    "source" TEXT,
    "url" TEXT,
    "urlFavicon" TEXT,
    "topic" TEXT,

    CONSTRAINT "PostArticle_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PostNote" ADD CONSTRAINT "PostNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostArticle" ADD CONSTRAINT "PostArticle_holderId_fkey" FOREIGN KEY ("holderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
