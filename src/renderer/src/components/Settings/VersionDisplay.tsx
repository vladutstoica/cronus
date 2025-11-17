import { useEffect, useState } from 'react'

export function AppInformation({ onShowPermissions }: { onShowPermissions: () => void }) {
  const [version, setVersion] = useState('')
  const [buildDate, setBuildDate] = useState('')

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        const appVersion = await window.api.getAppVersion()
        setVersion(appVersion || 'N/A')
        const buildTimestamp = await window.api.getBuildDate()
        if (buildTimestamp === 'dev') {
          setBuildDate('Development Build')
        } else {
          setBuildDate(buildTimestamp ? new Date(buildTimestamp).toLocaleString() : 'N/A')
        }
      } catch (error) {
        console.error('Failed to get app version or build date:', error)
        setVersion('N/A')
        setBuildDate('N/A')
      }
    }

    fetchVersionInfo()
  }, [])

  return (
    <div className="space-y-4">
      <div className="bg-muted/30 rounded-lg p-6 border border-border">
        <h2 className="text-xl font-semibold mb-4">App Information</h2>
        <p className="text-muted-foreground">App Version: {version}</p>
        <p className="text-muted-foreground">Build Date: {buildDate}</p>
        <button
          className="text-muted-foreground underline text-sm mt-2 hover:text-primary transition-colors"
          onClick={onShowPermissions}
          type="button"
        >
          Display Permission Settings
        </button>
      </div>
    </div>
  )
}
