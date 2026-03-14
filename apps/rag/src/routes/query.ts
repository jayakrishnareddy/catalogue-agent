import { Router, type Request, type Response } from "express";
import { answerInventoryQuery } from "../services/rag.js";

export const queryRouter = Router();

queryRouter.post("/api/query", async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as { query?: string };
    const query = typeof body?.query === "string" ? body.query.trim() : "";

    if (!query) {
      res.status(400).json({
        error: "Missing or invalid body",
        expected: { query: "string" },
      });
      return;
    }

    const result = await answerInventoryQuery(query);
    res.json(result);
  } catch (err) {
    console.error("RAG query error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});
