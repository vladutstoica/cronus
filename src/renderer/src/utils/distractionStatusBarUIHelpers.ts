import { ActiveWindowDetails, ActiveWindowEvent, Category } from '@shared/types'

export interface DisplayWindowInfo {
  ownerName: string
  title: string
  url: string | undefined
  isApp: boolean
}

export const getIdentifierFromUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname
  } catch (e) {
    console.warn('Error parsing URL for identifier:', url, e)
    return url
  }
}

export const getDisplayWindowInfo = (
  latestEvent: ActiveWindowEvent | null | undefined,
  activeWindow: ActiveWindowDetails | null
): DisplayWindowInfo => {
  const dw = latestEvent || activeWindow
  if (!dw) return { ownerName: 'No active application', title: '', url: undefined, isApp: true }

  // TODO: merge with or map from constants array?
  switch (dw.ownerName) {
    case 'System Sleep':
      return {
        ownerName: '💤 System Inactive',
        title: 'Computer was sleeping',
        url: undefined,
        isApp: true
      }
    case 'System Wake':
      return {
        ownerName: '⏰ System Active',
        title: 'Computer woke from sleep',
        url: undefined,
        isApp: true
      }
    case 'System Lock':
      return {
        ownerName: '🔒 Screen Locked',
        title: 'Screen was locked',
        url: undefined,
        isApp: true
      }
    case 'System Unlock':
      return {
        ownerName: '🔓 Screen Unlocked',
        title: 'Screen was unlocked',
        url: undefined,
        isApp: true
      }
    default:
      // Determine if it's an app or website based on URL presence
      const isApp = !dw.url
      return {
        ownerName: dw.ownerName || 'Unknown App',
        title: dw.title && dw.title !== dw.ownerName ? dw.title : '',
        url: dw.url || undefined,
        isApp
      }
  }
}

export const getCardBgColor = (categoryDetails: unknown, error?: unknown): string => {
  if (error) {
    return 'bg-gray-100 dark:bg-gray-800'
  }
  if (categoryDetails && typeof categoryDetails === 'object' && '_id' in categoryDetails) {
    const fullCategoryDetails = categoryDetails as Category
    if (fullCategoryDetails.isProductive === true) {
      return 'bg-blue-50 dark:bg-blue-900'
    } else {
      // isProductive is false or neutral (uncategorized by isProductive field)
      return 'bg-red-50 dark:bg-red-900'
    }
  }
  // Default if categoryDetails is null, not found, or still loading, treat as not productive for background
  return 'bg-gray-100 dark:bg-gray-800'
}

export const getStatusTextColor = (categoryDetails: unknown, error?: unknown): string => {
  if (error) {
    return 'text-gray-700 dark:text-gray-300'
  }
  if (categoryDetails && typeof categoryDetails === 'object' && '_id' in categoryDetails) {
    const fullCategoryDetails = categoryDetails as Category
    if (fullCategoryDetails.isProductive === true) {
      return 'text-blue-700 dark:text-blue-200'
    } else if (fullCategoryDetails.isProductive === false) {
      return 'text-red-700 dark:text-red-200'
    }
    // Neutral category, also using red background
    return 'text-red-700 dark:text-red-200' // Or a more neutral like text-yellow-700 dark:text-yellow-200
  }
  // Default for uncategorized or loading states where background is red
  return 'text-gray-700 dark:text-gray-300' // More contrast on red BG than muted-foreground
}

export const getStatusText = (
  latestEvent: ActiveWindowEvent | null | undefined,
  activeWindow: ActiveWindowDetails | null,
  categoryId: string | null | undefined,
  isLoadingCategory: boolean,
  isLoadingUserCategories: boolean,
  categoryDetails: unknown,
  error?: unknown
): string => {
  if (!latestEvent && !activeWindow) return 'Waiting for activity...'
  if (error) return 'Uncategorized'
  if (!latestEvent && activeWindow) return 'Processing...'
  if (!categoryId) return 'Uncategorized'
  if (isLoadingCategory || isLoadingUserCategories) return 'Loading category...'

  if (!categoryDetails || typeof categoryDetails !== 'object' || !('_id' in categoryDetails)) {
    return categoryDetails === null ? 'Uncategorized' : 'Category unavailable'
  }

  const fullCategoryDetails = categoryDetails as Category
  if (fullCategoryDetails.isProductive === true) return `${fullCategoryDetails.name}: Productive`
  if (fullCategoryDetails.isProductive === false) return `${fullCategoryDetails.name}: Unproductive`
  return `${fullCategoryDetails.name}: Neutral`
}
