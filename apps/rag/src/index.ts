import "./loadEnv.js";
import cors from "cors";
import express from "express";
import { queryRouter } from "./routes/query.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(queryRouter);

const port = Number(process.env.PORT) || 4001;
app.listen(port, () => {
  console.log(`RAG API listening on http://localhost:${port}`);
});
