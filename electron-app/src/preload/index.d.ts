import { ElectronAPI } from '@electron-toolkit/preload'
import { ActiveWindowDetails } from '@shared/types'
import { FloatingWindowApi } from './floatingPreload'

// Use the BaseElectronAPI type from electron-toolkit if available
type BaseElectronAPI = ElectronAPI

// Permission types and status enums (must match the preload)
export enum PermissionType {
  Accessibility = 0,
  AppleEvents = 1,
  ScreenRecording = 2
}

export enum PermissionStatus {
  Denied = 0,
  Granted = 1,
  Pending = 2
}

// Define ActiveWindowDetails here, as it's used by the api type
export interface ActiveWindowDetails {
  id: number
  ownerName: string
  type: 'window' | 'browser'
  browser: 'chrome' | 'safari' | 'arc'
  title: string
  url?: string
  content?: string
  timestamp?: number
}

// Define a more specific type for ipcRenderer if BaseElectronAPI is not sufficient
interface CustomIpcRenderer extends BaseElectronAPI['ipcRenderer'] {
  removeListener: (channel: string, listener: (...args: any[]) => void) => void
  // Potentially include other methods like on, send, invoke if they also need explicit typing
  // For now, let's assume BaseElectronAPI['ipcRenderer'] has them, and we only add/ensure removeListener
  on: (channel: string, listener: (...args: any[]) => void) => void
  send: (channel: string, ...args: any[]) => void
  invoke: (channel: string, ...args: any[]) => Promise<any>
}

interface CustomElectronAPI extends BaseElectronAPI {
  ipcRenderer: CustomIpcRenderer
}

declare global {
  interface Window {
    electron: {
      ipcRenderer: Electron.IpcRenderer
    }
    api: {
      onAuthCodeReceived: (callback: (code: string) => void) => () => void // Return type for cleanup function
      onActiveWindowChanged: (callback: (details: ActiveWindowDetails) => void) => () => void // Return type for cleanup function
      // Add the new function's type signature here
      getEnvVariables: () => Promise<{ GOOGLE_CLIENT_ID?: string; [key: string]: any }>

      readFile: (filePath: string) => Promise<ArrayBuffer>
      deleteFile: (filePath: string) => Promise<void>
      onDisplayRecategorizePage: (callback: (activity: ActivityToRecategorize) => void) => () => void
      getFloatingWindowVisibility: () => Promise<boolean>
      getAudioDataUrl: () => Promise<string | null>
      openExternalUrl: (url: string) => void
      showNotification: (options: { title: string; body: string }) => void

      // Permission-related methods
      getPermissionRequestStatus: () => Promise<boolean>
      getPermissionStatus: (permissionType: PermissionType) => Promise<PermissionStatus>
      getPermissionsForTitleExtraction: () => Promise<boolean>
      getPermissionsForContentExtraction: () => Promise<boolean>
      requestPermission: (permissionType: PermissionType) => Promise<void>
      enablePermissionRequests: () => Promise<void>
      forceEnablePermissionRequests: () => Promise<void>
      startWindowTracking: () => Promise<void>
      pauseWindowTracking: () => Promise<void>
      resumeWindowTracking: () => Promise<void>
      checkForUpdates: () => Promise<void>
      downloadUpdate: () => Promise<void>
      installUpdate: () => Promise<void>
      onUpdateStatus: (callback: (status: any) => void) => () => void
      captureScreenshotAndOCR: () => Promise<{
        success: boolean
        ocrText?: string
        error?: string
      }>
      getAppVersion: () => Promise<string>
      getBuildDate: () => Promise<string>
      getAppIconPath: (appName: string) => Promise<string | null>
      redactSensitiveContent: (content: string) => Promise<string>
      // setSentryUser: (userData: { id: string; email: string; username: string; subscription: boolean } | null) => Promise<void>
      confirmQuit: () => Promise<void>
  
    }
    floatingApi: FloatingWindowApi
  }
}
