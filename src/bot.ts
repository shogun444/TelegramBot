import { Context, Telegraf } from "telegraf";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import type { Update } from "telegraf/types";
import dotenv from "dotenv";
import type { Video } from "./types.js";
import { prisma } from "./prisma.js";
import axios from "axios";
import stringSimilarity from "string-similarity";

dotenv.config();

// Initialize bot
export const bot: Telegraf<Context<Update>> = new Telegraf(process.env.BOT_TOKEN as string);

// Telegram user client (for >2GB)
const apiId = Number(process.env.api_id);
const apiHash = process.env.api_hash as string;
const stringSession = new StringSession(process.env.STRING_SESSION as string);
const channel_Id = -1003106470314;

// Create a Telegram user client instance (persistent)
const userClient = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

// Connect once at startup
(async () => {
  await userClient.connect();
  console.log("✅ User client connected successfully (MTProto ready).");
})();

// ⚡ Send via user account (>2 GB)
async function sendLargeVideo(toUser: number, video: any) {
  const movieTitle = video.file_name.replace(/\.[^/.]+$/, ""); // clean title

  await userClient.invoke(
    new Api.messages.SendMedia({
      peer: toUser,
      media: new Api.InputMediaDocument({
        id: new Api.InputDocument({
          id: video.file_id, // stored in DB
          accessHash: video.access_hash,
          fileReference: Buffer.from(video.file_reference, "base64"),
        }),
      }),
      message: movieTitle,
    })
  );

  console.log(`✅ Sent large movie "${movieTitle}" to ${toUser}`);
}

// ⚡ Bot logic
bot.start(async (ctx) => {
  const payload = ctx.startPayload;
  const userId = ctx.from.id;

  if (!payload) {
    return ctx.reply("🎬 Welcome! Please select a movie from our website.");
  }

  const messageId = parseInt(payload, 10);
  const video = await prisma.videos.findFirst({ where: { message_id: messageId } });

  if (!video) return ctx.reply("⚠️ Movie not found.");

  try {
    const size = Number(video.file_size || 0);
    const movieTitle = video.file_name.replace(/\.[^/.]+$/, "");

    if (size > 2000 * 1024 * 1024) {
      // >2GB => user account
      await sendLargeVideo(userId, video);
      return ctx.reply("🎥 Sent via user client (file > 2GB)");
    } else {
      // <=2GB => bot directly
      await ctx.telegram.sendVideo(userId, video.file_id, {
        caption: movieTitle,
        supports_streaming: true,
      });
      return ctx.reply("🎬 Movie sent!");
    }
  } catch (err) {
    console.error("❌ Failed to send:", err);
    ctx.reply("⚠️ Failed to send movie.");
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
      const file_size = video.file_size != null ? String(video.file_size) : null;
      const mime_type = video.mime_type || "";
      const width = video.width;
      const height = video.height;
      const chat_id = String(ctx.channelPost.chat.id) ;
const cleanTitle = file_name
  // Remove file extension
  .replace(/\.(mkv|mp4|avi|mov|wmv|flv|m4v|mpg|mpeg)$/i, "")
  // Replace dots and underscores with spaces
  .replace(/[_\.]+/g, " ")
  // Remove everything after a year or junk tag (very strict cutoff)
  .replace(
    /\b((19|20)\d{2}|720p|1080p|2160p|480p|4k|8k|hdr10\+?|hdr|dv|dolby|vision|dts|truehd|atmos|web\s?dl|web\s?rip|webrip|bluray|brrip|hdrip|x264|x265|hevc|h\.?265|avc|aac2?\.?0?|ddp\S*|esubs?|dual\s?audio|tagalog|hindi|telugu|tamil|malayalam|korean|japanese|amzn|nf|psa|aeencodes|yts|hq|hc|ds4k|pahe|rarbg|extended|remastered|multi|proper|repack|imax|org|world|uncut|internal|regraded|10bit|xvid|h264|plus|\+|\d+)\b.*$/gi,
    ""
  )
  // Remove brackets, dashes, and leftover punctuation
  .replace(/[\(\)\[\]\-]/g, " ")
  // Remove trailing symbols
  .replace(/[+\-_.!@#\$%^&*(),?\/\\]+$/g, "")
  // Remove multiple spaces
  .replace(/\s+/g, " ")
  .trim();



       const yearMatch = file_name.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : null;


        
    console.log(`Clean Title: "${cleanTitle}" | Year: ${year || "N/A"}`);
         const apiKey = process.env.TMDB_API_KEY;
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`;

    const tmdbResp = await axios.get(tmdbUrl);
    const results = tmdbResp.data.results || [];

    let tmdb_id: number | null = null;

 if (results.length > 0) {
      const bestMatch = stringSimilarity.findBestMatch(
        cleanTitle.toLowerCase(),
        results.map((r: any) => r.title.toLowerCase())
      );
      tmdb_id = results[bestMatch.bestMatchIndex]?.id || null;
    }

    console.log(`🎬 Matched TMDB ID for "${cleanTitle}": ${tmdb_id || "❌ Not found"}`);

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
        const file_size = doc.file_size != null ? String(doc.file_size) : null;
        const mime_type = doc.mime_type || "";
        const width = null;
        const height = null;
        const chat_id = String(ctx.channelPost.chat.id);

     
  

  const cleanTitle = file_name
  // Remove file extension
  .replace(/\.(mkv|mp4|avi|mov|wmv|flv|m4v|mpg|mpeg)$/i, "")
  // Replace dots and underscores with spaces
  .replace(/[_\.]+/g, " ")
  // Remove everything after a year or junk tag (very strict cutoff)
  .replace(
    /\b((19|20)\d{2}|720p|1080p|2160p|480p|4k|8k|hdr10\+?|hdr|dv|dolby|vision|dts|truehd|atmos|web\s?dl|web\s?rip|webrip|bluray|brrip|hdrip|x264|x265|hevc|h\.?265|avc|aac2?\.?0?|ddp\S*|esubs?|dual\s?audio|tagalog|hindi|telugu|tamil|malayalam|korean|japanese|amzn|nf|psa|aeencodes|yts|hq|hc|ds4k|pahe|rarbg|extended|remastered|multi|proper|repack|imax|org|world|uncut|internal|regraded|10bit|xvid|h264|plus|\+|\d+)\b.*$/gi,
    ""
  )
  // Remove brackets, dashes, and leftover punctuation
  .replace(/[\(\)\[\]\-]/g, " ")
  // Remove trailing symbols
  .replace(/[+\-_.!@#\$%^&*(),?\/\\]+$/g, "")
  // Remove multiple spaces
  .replace(/\s+/g, " ")
  .trim();


       const yearMatch = file_name.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : null;


        
    console.log(`Clean Title: "${cleanTitle}" | Year: ${year || "N/A"}`);
         const apiKey = process.env.TMDB_API_KEY;
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`;

    const tmdbResp = await axios.get(tmdbUrl);
    const results = tmdbResp.data.results || [];

    let tmdb_id: number | null = null;

 if (results.length > 0) {
      const bestMatch = stringSimilarity.findBestMatch(
        cleanTitle.toLowerCase(),
        results.map((r: any) => r.title.toLowerCase())
      );
      tmdb_id = results[bestMatch.bestMatchIndex]?.id || null;
    }

    console.log(`🎬 Matched TMDB ID for "${cleanTitle}": ${tmdb_id || "❌ Not found"}`);


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


bot.help((ctx) => ctx.reply("Send /start to receive a movie 🎥"));

export default bot;
