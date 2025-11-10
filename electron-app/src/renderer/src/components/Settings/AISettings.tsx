import { AlertCircle, CheckCircle, Download, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { localApi } from '../../lib/localApi'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'

interface OllamaModel {
  name: string
  size?: string
}

export function AISettings() {
  const [aiEnabled, setAiEnabled] = useState(true)
  const [screenshotsEnabled, setScreenshotsEnabled] = useState(false)
  const [selectedModel, setSelectedModel] = useState('llama3.2')
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'running' | 'not-running'>('checking')

  // Load settings on mount
  useEffect(() => {
    loadSettings()
    checkOllamaStatus()
    loadAvailableModels()
  }, [])

  const loadSettings = async () => {
    try {
      const settings = await localApi.settings.getAll()
      setAiEnabled(settings.ai_enabled === 'true')
      setScreenshotsEnabled(settings.screenshots_enabled === 'true')
      setSelectedModel(settings.ollama_model || 'llama3.2')
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  const checkOllamaStatus = async () => {
    try {
      const models = await localApi.ollama.listModels()
      setOllamaStatus(models.length >= 0 ? 'running' : 'not-running')
    } catch (error) {
      setOllamaStatus('not-running')
    }
  }

  const loadAvailableModels = async () => {
    setIsLoadingModels(true)
    try {
      const models = await localApi.ollama.listModels()
      setAvailableModels(
        models.map((name: string) => ({
          name: name.replace(':latest', '')
        }))
      )
    } catch (error) {
      console.error('Failed to load models:', error)
    } finally {
      setIsLoadingModels(false)
    }
  }

  const handleAIToggle = async (checked: boolean) => {
    setAiEnabled(checked)
    await localApi.settings.set('ai_enabled', checked)
  }

  const handleScreenshotsToggle = async (checked: boolean) => {
    setScreenshotsEnabled(checked)
    await localApi.settings.set('screenshots_enabled', checked)
  }

  const handleModelChange = async (model: string) => {
    setSelectedModel(model)
    await localApi.settings.set('ollama_model', model)
  }

  const handleDownloadModel = async (modelName: string) => {
    setIsDownloading(true)
    try {
      await localApi.ollama.pullModel(modelName)
      await loadAvailableModels()
      await checkOllamaStatus()
    } catch (error) {
      console.error('Failed to download model:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  const popularModels = [
    { name: 'llama3.2', description: 'Fast & lightweight (~2GB)', recommended: true },
    { name: 'llama3.1', description: 'More accurate (~4.7GB)', recommended: false },
    { name: 'mistral', description: 'Alternative model (~4GB)', recommended: false },
    { name: 'codellama', description: 'Code-focused (~7GB)', recommended: false }
  ]

  return (
    <div className="bg-muted/30 rounded-lg p-6 border border-border space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">AI Configuration</h2>
        <p className="text-sm text-muted-foreground">
          Configure local AI categorization using Ollama. No API key needed!
        </p>
      </div>

      {/* Ollama Status */}
      <div className="flex items-center gap-2 p-3 rounded-md bg-background border">
        {ollamaStatus === 'checking' && (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Checking Ollama status...</span>
          </>
        )}
        {ollamaStatus === 'running' && (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-foreground">Ollama is running</span>
          </>
        )}
        {ollamaStatus === 'not-running' && (
          <>
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-foreground">
              Ollama not detected. Run <code className="bg-muted px-1 rounded">ollama serve</code>
            </span>
          </>
        )}
      </div>

      {/* AI Enabled Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="ai-enabled">Enable AI Categorization</Label>
          <p className="text-sm text-muted-foreground">
            Use Ollama to intelligently categorize your activities
          </p>
        </div>
        <Switch id="ai-enabled" checked={aiEnabled} onCheckedChange={handleAIToggle} />
      </div>

      {/* Model Selection */}
      {aiEnabled && (
        <div className="space-y-2">
          <Label htmlFor="model-select">Ollama Model</Label>
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger id="model-select">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.length > 0 ? (
                availableModels.map((model) => (
                  <SelectItem key={model.name} value={model.name}>
                    {model.name}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No models installed
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          {isLoadingModels && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading models...
            </p>
          )}
        </div>
      )}

      {/* Download Models Section */}
      {aiEnabled && ollamaStatus === 'running' && (
        <div className="space-y-3 pt-2 border-t">
          <div>
            <h3 className="text-sm font-medium mb-1">Download Models</h3>
            <p className="text-xs text-muted-foreground">
              Install popular models for AI categorization
            </p>
          </div>
          <div className="grid gap-2">
            {popularModels.map((model) => {
              const isInstalled = availableModels.some((m) => m.name === model.name)
              return (
                <div
                  key={model.name}
                  className="flex items-center justify-between p-3 rounded-md border bg-background"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{model.name}</span>
                      {model.recommended && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Recommended
                        </span>
                      )}
                      {isInstalled && (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                  </div>
                  {!isInstalled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadModel(model.name)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-1" />
                          Download
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Screenshots Toggle */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="space-y-0.5">
          <Label htmlFor="screenshots-enabled">Enable Screenshots</Label>
          <p className="text-sm text-muted-foreground">
            Capture screenshots of your activities (stored locally)
          </p>
        </div>
        <Switch
          id="screenshots-enabled"
          checked={screenshotsEnabled}
          onCheckedChange={handleScreenshotsToggle}
        />
      </div>

      {/* Info Section */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3">
        <p className="text-xs text-foreground">
          <strong>Privacy First:</strong> All AI processing happens on your machine. No data is sent
          to external servers. Ollama is free and open-source.
        </p>
      </div>
    </div>
  )
}
