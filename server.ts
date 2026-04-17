import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Voice Verification Logic
  app.post("/api/verify-voice", (req, res) => {
    const { recordedMFCC, storedMFCC } = req.body;

    if (!recordedMFCC || !storedMFCC) {
      return res.status(400).json({ error: "Missing MFCC data" });
    }

    // Cosine Similarity implementation
    const dotProduct = (a: number[], b: number[]) => a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitude = (arr: number[]) => Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));

    const sim = dotProduct(recordedMFCC, storedMFCC) / (magnitude(recordedMFCC) * magnitude(storedMFCC));
    
    // The user requested 0.95 threshold
    const isMatch = sim >= 0.95;

    res.json({ isMatch, similarity: sim });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
