-- CreateTable
CREATE TABLE "Videos" (
    "id" SERIAL NOT NULL,
    "file_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "file_size" INTEGER DEFAULT 0,
    "thumbnail" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "message_id" INTEGER NOT NULL,
    "chat_id" INTEGER NOT NULL,
    "telegram_link" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER NOT NULL,

    CONSTRAINT "Videos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Videos_file_id_key" ON "Videos"("file_id");
