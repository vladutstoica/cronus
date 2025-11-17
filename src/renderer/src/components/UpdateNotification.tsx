import { Loader2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { UpdateStatus } from '../../../shared/update'
import { useTheme } from '../contexts/ThemeContext'
import { toast } from '../hooks/use-toast'
import { useDarkMode } from '../hooks/useDarkMode'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from './ui/alert-dialog'
import { Button } from './ui/button'
import { ToastAction } from './ui/toast'

export function UpdateNotification({
  onRestartBegin
}: {
  onRestartBegin?: () => void
}): React.JSX.Element {
  const { theme } = useTheme()
  const isDarkMode = useDarkMode()
  const toastRef = useRef<any>(null)
  const [isRestarting, setIsRestarting] = useState(false)

  useEffect(() => {
    const handleUpdateStatus = (status: UpdateStatus): void => {
      if (status.status === 'available') {
        toastRef.current = toast({
          title: 'Update Available',
          description: `Version ${status.info.version} found. Downloading automatically...`
        })

        setTimeout(() => {
          window.api.downloadUpdate()
        }, 1000)
      }

      if (status.status === 'downloading') {
        const progressNumber = status.progress.percent
        const isComplete = progressNumber >= 100
        const progressDisplay = progressNumber.toFixed(0)

        if (toastRef.current) {
          toastRef.current.update({
            title: 'Downloading Update',
            description: isComplete
              ? `Progress: ${progressDisplay}% ✅`
              : `Progress: ${progressDisplay}%`
          })
        } else {
          toastRef.current = toast({
            title: 'Downloading Update',
            description: `Progress: ${progressDisplay}%`
          })
        }
      }

      if (status.status === 'downloaded') {
        const handleRestart = (): void => {
          setIsRestarting(true)
          onRestartBegin?.() // Notify parent that system restart is beginning
          window.api.installUpdate()
        }

        if (toastRef.current) {
          toastRef.current.update({
            title: 'Update Ready',
            description: 'Update downloaded successfully. Restart to apply the update.',
            duration: Infinity,
            action: (
              <ToastAction asChild altText="Restart Now">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRestart}
                  className={isDarkMode ? 'text-white' : 'text-black'}
                >
                  Restart Now
                </Button>
              </ToastAction>
            )
          })
        } else {
          toastRef.current = toast({
            title: 'Update Ready',
            description: 'Update downloaded successfully. Restart to apply the update.',
            duration: Infinity,
            action: (
              <ToastAction asChild altText="Restart Now">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRestart}
                  className={isDarkMode ? 'text-white' : 'text-black'}
                >
                  Restart Now
                </Button>
              </ToastAction>
            )
          })
        }
      }

      if (status.status === 'error') {
        if (toastRef.current) {
          toastRef.current.update({
            title: 'Update Error',
            description: status.error.message,
            variant: 'destructive'
          })
        }
      }
    }

    const cleanup = window.api.onUpdateStatus(handleUpdateStatus)
    return cleanup
  }, [theme, isDarkMode])

  return (
    <AlertDialog open={isRestarting}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update in Progress</AlertDialogTitle>
          <AlertDialogDescription>
            Restarting to apply the update. This can take up to 30 seconds! After the app closes it
            can take up to 1 minute for the update to be applied. Please do not open it until it
            opens back up by itself.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
