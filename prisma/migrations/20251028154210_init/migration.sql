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
