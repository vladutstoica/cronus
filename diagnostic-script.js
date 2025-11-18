// DIAGNOSTIC SCRIPT FOR CRONUS ELECTRON APP
// Paste this into the DevTools console to check system status

async function runDiagnostics() {
  console.log("🔍 Running Cronus Diagnostics...\n");

  // 1. Check permissions
  console.log("1️⃣ Checking Accessibility Permissions...");
  try {
    const permissionInfo = await window.api.requestPermission(0);
    console.log(
      `   ✅ Permissions: ${permissionInfo.missingAccessibilityPermissions ? "❌ DENIED" : "✅ GRANTED"}`,
    );
    console.log(`   📊 Active Windows: ${permissionInfo.activeWindows}`);
    console.log(`   🖥️  Main Window: ${permissionInfo.mainWindow}`);
  } catch (error) {
    console.log(`   ❌ Error checking permissions: ${error.message}`);
  }

  // 2. Check database - recent events
  console.log("\n2️⃣ Checking Recent Events in Database...");
  try {
    const events = await window.electron.ipcRenderer.invoke(
      "local:get-events",
      10,
      0,
    );
    console.log(`   📦 Total events in database (last 10): ${events.length}`);
    if (events.length > 0) {
      const latestEvent = events[0];
      console.log(
        `   📅 Latest event timestamp: ${new Date(latestEvent.timestamp).toLocaleString()}`,
      );
      console.log(`   🏷️  App: ${latestEvent.ownerName}`);
      console.log(`   📝 Title: ${latestEvent.title || "N/A"}`);
      console.log(`   🔗 URL: ${latestEvent.url || "N/A"}`);
      console.log(`   ⏱️  Duration: ${latestEvent.durationMs}ms`);
      console.log(
        `   🏷️  Category: ${latestEvent.categoryId || "Uncategorized"}`,
      );
    } else {
      console.log(
        "   ⚠️  No events found yet. Keep the app running and switch between applications.",
      );
    }
  } catch (error) {
    console.log(`   ❌ Error fetching events: ${error.message}`);
  }

  // 3. Check categories
  console.log("\n3️⃣ Checking Categories...");
  try {
    const categories = await window.electron.ipcRenderer.invoke(
      "local:get-categories",
    );
    console.log(`   📂 Total categories: ${categories.length}`);
    if (categories.length > 0) {
      console.log("   Categories:");
      categories.forEach((cat) => {
        console.log(`      - ${cat.name} (${cat.color})`);
      });
    }
  } catch (error) {
    console.log(`   ❌ Error fetching categories: ${error.message}`);
  }

  // 4. Check today's events
  console.log("\n4️⃣ Checking Today's Activity...");
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const todayEvents = await window.electron.ipcRenderer.invoke(
      "local:get-events-by-date-range",
      today.toISOString(),
      endOfDay.toISOString(),
    );
    console.log(`   📊 Events today: ${todayEvents.length}`);

    if (todayEvents.length > 0) {
      // Group by app
      const byApp = {};
      todayEvents.forEach((event) => {
        const app = event.ownerName || "Unknown";
        if (!byApp[app]) {
          byApp[app] = { count: 0, totalDuration: 0 };
        }
        byApp[app].count++;
        byApp[app].totalDuration += event.durationMs || 0;
      });

      console.log("   📱 Activity by app:");
      Object.entries(byApp)
        .sort((a, b) => b[1].totalDuration - a[1].totalDuration)
        .forEach(([app, data]) => {
          const minutes = Math.round(data.totalDuration / 1000 / 60);
          console.log(
            `      - ${app}: ${data.count} events, ${minutes} minutes`,
          );
        });
    }
  } catch (error) {
    console.log(`   ❌ Error fetching today's events: ${error.message}`);
  }

  // 5. Check settings
  console.log("\n5️⃣ Checking Settings...");
  try {
    const settings =
      await window.electron.ipcRenderer.invoke("local:get-settings");
    console.log(
      `   ⚙️  Tracking enabled: ${settings.tracking_enabled !== false ? "✅" : "❌"}`,
    );
    console.log(
      `   🤖 Categorization enabled: ${settings.categorization_enabled !== false ? "✅" : "❌"}`,
    );
    console.log(
      `   📸 Screenshots enabled: ${settings.screenshots_enabled ? "✅" : "❌"}`,
    );
    console.log(`   🧠 AI enabled: ${settings.ai_enabled ? "✅" : "❌"}`);
  } catch (error) {
    console.log(`   ❌ Error fetching settings: ${error.message}`);
  }

  console.log("\n✅ Diagnostics Complete!\n");
  console.log(
    "💡 If you see events in the database, check the calendar view to see them displayed.",
  );
  console.log(
    "💡 If no events yet, keep the app running and switch between applications.",
  );
}

// Run diagnostics
runDiagnostics();
