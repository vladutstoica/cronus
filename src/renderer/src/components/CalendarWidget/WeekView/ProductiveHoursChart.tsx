import { TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactElement } from 'react'
import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import { processColor } from '../../../lib/colors'
import type { ProcessedEventBlock } from '../../DashboardView'
import { notionStyleCategoryColors } from '../../Settings/CategoryForm'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '../../ui/chart'
import { Skeleton } from '../../ui/skeleton'

interface ProductivityTrendChartProps {
  processedEvents: ProcessedEventBlock[] | null
  isDarkMode: boolean
  isLoading?: boolean
  viewingDate: Date
}

interface WeekSummary {
  startDate: Date
  endDate: Date
  totalProductiveDuration: number
  totalUnproductiveDuration: number
  totalWeekDuration: number
}

export function ProductivityTrendChart({
  processedEvents,
  isDarkMode,
  isLoading = false,
  viewingDate
}: ProductivityTrendChartProps): ReactElement {
  if (isLoading) {
    console.log('isLoading in ProductivityTrendChart', isLoading)

    return (
      <div className="border border-border rounded-lg bg-card p-4">
        {/* Title Skeleton */}
        <Skeleton className="h-6 w-56 mb-4" />
        {/* Chart Skeleton */}
        <div className="h-32 w-full mb-4 relative overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-between py-4">
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-px w-full" />
          </div>
          <div className="absolute inset-0 flex items-center justify-around pl-8">
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 200 80"
              preserveAspectRatio="none"
              className="opacity-50"
            >
              <path
                d="M 10,60 C 40,30 80,70 120,50 S 160,20 190,40"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth="1"
                fill="none"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
          <div className="absolute bottom-[-16px] left-0 right-0 flex justify-around pl-10 pr-10">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        {/* Summary Skeleton */}
        <Skeleton className="h-4 w-40" />
      </div>
    )
  }

  const weekData = useMemo<WeekSummary[]>(() => {
    if (!processedEvents || processedEvents.length === 0) {
      return []
    }

    const weeks: WeekSummary[] = []
    const now = viewingDate

    // Get the 4 weeks, starting from 3 weeks ago
    for (let i = 3; i >= 0; i--) {
      // Use the same week calculation as WeekOverWeekComparison
      const start = new Date(now)
      start.setDate(now.getDate() - now.getDay() - i * 7 + 1) // Monday start
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(start.getDate() + 7)

      console.log(`Week ${3 - i} boundaries:`, {
        start: start.toISOString(),
        end: end.toISOString(),
        weekNumber: 3 - i
      })

      const weekEvents = processedEvents.filter((event) => {
        const eventTime = event.startTime.getTime()
        return eventTime >= start.getTime() && eventTime < end.getTime()
      })

      console.log(`Week ${3 - i} events:`, {
        start: start.toISOString(),
        end: end.toISOString(),
        eventsCount: weekEvents.length,
        productiveEvents: weekEvents.filter((e) => e.isProductive).length,
        unproductiveEvents: weekEvents.filter((e) => !e.isProductive).length,
        firstEventTime: weekEvents[0]?.startTime.toISOString(),
        lastEventTime: weekEvents[weekEvents.length - 1]?.startTime.toISOString()
      })

      const totalProductiveDuration = weekEvents
        .filter((event) => event.isProductive)
        .reduce((sum, event) => sum + event.durationMs, 0)

      const totalUnproductiveDuration = weekEvents
        .filter((event) => !event.isProductive)
        .reduce((sum, event) => sum + event.durationMs, 0)

      const totalWeekDuration = totalProductiveDuration + totalUnproductiveDuration

      console.log(`Week ${3 - i} durations:`, {
        productiveHours: totalProductiveDuration / (1000 * 60 * 60),
        unproductiveHours: totalUnproductiveDuration / (1000 * 60 * 60),
        totalHours: totalWeekDuration / (1000 * 60 * 60)
      })

      weeks.push({
        startDate: start,
        endDate: end,
        totalProductiveDuration,
        totalUnproductiveDuration,
        totalWeekDuration
      })
    }

    // Sort weeks chronologically (oldest to newest)
    return weeks
  }, [processedEvents, viewingDate])

  const formatWeekLabel = (startDate: Date, endDate: Date): string => {
    const startMonth = startDate.toLocaleDateString(undefined, { month: 'short' })
    const endMonth = endDate.toLocaleDateString(undefined, { month: 'short' })
    const startDay = startDate.getDate()
    const endDay = endDate.getDate()

    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`
    }
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
  }

  // Prepare chart data for line chart
  const chartData = useMemo(() => {
    return weekData.map((week, index) => ({
      week: `W${index + 1}`,
      weekLabel: formatWeekLabel(week.startDate, week.endDate),
      productiveHours: parseFloat((week.totalProductiveDuration / (1000 * 60 * 60)).toFixed(1)),
      unproductiveHours: parseFloat((week.totalUnproductiveDuration / (1000 * 60 * 60)).toFixed(1)),
      totalHours: parseFloat((week.totalWeekDuration / (1000 * 60 * 60)).toFixed(1)),
      startDate: week.startDate,
      endDate: week.endDate
    }))
  }, [weekData])

  const segmentedChartData = useMemo(() => {
    const today = new Date()
    const currentWeekIndex = chartData.findIndex(
      (week) => today >= week.startDate && today < week.endDate
    )

    // If no week is the "current" week (e.g., viewing the past), or it's the first week, don't segment.
    if (currentWeekIndex <= 0) {
      return chartData.map((d, i) => ({
        ...d,
        index: i,
        lastWeekProductiveHours: null
      }))
    }

    // Apply segmentation for the current week
    return chartData.map((d, i) => {
      const point = {
        ...d,
        index: i,
        lastWeekProductiveHours: null as number | null
      }

      // The point BEFORE the current week
      if (i === currentWeekIndex - 1) {
        point.lastWeekProductiveHours = d.productiveHours
      }

      // The current week's point
      if (i === currentWeekIndex) {
        point.productiveHours = null as any // Don't draw a solid line to this point
        point.lastWeekProductiveHours = d.productiveHours // Draw a faded line to this point
      }
      return point
    })
  }, [chartData])

  // Calculate trend
  const productivityTrend = useMemo(() => {
    if (chartData.length < 2) return { change: 0, isPositive: true }

    const firstWeek = chartData[0]
    const lastWeek = chartData[chartData.length - 1]

    // If we only have data in the most recent week
    if (firstWeek.totalHours === 0 && lastWeek.totalHours > 0) {
      return { change: 100, isPositive: true }
    }

    // If we have no data at all
    if (firstWeek.totalHours === 0 && lastWeek.totalHours === 0) {
      return { change: 0, isPositive: true }
    }

    const firstProductivity =
      firstWeek.totalHours > 0 ? (firstWeek.productiveHours / firstWeek.totalHours) * 100 : 0
    const lastProductivity =
      lastWeek.totalHours > 0 ? (lastWeek.productiveHours / lastWeek.totalHours) * 100 : 0

    const change = lastProductivity - firstProductivity

    return {
      change: Math.abs(change),
      isPositive: change > 0
    }
  }, [chartData])

  const chartConfig = {
    productiveHours: {
      label: 'Productive Hours',
      color: processColor(notionStyleCategoryColors[0], { isDarkMode, opacity: 0.8 })
    }
  } satisfies ChartConfig

  return (
    <div className="border border-border rounded-lg bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-lg font-semibold text-foreground">Productive Hours</h3>
      </div>
      <div className="h-32">
        <ChartContainer
          config={chartConfig}
          className="h-full w-full !aspect-auto flex justify-center text-xs"
        >
          <LineChart
            accessibilityLayer
            data={segmentedChartData}
            margin={{
              left: 5,
              right: 60,
              top: 5,
              bottom: 25
            }}
            width={undefined}
            height={undefined}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="weekLabel"
              tickLine={false}
              axisLine={false}
              tickMargin={20}
              fontSize={10}
              tick={({ x, y, payload }) => {
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text x={0} y={0} dy={0} textAnchor="middle" fontSize={10}>
                      {payload.value}{' '}
                    </text>
                  </g>
                )
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              fontSize={10}
              tickFormatter={(value) => `${value}h`}
              ticks={[0, 10, 20, 30, 40, 50, 60]}
            />
            <ReferenceLine y={10} stroke="#e5e7eb" />
            <ReferenceLine y={20} stroke="#e5e7eb" />
            <ReferenceLine y={30} stroke="#e5e7eb" />
            <ReferenceLine y={40} stroke="#e5e7eb" />
            <ReferenceLine y={50} stroke="#e5e7eb" />
            <ReferenceLine y={60} stroke="#e5e7eb" />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name, item) => {
                    if (value === null) return null

                    const today = new Date()
                    const { startDate, endDate } = item.payload
                    const isActualCurrentWeek =
                      today >= startDate && today < new Date(endDate.getTime() + 86400000)

                    // For the current week, only show lastWeekProductiveHours
                    // For other weeks, only show productiveHours (to avoid duplicates)
                    if (isActualCurrentWeek && name !== 'lastWeekProductiveHours') return null
                    if (!isActualCurrentWeek && name === 'lastWeekProductiveHours') return null

                    const displayName =
                      name === 'productiveHours' || name === 'lastWeekProductiveHours'
                        ? 'Productive'
                        : 'Unproductive'

                    return [`${value}h `, displayName, isActualCurrentWeek ? ' (This Week)' : '']
                  }}
                />
              }
            />
            <Line
              dataKey="productiveHours"
              type="linear"
              stroke={chartConfig.productiveHours.color}
              strokeWidth={2}
              dot={{
                fill: chartConfig.productiveHours.color,
                strokeWidth: 2,
                r: 3
              }}
              connectNulls={false}
            />
            <Line
              dataKey="lastWeekProductiveHours"
              type="linear"
              stroke={chartConfig.productiveHours.color}
              strokeWidth={2}
              strokeOpacity={0.2}
              dot={{
                fill: chartConfig.productiveHours.color,
                strokeWidth: 2,
                r: 3,
                fillOpacity: 0.4
              }}
              connectNulls={false}
            />
          </LineChart>
        </ChartContainer>
      </div>

      {/* Trend Summary */}
      <div className="flex items-center gap-2 text-sm mt-2">
        <div className="flex gap-2 leading-none font-medium">
          {productivityTrend.isPositive ? (
            <>
              Trending up by {productivityTrend.change.toFixed(1)}%{' '}
              <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
            </>
          ) : (
            <>
              Trending down by {productivityTrend.change.toFixed(1)}%{' '}
              <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
