import express from "express";
import dotenv from "dotenv";
import bot from "./bot.js";

import cors from 'cors'
import { prismaMovies } from "./prisma.js";
import { seriesPrisma } from "./Prismaseries.js";

dotenv.config();


const app = express();

app.use(cors({origin : "http://localhost:3000"}))

app.get('/', (req, res) => {
  res.status(200).json({ msg: "HealthCheck : Good" });
});

app.get('/allvideos',async (req, res) => {
  try {
    const data = await prismaMovies.videos.findMany({})
    res.status(200).json({ msg: "All videos", data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});

app.get('/allseries',async (req, res) => {
  try {
    const data = await seriesPrisma.tVSeries.findMany({})
    res.status(200).json({ msg: "All Series", data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});
app.get('/allseasons',async (req, res) => {
  try {
    const data = await seriesPrisma.season.findMany({})
    res.status(200).json({ msg: "All seasons", data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});
app.get('/allepisode',async (req, res) => {
  try {
    const data = await seriesPrisma.episode.findMany({})
    res.status(200).json({ msg: "All Episode", data });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
});
(async () => {
  try {
    await bot.launch();
    console.log("🚀 Telegram bot launched successfully!");
  } catch (err) {
    console.error("❌ Failed to launch bot:", err);
  }
})();

app.listen(3001, () => {
  console.log('Express server running on port 3001');
});