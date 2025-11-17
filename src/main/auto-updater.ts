import { app, BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'
import { autoUpdater } from 'electron-updater'
import { UpdateStatus } from '../shared/update'
import { setAllowForcedQuit } from './windows'

let mainWindow: BrowserWindow | null = null
let updateTimer: NodeJS.Timeout | null = null

export function initializeAutoUpdater(window: BrowserWindow): void {
  mainWindow = window

  autoUpdater.logger = log
  log.transports.file.level = 'info'

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('checking-for-update', () => {
    // log.info('Checking for update...')
    mainWindow?.webContents.send('update-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    // log.info('Update available.', info)
    const payload: UpdateStatus = { status: 'available', info }
    mainWindow?.webContents.send('update-status', payload)
  })

  autoUpdater.on('update-not-available', () => {
    // log.info('Update not available.')
    const payload: UpdateStatus = { status: 'not-available' }
    mainWindow?.webContents.send('update-status', payload)
  })

  autoUpdater.on('error', (err) => {
    log.error('Auto-updater error:', err)
    // Sentry.captureException(err)
    const payload: UpdateStatus = { status: 'error', error: err }
    mainWindow?.webContents.send('update-status', payload)
  })

  autoUpdater.on('download-progress', (progressObj) => {
    // log.info(`Download progress: ${progressObj.percent}%`)
    const payload: UpdateStatus = { status: 'downloading', progress: progressObj }
    mainWindow?.webContents.send('update-status', payload)
  })

  autoUpdater.on('update-downloaded', () => {
    // log.info('Update downloaded.')
    const payload: UpdateStatus = { status: 'downloaded' }
    mainWindow?.webContents.send('update-status', payload)
  })

  // Check for updates on startup (only in production)
  if (!app.isPackaged) return

  setTimeout(() => {
    checkForUpdatesIfNeeded('startup')
  }, 3000)

  // Setup daily timer for users who keep app open
  // setupDailyUpdateCheck()

  // Setup a recurring timer to check for updates
  setupRecurringUpdateCheck()
}

function checkForUpdatesIfNeeded(trigger: string): void {
  // log.info(`✅ Triggering update check (${trigger})`)
  autoUpdater.checkForUpdates().catch((error) => {
    log.error(`Update check failed (${trigger}):`, error)
    // Sentry.captureException(error)
  })
}

// function setupDailyUpdateCheck(): void {
//   // Clear any existing timer
//   if (updateTimer) {
//     clearTimeout(updateTimer)
//     updateTimer = null
//   }

//   const now = new Date()
//   const next3AM = new Date()

//   // 3 AM
//   next3AM.setHours(3, 0, 0, 0)

//   // If it's already past 3 AM today, schedule for tomorrow
//   if (now.getHours() >= 3) {
//     next3AM.setDate(next3AM.getDate() + 1)
//   }

//   const msUntil3AM = next3AM.getTime() - now.getTime()

//   console.log(`📅 Next daily update check scheduled for: ${next3AM.toLocaleString()}`)

//   updateTimer = setTimeout(() => {
//     console.log('🔄 Daily update check triggered at 3 AM')
//     checkForUpdatesIfNeeded('daily_timer')

//     // Reschedule for next day
//     setupDailyUpdateCheck()
//   }, msUntil3AM)
// }

function setupRecurringUpdateCheck(): void {
  // Clear any existing timer
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }

  // Schedule next check in 5 minutes (300000 ms)
  const msUntilFiveMinutes = 300000

  // log.info(
  //   `📅 Next recurring update check scheduled for: ${new Date(Date.now() + msUntilFiveMinutes).toLocaleString()}`
  // )

  updateTimer = setTimeout(() => {
    // log.info('🔄 Recurring update check triggered')
    checkForUpdatesIfNeeded('recurring_timer')

    // Reschedule for next interval
    setupRecurringUpdateCheck()
  }, msUntilFiveMinutes)
}

export function registerAutoUpdaterHandlers(): void {
  ipcMain.handle('check-for-updates', () => {
    // log.info('🖱️ Manual update check requested')
    checkForUpdatesIfNeeded('manual')
    return true
  })
  ipcMain.handle('download-update', () => {
    try {
      return autoUpdater.downloadUpdate()
    } catch (error) {
      log.error('Error downloading update:', error)
      // Sentry.captureException(error)
      throw error
    }
  })
  ipcMain.handle('install-update', () => {
    // log.info('Requesting to quit and install update.')
    setAllowForcedQuit(true)
    autoUpdater.quitAndInstall(true, true)
  })
}
