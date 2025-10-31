/*
  Warnings:

  - You are about to drop the `Episode` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Season` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TVSeries` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Episode" DROP CONSTRAINT "Episode_seasonId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Season" DROP CONSTRAINT "Season_seriesId_fkey";

-- DropTable
DROP TABLE "public"."Episode";

-- DropTable
DROP TABLE "public"."Season";

-- DropTable
DROP TABLE "public"."TVSeries";

-- CreateTable
CREATE TABLE "Videos" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "duration" INTEGER,
    "file_size" TEXT DEFAULT '',
    "thumbnail" TEXT,
    "link" TEXT,
    "message_id" INTEGER,
    "chat_id" TEXT NOT NULL,
    "telegram_link" TEXT,
    "mime_type" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "tmdb_id" INTEGER,

    CONSTRAINT "Videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Videos_file_id_key" ON "Videos"("file_id");
