import { ActivityItem, ProcessedCategory } from '@renderer/lib/activityProcessing'
import React, { useMemo, useState } from 'react'

const useActivitySelection = (
  processedData: ProcessedCategory[],
  showMore: Record<string, boolean>
) => {
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set())
  const [lastSelectedActivityKey, setLastSelectedActivityKey] = useState<string | null>(null)

  const allVisibleActivities = useMemo(() => {
    if (!processedData) return []
    const result: ActivityItem[] = []
    processedData.forEach((category) => {
      const oneMinuteMs = 60 * 1000
      const allCategoryActivities = category.activities
      const visibleActivities = allCategoryActivities.filter((act) => act.durationMs >= oneMinuteMs)
      const hiddenActivities = allCategoryActivities.filter((act) => act.durationMs < oneMinuteMs)

      const shouldShowAllActivities = visibleActivities.length === 0 && hiddenActivities.length > 0
      const activitiesToShow = shouldShowAllActivities ? allCategoryActivities : visibleActivities
      const activitiesToHide = shouldShowAllActivities ? [] : hiddenActivities

      result.push(...activitiesToShow)
      if (showMore[category.id]) {
        result.push(...activitiesToHide)
      }
    })
    return result
  }, [processedData, showMore])

  const handleSelectActivity = (activityKey: string, event: React.MouseEvent) => {
    const { shiftKey } = event

    if (shiftKey && lastSelectedActivityKey) {
      const allVisibleActivityKeys = allVisibleActivities.map((a) => `${a.identifier}-${a.name}`)
      const lastIndex = allVisibleActivityKeys.indexOf(lastSelectedActivityKey)
      const currentIndex = allVisibleActivityKeys.indexOf(activityKey)

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const rangeKeys = allVisibleActivityKeys.slice(start, end + 1)

        setSelectedActivities((prev) => {
          const newSelected = new Set(prev)
          rangeKeys.forEach((key) => newSelected.add(key))
          // console.log('Selected activities:', Array.from(newSelected))
          return newSelected
        })
      }
    } else {
      setSelectedActivities((prev) => {
        const newSelected = new Set(prev)
        if (newSelected.has(activityKey)) {
          newSelected.delete(activityKey)
        } else {
          newSelected.add(activityKey)
        }
        // console.log('Selected activities:', Array.from(newSelected))
        return newSelected
      })
      setLastSelectedActivityKey(activityKey)
    }
  }

  const clearSelection = () => {
    setSelectedActivities(new Set())
  }

  return { selectedActivities, handleSelectActivity, clearSelection }
}

export default useActivitySelection
