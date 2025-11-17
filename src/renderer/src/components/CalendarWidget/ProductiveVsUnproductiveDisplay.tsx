import { processColor } from '../../lib/colors'
import { notionStyleCategoryColors } from '../Settings/CategoryForm'
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip'

interface Props {
  productiveDuration: number
  unproductiveDuration: number
  isDarkMode: boolean
  formatDuration?: (ms: number) => string | null
}

export function ProductiveVsUnproductiveDisplay({
  productiveDuration,
  unproductiveDuration,
  isDarkMode,
  formatDuration
}: Props) {
  const format = formatDuration
    ? formatDuration
    : (ms: number) => `${(ms / (1000 * 60 * 60)).toFixed(1)}h`

  return (
    <div className="flex flex-col flex-start gap-0.5 mt-1 text-muted-foreground">
      {productiveDuration > 0 && (
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: processColor(notionStyleCategoryColors[0], {
                isDarkMode,
                opacity: isDarkMode ? 0.7 : 0.6
              })
            }}
          />
          <span>{format(productiveDuration)}</span>
        </div>
      )}
      {unproductiveDuration > 0 && (
        <div className="flex items-center gap-1">
          <div
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: processColor(notionStyleCategoryColors[1], {
                isDarkMode,
                opacity: isDarkMode ? 0.7 : 0.6
              })
            }}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{format(unproductiveDuration)}</span>
            </TooltipTrigger>
            <TooltipContent>
              {Math.round(
                (unproductiveDuration / (productiveDuration + unproductiveDuration)) * 100
              )}
              %
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
