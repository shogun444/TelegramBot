import express from "express";
import dotenv from "dotenv";
import bot from "./bot.js";
import { prisma } from "./prisma.js";
import cors from 'cors'

dotenv.config();


const app = express();

app.use(cors({origin : "http://localhost:3000"}))

app.get('/', (req, res) => {
  res.status(200).json({ msg: "HealthCheck : Good" });
});

app.get('/allvideos',async (req, res) => {
  try {
    const data = await prisma.videos.findMany({})
    res.status(200).json({ msg: "All videos", data });
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