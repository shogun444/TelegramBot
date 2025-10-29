import { Context, Telegraf } from "telegraf";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import dotenv from "dotenv";
import axios, { AxiosError } from "axios";
import stringSimilarity from "string-similarity";
import https from "https";
import { seriesPrisma } from "./Prismaseries.js";
import { prismaMovies } from "./prisma.js";
import { getEpisodeDetails, getTvTmdbResultsWithRetry } from "./gettmdbseries.js";
dotenv.config();
// Initialize bot
export const bot = new Telegraf(process.env.BOT_TOKEN);
// Telegram user client (for >2GB)
const apiId = Number(process.env.api_id);
const apiHash = process.env.api_hash;
const stringSession = new StringSession(process.env.STRING_SESSION);
const MOVIE_CHANNEL_ID = -1003106470314;
const SERIES_CHANNEL_ID = -1003111405410;
// Create a Telegram user client instance (persistent)
const userClient = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
// Connect once at startup
(async () => {
    await userClient.connect();
    console.log("✅ User client connected successfully (MTProto ready).");
})();
// ⚡ Send via user account (>2 GB)
async function sendLargeVideo(toUser, video) {
    const movieTitle = video.file_name.replace(/\.[^/.]+$/, ""); // clean title
    await userClient.invoke(new Api.messages.SendMedia({
        peer: toUser,
        media: new Api.InputMediaDocument({
            id: new Api.InputDocument({
                id: video.file_id, // stored in DB
                accessHash: video.access_hash,
                fileReference: Buffer.from(video.file_reference, "base64"),
            }),
        }),
        message: movieTitle,
    }));
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
    const video = await prismaMovies.videos.findFirst({ where: { message_id: messageId } });
    if (!video)
        return ctx.reply("⚠️ Movie not found.");
    try {
        const size = Number(video.file_size || 0);
        const movieTitle = video.file_name.replace(/\.[^/.]+$/, "");
        if (size > 2000 * 1024 * 1024) {
            // >2GB => user account
            await sendLargeVideo(userId, video);
            return ctx.reply("🎥 Sent via user client (file > 2GB)");
        }
        else {
            // <=2GB => bot directly
            await ctx.telegram.sendVideo(userId, video.file_id, {
                caption: movieTitle,
                supports_streaming: true,
            });
            return ctx.reply("🎬 Movie sent!");
        }
    }
    catch (err) {
        console.error("❌ Failed to send:", err);
        ctx.reply("⚠️ Failed to send movie.");
    }
});
async function getTmdbIdWithRetry(cleanTitle) {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        throw new Error("TMDB_API_KEY is not set in environment variables.");
    }
    const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(cleanTitle)}`;
    const maxAttempts = 3;
    const delayMs = 1000;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const response = await axios.get(tmdbUrl, {
                timeout: 5000,
                httpsAgent: new https.Agent({ keepAlive: false }),
            });
            const results = response.data.results || [];
            return results.length > 0 ? results[0].id : null;
        }
        catch (error) {
            const err = error;
            if (err.code === "ECONNRESET" && attempt < maxAttempts) {
                // Wait before retrying
                await new Promise((res) => setTimeout(res, delayMs));
                continue;
            }
            // Log and rethrow for non-retryable errors or final failure
            console.error(`[TMDB] Attempt ${attempt} failed:`, err.message);
            throw err;
        }
    }
    return null;
}
bot.on("channel_post", async (ctx) => {
    try {
        const chatId = ctx.channelPost.chat.id;
        if (chatId === MOVIE_CHANNEL_ID) {
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
                const tmdbId = await getTmdbIdWithRetry(cleanTitle);
                const tmdbResp = await axios.get(tmdbUrl);
                const results = tmdbResp.data.results || [];
                let tmdb_id = null;
                if (results.length > 0) {
                    const bestMatch = stringSimilarity.findBestMatch(cleanTitle.toLowerCase(), results.map((r) => r.title.toLowerCase()));
                    tmdb_id = results[bestMatch.bestMatchIndex]?.id || null || tmdbId;
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
                await prismaMovies.videos.create({
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
                await prismaMovies.videos.create({
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
        else if (chatId === SERIES_CHANNEL_ID) {
            if ("document" in ctx.channelPost && ctx.channelPost.document) {
                const doc = ctx.channelPost.document;
                const file_name = doc.file_name || "";
                const message_id = ctx.channelPost.message_id;
                const chat_id = String(ctx.channelPost.chat.id);
                const match = file_name.match(/^(.*?)[.\s_-]+S(\d{1,2})E(\d{1,2})/i);
                if (!match) {
                    console.log(`❌ Could not extract series info from ${file_name}`);
                    return;
                }
                const seriesName = match[1];
                if (!seriesName)
                    return;
                // Use your cleaning logic for cleanTitle (series name)
                const cleanTitle = seriesName
                    // Remove file extension (shouldn't be needed, but for safety)
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
                if (!match[2] || !match[3]) {
                    throw new Error("Regex match failed for season or episode number");
                }
                const seasonNumber = parseInt(match[2], 10);
                const episodeNumber = parseInt(match[3], 10);
                console.log(`Series: "${cleanTitle}" | Season: ${seasonNumber} | Episode: ${episodeNumber}`);
                const results = await getTvTmdbResultsWithRetry(cleanTitle);
                let tmdbSeriesId = null;
                let bestMatchSeries;
                if (results.length > 0) {
                    const bestMatch = stringSimilarity.findBestMatch(cleanTitle.toLowerCase(), results.map((r) => r.name.toLowerCase()));
                    tmdbSeriesId = results[bestMatch.bestMatchIndex]?.id || null;
                    bestMatchSeries = results[bestMatch.bestMatchIndex];
                }
                if (!tmdbSeriesId) {
                    console.log(`❌ No TMDB match for series "${cleanTitle}"`);
                    return;
                }
                console.log(`📺 Matched TMDB Series ID for "${cleanTitle}": ${tmdbSeriesId}`);
                const episodeData = await getEpisodeDetails(tmdbSeriesId, seasonNumber, episodeNumber);
                // --- Compose SeriesEpisode object (type-safe) ---
                const episodeObj = {
                    file_id: doc.file_id,
                    file_name,
                    message_id,
                    chat_id,
                    telegram_link: `https://t.me/blake_videobot?start=${message_id}`,
                    thumbnail: doc.thumbnail?.file_id || null,
                    file_size: doc.file_size ? String(doc.file_size) : null,
                    mime_type: doc.mime_type,
                    series_name: bestMatchSeries.name, // Use name from TMDB
                    tmdb_series_id: tmdbSeriesId,
                    season_number: seasonNumber,
                    episode_number: episodeNumber,
                    tmdbEpisodeId: episodeData.id,
                    episode_title: episodeData.name,
                    episode_overview: episodeData.overview,
                    episode_air_date: episodeData.air_date,
                    episode_still: episodeData.still_path,
                    runtime: episodeData.runtime,
                };
                const series = await seriesPrisma.tVSeries.upsert({
                    where: { tmdbId: episodeObj.tmdb_series_id },
                    update: {},
                    create: {
                        tmdbId: episodeObj.tmdb_series_id,
                        title: episodeObj.series_name,
                        overview: bestMatchSeries.overview, // Make sure `bestMatchSeries` is the full series object from TMDB
                        posterPath: bestMatchSeries.poster_path,
                    },
                });
                // Upsert Season
                const season = await seriesPrisma.season.upsert({
                    where: {
                        seriesId_seasonNumber: {
                            seriesId: series.id,
                            seasonNumber: episodeObj.season_number,
                        },
                    },
                    update: {},
                    create: {
                        seriesId: series.id,
                        seasonNumber: episodeObj.season_number,
                    },
                });
                // =================================================================
                //  FIX: Create Episode with ALL the details from episodeObj
                // =================================================================
                await seriesPrisma.episode.create({
                    data: {
                        // Link to the season
                        season: { connect: { id: season.id } },
                        episodeNumber: episodeObj.episode_number,
                        tmdbEpisodeId: episodeObj.tmdbEpisodeId,
                        // optional fields: convert undefined -> null to match Prisma types
                        telegramLink: episodeObj.telegram_link ?? null,
                        title: episodeObj.episode_title ?? null,
                        overview: episodeObj.episode_overview ?? null,
                        runtime: episodeObj.runtime ?? null,
                        stillPath: episodeObj.episode_still ?? null,
                        airDate: episodeObj.episode_air_date ? new Date(episodeObj.episode_air_date) : null,
                    },
                });
                // =================================================================
                console.log(`✅ Episode added: ${episodeObj.series_name} S${episodeObj.season_number}E${episodeObj.episode_number}`);
            }
        }
        else {
            console.log(`⚠️ Unknown channel: ${chatId}`);
        }
    }
    catch (error) {
        console.log(error);
    }
});
bot.help((ctx) => ctx.reply("Send /start to receive a movie 🎥"));
export default bot;
//# sourceMappingURL=bot.js.map