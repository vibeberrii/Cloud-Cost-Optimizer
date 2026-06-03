const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Cloud Cost Optimizer API Running");
});

app.post("/api/analyze", async (req, res) => {
  try {
    const { resources } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Missing GEMINI_API_KEY in backend/.env file",
      });
    }

    const totalCost = resources.reduce((sum, r) => sum + Number(r.cost), 0);

    const prompt = `
You are a Cloud FinOps expert.

Analyze these cloud resources:
${JSON.stringify(resources, null, 2)}

Total monthly cost is $${totalCost}.

Also consider the provider field: AWS, Azure, or GCP.

Return plain text only.
No markdown.
No ** symbols.
No backticks.
No code formatting.

Format exactly like this:

Cloud Cost Summary

Total Cost: $...
Estimated Savings: $... per month

Key Findings:
- ...
- ...

Recommendations:
- ...
- ...
- ...

Business Impact:
...
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      analysis: response.text,
    });
  } catch (error) {
    console.error("AI Error:", error);
    res.status(500).json({
      error: "AI analysis failed. Check backend terminal.",
    });
  }
});

app.listen(5000, () => {
  console.log("Server running on port 5000");
});