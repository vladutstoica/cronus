// OLLAMA VERIFICATION SCRIPT FOR CRONUS
// Paste this into DevTools console to check Ollama integration

async function checkOllama() {
  console.log("🤖 Checking Ollama Integration...\n");

  // 1. Check settings
  console.log("1️⃣ Checking AI Settings...");
  try {
    const settings = await window.electron.ipcRenderer.invoke(
      "local:get-all-settings",
    );
    const aiEnabled = settings.ai_enabled === "true";
    const categorizationEnabled = settings.categorization_enabled === "true";
    const ollamaModel = settings.ollama_model || "llama3.2";

    console.log(`   🧠 AI Enabled: ${aiEnabled ? "✅ YES" : "❌ NO"}`);
    console.log(
      `   🏷️  Categorization Enabled: ${categorizationEnabled ? "✅ YES" : "❌ NO"}`,
    );
    console.log(`   🤖 Ollama Model: ${ollamaModel}`);

    if (!aiEnabled) {
      console.log("   ⚠️  AI is DISABLED. Enable it in Settings or run:");
      console.log(
        '      await window.electron.ipcRenderer.invoke("local:set-setting", "ai_enabled", "true")',
      );
    }

    if (!categorizationEnabled) {
      console.log("   ⚠️  Categorization is DISABLED. Enable it with:");
      console.log(
        '      await window.electron.ipcRenderer.invoke("local:set-setting", "categorization_enabled", "true")',
      );
    }
  } catch (error) {
    console.log(`   ❌ Error checking settings: ${error.message}`);
  }

  // 2. Check Ollama availability
  console.log("\n2️⃣ Checking Ollama Connection...");
  try {
    const models = await window.electron.ipcRenderer.invoke(
      "local:list-ollama-models",
    );
    console.log(`   ✅ Ollama is running!`);
    console.log(`   📦 Available models: ${models.length}`);
    models.forEach((model) => {
      console.log(`      - ${model}`);
    });

    // Check if the configured model is available
    const settings = await window.electron.ipcRenderer.invoke(
      "local:get-all-settings",
    );
    const configuredModel = settings.ollama_model || "llama3.2";

    const exactMatch = models.find((m) => m === configuredModel);
    const partialMatch = models.find((m) => m.startsWith(configuredModel));

    if (exactMatch) {
      console.log(`   ✅ Configured model "${configuredModel}" is available!`);
    } else if (partialMatch) {
      console.log(
        `   ⚠️  Configured model "${configuredModel}" not found exactly`,
      );
      console.log(`   💡 Found similar model: "${partialMatch}"`);
      console.log(`   💡 Update setting to match:`);
      console.log(
        `      await window.electron.ipcRenderer.invoke("local:set-setting", "ollama_model", "${partialMatch}")`,
      );
    } else {
      console.log(`   ❌ Configured model "${configuredModel}" not found!`);
      console.log(`   💡 Available models: ${models.join(", ")}`);
    }
  } catch (error) {
    console.log(`   ❌ Ollama is NOT running or not accessible`);
    console.log(`   💡 Make sure Ollama is running: ollama serve`);
    console.log(`   Error: ${error.message}`);
  }

  // 3. Check recent categorizations
  console.log("\n3️⃣ Checking Recent Categorizations...");
  try {
    const events = await window.electron.ipcRenderer.invoke(
      "local:get-events",
      20,
      0,
    );
    const categorizedEvents = events.filter((e) => e.categoryId);
    const withReasoning = events.filter((e) => e.categoryReasoning);
    const withAISummary = events.filter((e) => e.llmSummary);

    console.log(`   📊 Total recent events: ${events.length}`);
    console.log(
      `   ✅ Categorized: ${categorizedEvents.length}/${events.length}`,
    );
    console.log(
      `   🤖 With AI reasoning: ${withReasoning.length}/${events.length}`,
    );
    console.log(
      `   📝 With AI summary: ${withAISummary.length}/${events.length}`,
    );

    if (withAISummary.length > 0) {
      console.log("\n   ✅ AI categorization is WORKING! Recent example:");
      const example = events.find((e) => e.llmSummary);
      console.log(`      App: ${example.ownerName}`);
      console.log(`      Category: ${example.categoryId}`);
      console.log(`      Reasoning: ${example.categoryReasoning}`);
      console.log(`      AI Summary: ${example.llmSummary}`);
    } else if (categorizedEvents.length > 0) {
      console.log("\n   ⚠️  Events are categorized but without AI summaries");
      console.log(
        "      This means rule-based categorization is working, but AI may not be used yet",
      );
    } else {
      console.log(
        "\n   ℹ️  No categorized events yet. Keep using the app to generate events.",
      );
    }
  } catch (error) {
    console.log(`   ❌ Error checking events: ${error.message}`);
  }

  console.log("\n✅ Ollama Check Complete!\n");

  // Summary
  const settings = await window.electron.ipcRenderer.invoke(
    "local:get-all-settings",
  );
  const aiEnabled = settings.ai_enabled === "true";

  if (aiEnabled) {
    console.log(
      "💡 Summary: AI is enabled. New events should be categorized using Ollama.",
    );
    console.log(
      "💡 Monitor main process logs (terminal) to see Ollama categorization in action.",
    );
  } else {
    console.log(
      "⚠️  Summary: AI is DISABLED. Enable it in Settings to use Ollama.",
    );
  }
}

// Run check
checkOllama();
