import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testGemini() {
  console.log("Testing Gemini API...");
  console.log("API Key configured:", process.env.GEMINI_API_KEY ? "✓" : "✗");

  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY not found in environment");
    process.exit(1);
  }

  try {
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = gemini.getGenerativeModel({ model: "gemini-pro" });

    console.log("Sending test prompt to Gemini...");
    const result = await model.generateContent("Say 'Hello, I am working!' in JSON format");
    const responseText = result.response.text();

    console.log("✅ Gemini API is working!");
    console.log("Response:", responseText);
  } catch (error) {
    console.error("❌ Gemini API test failed:", error);
    process.exit(1);
  }
}

testGemini();
