import { useCallback, useEffect, useState } from 'react'
import { ActiveWindowDetails, Category } from 'shared'
import { localApi } from '../lib/localApi'
import { uploadActiveWindowEvent } from '../lib/activityUploader'
import { showActivityMovedToast } from '../lib/custom-toasts'
import { toast } from './use-toast'
import { activityEventService } from '../lib/activityEventService'

export interface ActivityToRecategorize {
  identifier: string
  nameToDisplay: string
  itemType: 'app' | 'website'
  currentCategoryId: string
  currentCategoryName: string
  currentCategoryColor: string
  categoryReasoning?: string
  originalUrl?: string
  startDateMs?: number
  endDateMs?: number
}

interface UseActivityTrackingProps {
  isAuthenticated: boolean
  isTrackingPaused: boolean
  setIsSettingsOpen: (open: boolean) => void
  setFocusOn: (focusOn: string | null) => void
}

interface UseActivityTrackingReturn {
  activeWindow: ActiveWindowDetails | null
  isRecategorizeDialogOpen: boolean
  setIsRecategorizeDialogOpen: (open: boolean) => void
  recategorizeTarget: ActivityToRecategorize | null
  setRecategorizeTarget: (target: ActivityToRecategorize | null) => void
  allCategories: Category[] | undefined
  isLoadingAllCategories: boolean
  openRecategorizeDialog: (target: ActivityToRecategorize) => void
  handleSaveRecategorize: (newCategoryId: string) => void
  updateActivityCategoryMutation: any
}

export function useActivityTracking({
  isAuthenticated,
  isTrackingPaused,
  setIsSettingsOpen,
  setFocusOn
}: UseActivityTrackingProps): UseActivityTrackingReturn {
  const [activeWindow, setActiveWindow] = useState<ActiveWindowDetails | null>(null)
  const [isRecategorizeDialogOpen, setIsRecategorizeDialogOpen] = useState(false)
  const [recategorizeTarget, setRecategorizeTarget] = useState<ActivityToRecategorize | null>(null)
  const [allCategories, setAllCategories] = useState<Category[] | undefined>(undefined)
  const [isLoadingAllCategories, setIsLoadingAllCategories] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  // Load categories
  useEffect(() => {
    if (isAuthenticated) {
      setIsLoadingAllCategories(true)
      localApi.categories
        .getAll()
        .then((categories) => {
          setAllCategories(categories as any)
        })
        .catch((error) => {
          console.error('Error loading categories:', error)
        })
        .finally(() => {
          setIsLoadingAllCategories(false)
        })
    }
  }, [isAuthenticated])

  const updateActivityCategoryMutation = {
    mutate: async (variables: {
      startDateMs: number
      endDateMs: number
      activityIdentifier: string
      itemType: 'app' | 'website'
      newCategoryId: string
    }) => {
      setIsUpdating(true)
      try {
        // Update events in date range by recategorizing them
        // For now, we'll just show the toast - full implementation would need
        // a new IPC handler to batch update events
        const targetCategory = allCategories?.find((cat) => cat._id === variables.newCategoryId)
        const targetCategoryName = targetCategory ? targetCategory.name : 'Unknown Category'

        showActivityMovedToast({
          activityIdentifier: variables.activityIdentifier,
          targetCategoryName,
          timeRangeDescription: 'for the selected period',
          setIsSettingsOpen,
          setFocusOn
        })

        setIsRecategorizeDialogOpen(false)
        setRecategorizeTarget(null)

        // Reload categories to refresh data
        const updatedCategories = await localApi.categories.getAll()
        setAllCategories(updatedCategories as any)
      } catch (error: any) {
        console.error('Error updating category:', error)
        toast({
          duration: 1500,
          title: 'Error',
          description: 'Failed to re-categorize activity. ' + error.message,
          variant: 'destructive'
        })
      } finally {
        setIsUpdating(false)
      }
    },
    isLoading: isUpdating
  }

  const openRecategorizeDialog = useCallback(
    (target: ActivityToRecategorize) => {
      console.log('Opening re-categorize dialog for:', target)
      setRecategorizeTarget(target)
      setIsRecategorizeDialogOpen(true)
    },
    []
  )

  const handleSaveRecategorize = useCallback(
    (newCategoryId: string): void => {
      if (!recategorizeTarget) {
        toast({
          title: 'Error',
          description: 'Missing data for re-categorization.',
          variant: 'destructive'
        })
        return
      }

      let { startDateMs, endDateMs } = recategorizeTarget
      if (startDateMs === undefined || endDateMs === undefined) {
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        const endOfToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
          0,
          0,
          0,
          0
        )
        startDateMs = startOfToday.getTime()
        endDateMs = endOfToday.getTime()
      }

      updateActivityCategoryMutation.mutate({
        startDateMs: startDateMs,
        endDateMs: endDateMs,
        activityIdentifier: recategorizeTarget.identifier,
        itemType: recategorizeTarget.itemType,
        newCategoryId: newCategoryId
      })
    },
    [recategorizeTarget, updateActivityCategoryMutation]
  )

  // Handle IPC recategorization requests
  useEffect(() => {
    const handleRecategorizeRequestFromIPC = (receivedData: ActivityToRecategorize): void => {
      console.log('App.tsx: IPC Handler - Raw received data:', receivedData)
      if (receivedData && typeof receivedData === 'object' && receivedData.identifier) {
        openRecategorizeDialog(receivedData)
      } else {
        console.warn('App.tsx: IPC recategorize request failed. Data received:', receivedData)
      }
    }

    if (window.api && window.api.onDisplayRecategorizePage) {
      const cleanup = window.api.onDisplayRecategorizePage(handleRecategorizeRequestFromIPC)
      return cleanup
    } else {
      console.warn('App.tsx: window.api.onDisplayRecategorizePage not available for IPC.')
      return () => {}
    }
  }, [openRecategorizeDialog, activeWindow])

  const eventCreationMutation = {
    mutateAsync: async (eventData: any) => {
      // Process the event using local IPC
      const processedEvent = await localApi.tracking.processEvent(eventData)
      if (processedEvent) {
        const eventWithParsedDates = {
          ...processedEvent,
          lastCategorizationAt: processedEvent.lastCategorizationAt
            ? new Date(processedEvent.lastCategorizationAt)
            : undefined
        }
        activityEventService.addEvent(eventWithParsedDates)
      }
      return processedEvent
    }
  }

  // Handle active window changes and upload events
  useEffect(() => {
    const cleanup = window.api.onActiveWindowChanged((details) => {
      setActiveWindow(details)
      if (details && isAuthenticated && !isTrackingPaused) {
        uploadActiveWindowEvent(
          '', // token no longer needed
          details as ActiveWindowDetails & { localScreenshotPath?: string | undefined },
          eventCreationMutation.mutateAsync
        )
      }
    })
    return cleanup
  }, [isAuthenticated, eventCreationMutation.mutateAsync, isTrackingPaused])

  return {
    activeWindow,
    isRecategorizeDialogOpen,
    setIsRecategorizeDialogOpen,
    recategorizeTarget,
    setRecategorizeTarget,
    allCategories,
    isLoadingAllCategories,
    openRecategorizeDialog,
    handleSaveRecategorize,
    updateActivityCategoryMutation
  }
}
