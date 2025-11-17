import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { UpdateStatus } from '../../../../shared/update'
import { Button } from '../ui/button'

export function ManualUpdateSettings() {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  useEffect(() => {
    const cleanup = window.api.onUpdateStatus((status: UpdateStatus) => {
      setUpdateStatus(status)
      if (status.status !== 'checking') {
        setIsChecking(false)
      }
    })
    return cleanup
  }, [])

  const handleCheckForUpdates = () => {
    setIsChecking(true)
    setUpdateStatus(null)
    window.api.checkForUpdates()
  }

  const getStatusMessage = () => {
    if (isChecking) return 'Checking for updates...'
    if (!updateStatus) return null

    switch (updateStatus.status) {
      case 'checking':
        return 'Checking for updates...'
      case 'available':
        return `Update available: v${updateStatus.info.version}`
      case 'not-available':
        return 'You are running the latest version'
      case 'downloading':
        return `Downloading: ${updateStatus.progress.percent.toFixed(0)}%`
      case 'downloaded':
        return 'Update ready - restart to apply'
      case 'error':
        return `Error: ${updateStatus.error.message}`
      default:
        return null
    }
  }

  const getStatusColor = () => {
    if (isChecking) return 'text-muted-foreground'
    if (!updateStatus) return null

    switch (updateStatus.status) {
      case 'checking':
        return 'text-muted-foreground'
      case 'available':
        return 'text-blue-600 dark:text-blue-400'
      case 'not-available':
        return 'text-green-600 dark:text-green-400'
      case 'downloading':
        return 'text-blue-600 dark:text-blue-400'
      case 'downloaded':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return null
    }
  }

  return (
    <div className="bg-muted/30 rounded-lg p-6 border border-border">
      <h2 className="text-xl font-semibold mb-4">App Updates</h2>
      <p className="text-muted-foreground mb-4">
        Check for and install app updates manually.
      </p>
      
      <div className="flex items-center gap-4">
        <Button
          onClick={handleCheckForUpdates}
          disabled={isChecking}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Check for Updates
        </Button>
        
        {getStatusMessage() && (
          <span className={`text-sm ${getStatusColor()}`}>
            {getStatusMessage()}
          </span>
        )}
      </div>
    </div>
  )
}