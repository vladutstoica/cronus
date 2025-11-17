// OLLAMA SETUP SCRIPT FOR CRONUS
// Paste this into DevTools console to configure Ollama

async function setupOllama() {
  console.log('🤖 Setting up Ollama for Cronus...\n')

  try {
    // 1. Get available models
    const models = await window.electron.ipcRenderer.invoke('local:list-ollama-models')
    console.log('📦 Available Ollama models:')
    models.forEach(model => console.log(`   - ${model}`))

    // 2. Check if we have llama3.2 or llama3.2:latest
    const llama32 = models.find(m => m.startsWith('llama3.2'))

    if (!llama32) {
      console.log('\n❌ No llama3.2 model found!')
      console.log('💡 Please pull the model first:')
      console.log('   ollama pull llama3.2')
      return
    }

    console.log(`\n✅ Found model: ${llama32}`)

    // 3. Update settings to use the correct model name
    console.log(`\n⚙️  Configuring Cronus to use: ${llama32}`)

    await window.electron.ipcRenderer.invoke('local:set-setting', 'ai_enabled', 'true')
    await window.electron.ipcRenderer.invoke('local:set-setting', 'categorization_enabled', 'true')
    await window.electron.ipcRenderer.invoke('local:set-setting', 'ollama_model', llama32)

    console.log('✅ Settings updated:')
    console.log('   - AI Enabled: ✅')
    console.log('   - Categorization Enabled: ✅')
    console.log(`   - Ollama Model: ${llama32}`)

    // 4. Verify settings
    const settings = await window.electron.ipcRenderer.invoke('local:get-all-settings')
    console.log('\n📋 Current Settings:')
    console.log(`   - ai_enabled: ${settings.ai_enabled}`)
    console.log(`   - categorization_enabled: ${settings.categorization_enabled}`)
    console.log(`   - ollama_model: ${settings.ollama_model}`)

    console.log('\n✅ Ollama is now configured!')
    console.log('💡 New events will be automatically categorized using AI.')
    console.log('💡 Watch the terminal for categorization logs.')

  } catch (error) {
    console.error('❌ Setup failed:', error)
    console.log('\nTroubleshooting:')
    console.log('1. Make sure Ollama is running: ollama serve')
    console.log('2. Check that llama3.2 is installed: ollama list')
    console.log('3. If not installed: ollama pull llama3.2')
  }
}

setupOllama()
