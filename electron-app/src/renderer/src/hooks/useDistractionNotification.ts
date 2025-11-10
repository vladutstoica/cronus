import { useEffect, useRef, useState } from 'react'
import { ActiveWindowDetails, Category } from 'shared'
import { useAuth } from '../contexts/AuthContext'
import { localApi } from '../lib/localApi'

export const useDistractionNotification = (
  categoryDetails: Category | null | undefined,
  activeWindow: ActiveWindowDetails | null,
  statusText: string
): void => {
  const { user, isAuthenticated } = useAuth()
  const [electronSettings, setElectronSettings] = useState<any>(null)

  const lastNotifiedRef = useRef<number | null>(null)
  const distractionStartRef = useRef<number | null>(null)

  // Load electron settings
  useEffect(() => {
    if (isAuthenticated) {
      const loadSettings = async () => {
        try {
          const userData = await localApi.user.get()
          if (userData && userData.electron_app_settings) {
            setElectronSettings(userData.electron_app_settings)
          }
        } catch (error) {
          console.error('Error loading electron settings:', error)
        }
      }
      loadSettings()
    }
  }, [isAuthenticated])

  useEffect(() => {
    if ((electronSettings as any)?.showDistractionNotifications === false) {
      distractionStartRef.current = null
      lastNotifiedRef.current = null
      return
    }

    const notificationIntervalMs =
      ((electronSettings as any)?.distractionNotificationInterval || 60) * 1000

    let isDistracting = false
    if (categoryDetails && typeof categoryDetails === 'object' && '_id' in categoryDetails) {
      const fullCategoryDetails = categoryDetails as Category
      if (fullCategoryDetails.isProductive === false) {
        isDistracting = true
      }
    }

    if (!isDistracting) {
      distractionStartRef.current = null
      lastNotifiedRef.current = null
      return
    }

    // When a distraction starts, record the time.
    if (!distractionStartRef.current) {
      distractionStartRef.current = Date.now()
    }

    const checkAndNotify = () => {
      if (!activeWindow) return

      const now = Date.now()

      // Ensure user has been on a distracting site for at least the interval duration
      if (
        !distractionStartRef.current ||
        now - distractionStartRef.current < notificationIntervalMs
      ) {
        return
      }

      // Since we're now running at the user's interval, we can show notification immediately
      const appName = activeWindow.ownerName || 'Current Application'
      const notificationTitle = `Focus Alert: ${appName}`
      const notificationBody = `${statusText}`

      // @ts-ignore
      window.api.showNotification({
        title: notificationTitle,
        body: notificationBody
      })
      lastNotifiedRef.current = now
    }

    const intervalId = setInterval(checkAndNotify, notificationIntervalMs)

    return () => {
      clearInterval(intervalId)
    }
  }, [categoryDetails, activeWindow, statusText, electronSettings])
}
