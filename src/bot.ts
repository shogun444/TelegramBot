import { Context, Telegraf } from 'telegraf';
import type { Update } from 'telegraf/types';
import dotenv from "dotenv";
import type { Video } from './types.js';
import { prisma } from './prisma.js';
import axios from 'axios';



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
  const cleanTitle = file_name.replace(/\.(mkv|mp4|avi)$/i, "")
    // Remove leading junk (e.g., savefilm21_info_, _𝐓𝐆_:_@)
    .replace(/^.*?[_:]+/, "")
    // Replace _ and . with space
    .replace(/[_\.]+/g, " ")
    // Remove everything after year (first 4-digit number in 1900-2099 range)
    .replace(/\b(19|20)\d{2}\b.*$/, "")
    // Remove left-over tags (resolution, codecs, etc.)
    .replace(/\b(720p|1080p|2160p|480p|360p|ZEE5|WEB ?DL|WEB ?Rip|BluRay|DS4K|x264|x265|H\.?265|HEVC|AAC2?\.?0?|DDP\S*|ESub|Tagalog|Hindi|Telugu|AAC|H264|H265|Archie|AMZN|BONE|J0NA|HDRip|10Bit|HC)\b/gi, "")
    // Clean up extra spaces
    .replace(/\s+/g, " ")
    .trim();


        console.log(cleanTitle)
         const apiKey = process.env.TMDB_API_KEY;
      const tmdbResp = await axios.get(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`);
      const tmdbData = await tmdbResp.data;
      console.log(tmdbData)
      const tmdb_id = tmdbData.results?.[0]?.id || null;


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
          tmdb_id
        }
      });
      console.log(`Channel video saved: ${file_name} TMDBID${tmdb_id}`);
    }
      else if ("document" in ctx.channelPost && ctx.channelPost.document) {
        const doc = ctx.channelPost.document;
        const file_id = doc.file_id;
        const thumbnail = doc.thumbnail?.file_id || null;
        const file_name = doc.file_name || "";
        const message_id = ctx.channelPost.message_id;
        const duration = null; // Documents have no duration
        const file_size = doc.file_size ?? null;
        const mime_type = doc.mime_type || "";
        const width = null;
        const height = null;
        const chat_id = String(ctx.channelPost.chat.id);

         const cleanTitle = file_name
        .replace(/\[[^\]]*\]/g, "")    // remove [groups]
        .replace(/\([^\)]*\)/g, "")    // remove (year) or other
        .replace(/\d{3,4}p/gi, "")     // remove 720p, 1080p, etc
        .replace(/\b(x264|x265|BluRay|WEBRip|HEVC|AAC|DDP\S*)\b/gi, "")
        .replace(/[^a-zA-Z0-9 ]/g, " ") // remove special chars
        .replace(/\s+/g, " ")
        .trim();

         const apiKey = process.env.TMDB_API_KEY;
      const tmdbResp = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`
      );
      const tmdbData = await tmdbResp.json();
      const tmdb_id = tmdbData.results?.[0]?.id || null;

        await prisma.videos.create({
          data: {
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
            tmdb_id
          },
        });
        console.log(`Channel document saved: ${file_name}`);
      }

  } catch (error) {
    console.log(error);
  }
});

bot.help((ctx) => {
  ctx.reply('Send /start to receive a greeting');
});

export default bot;