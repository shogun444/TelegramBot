import express from "express";
import dotenv from "dotenv";
import bot from "./bot.js";
import { prisma } from "./prisma.js";
import axios, { type AxiosResponse } from "axios";
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
    console.log("Bot started!");
  } catch (err) {
    const hasDescription = typeof err === "object" && err !== null && "description" in err;
    const hasErrorCode = typeof err === "object" && err !== null && "error_code" in err;
    const description = hasDescription ? (err as any).description : "";
    const error_code = hasErrorCode ? (err as any).error_code : undefined;

    if (
      description.includes("Conflict: terminated by other getUpdates request") ||
      error_code === 409
    ) {
      console.error(" Another instance is running. Exiting gracefully.");
      process.exit(0);
    } else {
      console.error("Bot crashed:", err);
      process.exit(1);
    }
  }
})();
app.listen(3001, () => {
  console.log('Express server running on port 3001');
});
