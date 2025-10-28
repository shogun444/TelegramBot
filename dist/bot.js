import { Context, Telegraf } from 'telegraf';
import dotenv from "dotenv";
import { prisma } from './prisma.js';
import axios from 'axios';
import stringSimilarity from 'string-similarity';
dotenv.config();
export const bot = new Telegraf(process.env.BOT_TOKEN);
const channel_Id = -1003106470314;
bot.start(async (ctx) => {
    const payload = ctx.startPayload;
    const userId = ctx.from.id;
    if (!payload) {
        return ctx.reply("Welcome! Please select a movie from our website.");
    }
    const messageId = parseInt(payload, 10);
    try {
        await ctx.telegram.copyMessage(userId, channel_Id, messageId);
        ctx.reply("Movie sent! Enjoy.");
    }
    catch (err) {
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
            const file_name = video.file_name;
            const message_id = ctx.channelPost.message_id;
            const duration = video.duration;
            const file_size = video.file_size ?? null;
            const mime_type = video.mime_type || "";
            const width = video.width;
            const height = video.height;
            const chat_id = String(ctx.channelPost.chat.id);
            const cleanTitle = file_name
                // Remove file extension
                .replace(/\.(mkv|mp4|avi)$/i, "")
                // Replace dots and underscores with spaces
                .replace(/[_\.]+/g, " ")
                // Remove common junk tags (quality, codecs, sites, etc.)
                .replace(/\b(720p|1080p|2160p|480p|WEB\s?DL|WEB\s?Rip|BluRay|x264|x265|H\.?265|HEVC|AAC2?\.?0?|DDP\S*|ESubs?|Tagalog|Hindi|Telugu|AMZN|HDRip|10Bit|HC|DS4K|Pahe|in|GTM|MULTI|Removed|World)\b/gi, "")
                // Remove all numbers (even years, episode numbers, etc.)
                .replace(/\b\d+\b/g, "")
                // Remove brackets, dashes, leftover punctuation
                .replace(/[\(\)\[\]\-]/g, " ")
                // Clean up extra spaces
                .replace(/\s+/g, " ")
                .trim();
            const yearMatch = file_name.match(/\b(19|20)\d{2}\b/);
            const year = yearMatch ? yearMatch[0] : null;
            console.log(`Clean Title: "${cleanTitle}" | Year: ${year || "N/A"}`);
            const apiKey = process.env.TMDB_API_KEY;
            const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}${year ? `&year=${year}` : ""}`;
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
            const file_size = doc.file_size ?? null;
            const mime_type = doc.mime_type || "";
            const width = null;
            const height = null;
            const chat_id = String(ctx.channelPost.chat.id);
            const cleanTitle = file_name
                // Remove file extension
                .replace(/\.(mkv|mp4|avi)$/i, "")
                // Replace dots and underscores with spaces
                .replace(/[_\.]+/g, " ")
                // Remove common junk tags (quality, codecs, sites, etc.)
                .replace(/\b(720p|1080p|2160p|480p|WEB\s?DL|WEB\s?Rip|BluRay|x264|x265|H\.?265|HEVC|AAC2?\.?0?|DDP\S*|ESubs?|Tagalog|Hindi|Telugu|AMZN|HDRip|10Bit|HC|DS4K|Pahe|in|GTM|MULTI|Removed|World)\b/gi, "")
                // Remove all numbers (even years, episode numbers, etc.)
                .replace(/\b\d+\b/g, "")
                // Remove brackets, dashes, leftover punctuation
                .replace(/[\(\)\[\]\-]/g, " ")
                // Clean up extra spaces
                .replace(/\s+/g, " ")
                .trim();
            const yearMatch = file_name.match(/\b(19|20)\d{2}\b/);
            const year = yearMatch ? yearMatch[0] : null;
            console.log(`Clean Title: "${cleanTitle}" | Year: ${year || "N/A"}`);
            const apiKey = process.env.TMDB_API_KEY;
            const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}${year ? `&year=${year}` : ""}`;
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
bot.help((ctx) => {
    ctx.reply('Send /start to receive a greeting');
});
export default bot;
//# sourceMappingURL=bot.js.map