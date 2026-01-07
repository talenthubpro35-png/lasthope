import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  try {
    const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    console.log("Fetching available models...");

    // Try to list models
    const models = await gemini.listModels();

    console.log("\n✅ Available models:");
    for await (const model of models) {
      console.log(`  - ${model.name}`);
      console.log(`    Display Name: ${model.displayName}`);
      console.log(`    Supported Methods: ${model.supportedGenerationMethods?.join(", ")}`);
      console.log();
    }
  } catch (error) {
    console.error("❌ Error listing models:", error.message);

    // Try common model names
    console.log("\nTrying common model names...");
    const modelsToTry = [
      "gemini-1.5-flash",
      "gemini-1.5-pro",
      "gemini-1.0-pro",
      "models/gemini-1.5-flash",
      "models/gemini-1.5-pro",
      "models/gemini-1.0-pro",
      "gemini-flash",
      "gemini-pro-latest"
    ];

    for (const modelName of modelsToTry) {
      try {
        const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = gemini.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello");
        console.log(`✅ ${modelName} - WORKS`);
        console.log(`   Response: ${result.response.text()}`);
        break;
      } catch (err) {
        console.log(`❌ ${modelName} - Failed: ${err.message.split('\n')[0]}`);
      }
    }
  }
}

listModels();
