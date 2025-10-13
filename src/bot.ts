import { Context, Telegraf } from 'telegraf';
import type { Update } from 'telegraf/types';
import dotenv from "dotenv";
import type { Video } from './types.js';
import { prisma } from './prisma.js';



dotenv.config();

export const bot: Telegraf<Context<Update>> = new Telegraf(process.env.BOT_TOKEN as string);

const channel_Id = -1003106470314;


bot.start(async (ctx) => {
  const payload = ctx.startPayload;
  const userId = ctx.from.id;

  if (!payload) {
    return ctx.reply("Welcome! Please select a movie from our website.");
  }
  const messageId = parseInt(payload, 10);

  try {
    await ctx.telegram.forwardMessage(userId, channel_Id, messageId);
    ctx.reply("Movie sent! Enjoy.");
  } catch (err) {
    console.error(err);
    ctx.reply("Failed to forward movie.");
  }
});

bot.on("channel_post", async (ctx) => {
  try {
    if (ctx.channelPost && "video" in ctx.channelPost && ctx.channelPost.video) {
      const video = ctx.channelPost.video;
      const file_id = video.file_id;
      const thumbnail = video.thumbnail?.file_id || null;
      const file_name = video.file_name as string;
      const message_id = ctx.channelPost.message_id;
      const duration = video.duration;
      const file_size = video.file_size ?? null;
      const mime_type = video.mime_type || "";
      const width = video.width;
      const height = video.height;
      const chat_id = String(ctx.channelPost.chat.id) ;

      let VidObj: Video = {
        file_id,
        file_name,
        message_id,
        chat_id,
        duration,
        file_size,
        telegram_link: `https://t.me/blake_videobot?start=${message_id}`,
        height,
        mime_type,
        width
      };
      await prisma.videos.create({
        data : {
        file_id,
          file_name,
          message_id,
          chat_id,
          duration,
          file_size,
          telegram_link: `https://t.me/blake_videobot?start=${message_id}`,
          height,
          mime_type,
          width,
          thumbnail,
        }
      });
      console.log(`Channel video saved: ${file_name}`);
    }
  } catch (error) {
    console.log(error);
  }
});

bot.help((ctx) => {
  ctx.reply('Send /start to receive a greeting');
});

export default bot;