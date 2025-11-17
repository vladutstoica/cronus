import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { hexToRgba } from '../../../lib/colors'
import { formatDuration } from '../../../lib/timeFormatting'
import type { ProcessedEventBlock } from '../../DashboardView'
import { notionStyleCategoryColors } from '../../Settings/CategoryForm'
import { Skeleton } from '../../ui/skeleton'

interface WeekBreakdownProps {
  processedEvents: ProcessedEventBlock[] | null
  isLoading: boolean
  viewingDate: Date
  isDarkMode: boolean
}

interface CategoryWeeklyTotal {
  name: string
  totalDurationMs: number
  color: string
}

const WeekBreakdown = ({
  processedEvents,
  isLoading,
  viewingDate,
  isDarkMode
}: WeekBreakdownProps) => {
  const weeklyCategoryTotals = useMemo(() => {
    if (!processedEvents) {
      return []
    }

    const startOfWeek = new Date(viewingDate)
    const dayOfWeek = startOfWeek.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    startOfWeek.setDate(startOfWeek.getDate() - daysToSubtract)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(endOfWeek.getDate() + 7)

    const weekEvents =
      processedEvents?.filter((event) => {
        const eventTime = event.startTime.getTime()
        return eventTime >= startOfWeek.getTime() && eventTime < endOfWeek.getTime()
      }) || []

    const categoriesMap = new Map<string, CategoryWeeklyTotal>()

    weekEvents.forEach((event) => {
      const key = event.categoryId || 'uncategorized'
      const existing = categoriesMap.get(key)

      if (existing) {
        existing.totalDurationMs += event.durationMs
      } else {
        categoriesMap.set(key, {
          name: event.categoryName || 'Uncategorized',
          totalDurationMs: event.durationMs,
          color: event.categoryColor || '#808080'
        })
      }
    })

    return Array.from(categoriesMap.values()).sort((a, b) => b.totalDurationMs - a.totalDurationMs)
  }, [processedEvents, viewingDate])

  if (isLoading) {
    return (
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-4">
        <div className="w-1/3">
          <Skeleton className="w-full h-48 rounded-full" />
        </div>
        <div className="w-2/3">
          <h3 className="text-lg font-semibold mb-2 text-foreground">Top Categories</h3>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!weeklyCategoryTotals.length) {
    return null
  }

  const topCategories = weeklyCategoryTotals.slice(0, 8)

  const chartData = weeklyCategoryTotals.map((cat, index) => ({
    ...cat,
    color: cat.color || notionStyleCategoryColors[index % notionStyleCategoryColors.length]
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background p-2 border border-border rounded-md shadow-lg text-foreground">
          <p className="font-semibold">{data.name}</p>
          <p>{formatDuration(data.totalDurationMs)}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-4 border border-border rounded-lg bg-card flex items-center gap-4">
      <div className="w-1/2 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={96}
              fill="#8884d8"
              dataKey="totalDurationMs"
              nameKey="name"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={hexToRgba(entry.color, 0.7)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-1/2">
        <h3 className="text-lg font-semibold mb-2 text-foreground">Top Categories</h3>
        <div className="space-y-1">
          {topCategories.map((category) => (
            <div key={category.name} className="flex justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="text-foreground">{category.name}</span>
              </div>
              <span className="text-muted-foreground">
                {formatDuration(category.totalDurationMs)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WeekBreakdown
