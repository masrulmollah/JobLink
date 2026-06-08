import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Initialize the shared Gemini client on the server
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Server-side parsing endpoint
app.post("/api/parse-job", async (req, res) => {
  try {
    const { url, pastedText } = req.body;

    if (!url) {
      res.status(400).json({ error: "Job URL is required." });
      return;
    }

    let textToAnalyze = pastedText || "";

    // If no text is pasted, try to fetch it from the URL
    if (!textToAnalyze) {
      try {
        console.log(`Attempting to scrape job URL: ${url}`);
        // Add a mock User-Agent to avoid immediate block, though full scrapers can get blocked
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          },
        });
        
        if (response.ok) {
          const html = await response.text();
          // Simple stripping of common script and style tags to save tokens
          let cleanHtml = html
            .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
            .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
          
          textToAnalyze = cleanHtml.substring(0, 15000); // Guard token length
        } else {
          console.warn(`Scrape failed with status ${response.status}. Falling back to manual copy-paste advice.`);
        }
      } catch (scrapeErr) {
        console.warn("Automated link scrape failed. Requires manual copy-paste fallback.", scrapeErr);
      }
    }

    if (!textToAnalyze) {
      res.status(400).json({
        error: "NEED_PASTED_TEXT",
        message: "We couldn't scrape LinkedIn directly due to login/cookie walls. Please select and copy-paste the job description text below.",
      });
      return;
    }

    // Call the Gemini API server-side
    console.log("Calling Gemini API with structured prompt...");
    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Please parse and dissect the following job post data. Extract these key details:
- Company Name
- Role Name (e.g. CFO, Finance Manager, Production Manager)
- Date Posted (relative or absolute, e.g. "Posted 2 days ago")
- Salary Details (specified range, compensation or e.g., "Not specified")
- Key qualifications and skill requirements (clearly formatted as bulleted lists/text)

Source document:
${textToAnalyze}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING, description: "Name of the company offering the job" },
            roleName: { type: Type.STRING, description: "The exact job title or position" },
            datePosted: { type: Type.STRING, description: "When the job was published/posted (e.g., '3 days ago')" },
            salary: { type: Type.STRING, description: "Salary listed, or 'Not specified' if missing" },
            qualifications: { type: Type.STRING, description: "Formatted bullet points or block of main skills and qualifications" },
          },
          required: ["companyName", "roleName", "datePosted", "salary", "qualifications"],
        },
        systemInstruction: "You are a professional recruiting analyzer. Your task is to accurately extract job attributes into a clean, parsed structured schema.",
      },
    });

    const parsedText = geminiResponse.text;
    if (!parsedText) {
      res.status(500).json({ error: "Gemini did not return any analyzed text summaries." });
      return;
    }

    const jobSummary = JSON.parse(parsedText.trim());
    res.json(jobSummary);
  } catch (error: any) {
    console.error("Endpoint processing error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred." });
  }
});

// Configure Vite integration for development vs production
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode serving static dist files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully operative on http://localhost:${PORT}`);
  });
}

setupVite().catch((error) => {
  console.error("Vite middleware setup failed:", error);
});
