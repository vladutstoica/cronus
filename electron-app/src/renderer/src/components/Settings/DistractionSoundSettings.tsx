import { useEffect, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { localApi } from '../../lib/localApi'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'

export const DistractionSoundSettings = () => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [playDistractionSound, setPlayDistractionSound] = useState(true)
  const [distractionSoundInterval, setDistractionSoundInterval] = useState(30) // in seconds
  const [showDistractionNotifications, setShowDistractionNotifications] = useState(true)
  const [distractionNotificationInterval, setDistractionNotificationInterval] = useState(60) // in seconds

  // Load settings
  useEffect(() => {
    if (user) {
      loadSettings()
    }
  }, [user])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const userData = await localApi.user.get()
      if (userData && userData.electron_app_settings) {
        const settings = userData.electron_app_settings
        setPlayDistractionSound(settings.playDistractionSound ?? true)
        setDistractionSoundInterval(settings.distractionSoundInterval ?? 30)
        setShowDistractionNotifications(settings.showDistractionNotifications ?? true)
        setDistractionNotificationInterval(settings.distractionNotificationInterval ?? 60)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateSettings = async (newSettings: any) => {
    try {
      await localApi.user.update({
        electron_app_settings: newSettings
      })
    } catch (error) {
      console.error('Failed to update settings:', error)
      alert('Failed to save settings. Your changes might not be saved.')
      // Reload settings on error
      loadSettings()
    }
  }

  const handlePlaySoundChange = (isChecked: boolean) => {
    setPlayDistractionSound(isChecked)
    updateSettings({
      playDistractionSound: isChecked,
      distractionSoundInterval,
      showDistractionNotifications,
      distractionNotificationInterval
    })
  }

  const handleIntervalChange = (value: string) => {
    const interval = Number(value)
    setDistractionSoundInterval(interval)
    updateSettings({
      playDistractionSound,
      distractionSoundInterval: interval,
      showDistractionNotifications,
      distractionNotificationInterval
    })
  }

  const handleShowNotificationsChange = (isChecked: boolean) => {
    setShowDistractionNotifications(isChecked)
    updateSettings({
      playDistractionSound,
      distractionSoundInterval,
      showDistractionNotifications: isChecked,
      distractionNotificationInterval
    })
  }

  const handleNotificationIntervalChange = (value: string) => {
    const interval = Number(value)
    setDistractionNotificationInterval(interval)
    updateSettings({
      playDistractionSound,
      distractionSoundInterval,
      showDistractionNotifications,
      distractionNotificationInterval: interval
    })
  }

  const handleOpenSystemNotificationsSettings = () => {
    // Open macOS System Preferences Notifications pane
    if (window.api?.openExternalUrl) {
      window.api.openExternalUrl('x-apple.systempreferences:com.apple.preference.notifications')
    } else {
      console.warn('window.api.openExternalUrl not available')
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-xl text-card-foreground">Focus Reminders</CardTitle>
        <CardDescription>
          Get alerts when you&apos;re using unproductive apps to help you stay focused.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-notifications-switch"
              checked={showDistractionNotifications}
              onCheckedChange={handleShowNotificationsChange}
            />
            <Label htmlFor="show-notifications-switch" className="whitespace-nowrap">
              Desktop Notifications
            </Label>
          </div>
          <Select
            value={distractionNotificationInterval.toString()}
            onValueChange={handleNotificationIntervalChange}
            disabled={!showDistractionNotifications}
          >
            <SelectTrigger id="notification-interval-select" className="w-[180px]">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Every 5 seconds</SelectItem>
              <SelectItem value="30">Every 30 seconds</SelectItem>
              <SelectItem value="60">Every 1 minute</SelectItem>
              <SelectItem value="120">Every 2 minutes</SelectItem>
              <SelectItem value="300">Every 5 minutes</SelectItem>
              <SelectItem value="600">Every 10 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* System Notifications Settings Button */}
        <div className="flex items-center justify-between space-x-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex-1">
            <p className="text-sm font-medium">System Notification Permissions</p>
            <p className="text-xs text-muted-foreground">
              If notifications aren&apos;t working, check your system settings
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenSystemNotificationsSettings}
            className="whitespace-nowrap"
          >
            Open System Settings
          </Button>
        </div>

        <div className="border-t border-border/50"></div>

        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="play-sound-switch"
              checked={playDistractionSound}
              onCheckedChange={handlePlaySoundChange}
            />
            <Label htmlFor="play-sound-switch" className="whitespace-nowrap">
              Sound Alerts
            </Label>
          </div>
          <Select
            value={distractionSoundInterval.toString()}
            onValueChange={handleIntervalChange}
            disabled={!playDistractionSound}
          >
            <SelectTrigger id="sound-interval-select" className="w-[180px]">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">Every 5 seconds</SelectItem>
              <SelectItem value="10">Every 10 seconds</SelectItem>
              <SelectItem value="30">Every 30 seconds</SelectItem>
              <SelectItem value="60">Every 1 minute</SelectItem>
              <SelectItem value="120">Every 2 minutes</SelectItem>
              <SelectItem value="300">Every 5 minutes</SelectItem>
              <SelectItem value="600">Every 10 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
