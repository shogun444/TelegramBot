import { Context, Telegraf } from "telegraf";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import axios from "axios";
import stringSimilarity from "string-similarity";
dotenv.config();
// Initialize bot
export const bot = new Telegraf(process.env.BOT_TOKEN);
// Telegram user client (for >2GB)
const apiId = Number(process.env.api_id);
const apiHash = process.env.api_hash;
const stringSession = new StringSession(process.env.STRING_SESSION);
const channel_Id = -1003106470314;
// Create a Telegram user client instance (persistent)
const userClient = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
// Connect once at startup
(async () => {
    await userClient.connect();
    console.log("✅ User client connected successfully (MTProto ready).");
})();
// Handles when user clicks the deep link
bot.start(async (ctx) => {
    const payload = ctx.startPayload;
    const userId = ctx.from.id;
    if (!payload) {
        return ctx.reply("👋 Welcome! Please select a movie from our website.");
    }
    const messageId = parseInt(payload, 10);
    const video = await prisma.videos.findFirst({
        where: { message_id: messageId },
    });
    if (!video)
        return ctx.reply("❌ Movie not found in database.");
    const movieTitle = video.file_name.replace(/\.[^/.]+$/, ""); // clean caption
    try {
        // Case 1: File size ≤ 2GB → send via Bot API (no forward label)
        if (Number(video.file_size) <= 2000 * 1024 * 1024) {
            await ctx.telegram.sendVideo(userId, video.file_id, {
                caption: `🎬 ${movieTitle}`,
                supports_streaming: true,
            });
            console.log(`✅ Sent via Bot API → ${movieTitle}`);
            return;
        }
        if (!video)
            return;
        if (!video.message_id)
            return;
        // Case 2: File > 2GB → send via user account
        await userClient.invoke(new Api.messages.ForwardMessages({
            fromPeer: video.chat_id,
            id: [video.message_id],
            toPeer: userId,
            dropAuthor: true, // removes "Forwarded from" label
        }));
        console.log(`🎥 Sent via user account → ${movieTitle}`);
        await ctx.reply("🎥 Sent via user client (file > 2 GB)");
    }
    catch (err) {
        console.error("❌ Failed to send:", err);
        await ctx.reply("⚠️ Could not send movie. Try again later.");
    }
});
bot.on("channel_post", async (ctx) => {
    try {
        if (ctx.channelPost && "video" in ctx.channelPost && ctx.channelPost.video) {
            const video = ctx.channelPost.video;
            const file_id = video.file_id;
            const thumbnail = video.thumbnail?.file_id || null;
            const file_name = video.file_name;
            const message_id = ctx.channelPost.message_id;
            const duration = video.duration;
            const file_size = video.file_size != null ? String(video.file_size) : null;
            const mime_type = video.mime_type || "";
            const width = video.width;
            const height = video.height;
            const chat_id = String(ctx.channelPost.chat.id);
            const cleanTitle = file_name
                // Remove file extension
                .replace(/\.(mkv|mp4|avi|mov|wmv|flv|m4v|mpg|mpeg)$/i, "")
                // Replace dots and underscores with spaces
                .replace(/[_\.]+/g, " ")
                // Remove everything after a year or junk tag (very strict cutoff)
                .replace(/\b((19|20)\d{2}|720p|1080p|2160p|480p|4k|8k|hdr10\+?|hdr|dv|dolby|vision|dts|truehd|atmos|web\s?dl|web\s?rip|webrip|bluray|brrip|hdrip|x264|x265|hevc|h\.?265|avc|aac2?\.?0?|ddp\S*|esubs?|dual\s?audio|tagalog|hindi|telugu|tamil|malayalam|korean|japanese|amzn|nf|psa|aeencodes|yts|hq|hc|ds4k|pahe|rarbg|extended|remastered|multi|proper|repack|imax|org|world|uncut|internal|regraded|10bit|xvid|h264|plus|\+|\d+)\b.*$/gi, "")
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
            let tmdb_id = null;
            if (results.length > 0) {
                const bestMatch = stringSimilarity.findBestMatch(cleanTitle.toLowerCase(), results.map((r) => r.title.toLowerCase()));
                tmdb_id = results[bestMatch.bestMatchIndex]?.id || null;
            }
            console.log(`🎬 Matched TMDB ID for "${cleanTitle}": ${tmdb_id || "❌ Not found"}`);
            let VidObj = {
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
                .replace(/\b((19|20)\d{2}|720p|1080p|2160p|480p|4k|8k|hdr10\+?|hdr|dv|dolby|vision|dts|truehd|atmos|web\s?dl|web\s?rip|webrip|bluray|brrip|hdrip|x264|x265|hevc|h\.?265|avc|aac2?\.?0?|ddp\S*|esubs?|dual\s?audio|tagalog|hindi|telugu|tamil|malayalam|korean|japanese|amzn|nf|psa|aeencodes|yts|hq|hc|ds4k|pahe|rarbg|extended|remastered|multi|proper|repack|imax|org|world|uncut|internal|regraded|10bit|xvid|h264|plus|\+|\d+)\b.*$/gi, "")
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
            let tmdb_id = null;
            if (results.length > 0) {
                const bestMatch = stringSimilarity.findBestMatch(cleanTitle.toLowerCase(), results.map((r) => r.title.toLowerCase()));
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
    }
    catch (error) {
        console.log(error);
    }
});
bot.help((ctx) => ctx.reply("Send /start to receive a movie 🎥"));
export default bot;
//# sourceMappingURL=bot.js.map