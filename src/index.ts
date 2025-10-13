import express from "express";


import dotenv from "dotenv";
import bot from "./bot.js";
import { prisma } from "./prisma.js";


dotenv.config();

const app = express();


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

bot.launch();
app.listen(3000, () => {
  console.log('Express server running on port 3000');
});
