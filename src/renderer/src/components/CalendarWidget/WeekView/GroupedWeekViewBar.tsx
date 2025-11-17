import { processColor } from '../../../lib/colors'

interface GroupedWeekViewBarProps {
  productiveHeight: number
  unproductiveHeight: number
  isDarkMode: boolean
  productiveColor: string
  unproductiveColor: string
  totalProductiveDuration: number
  totalUnproductiveDuration: number
  isLoading?: boolean
}

export const GroupedWeekViewBar = ({
  productiveHeight,
  unproductiveHeight,
  isDarkMode,
  productiveColor,
  unproductiveColor,
  totalProductiveDuration,
  totalUnproductiveDuration
}: GroupedWeekViewBarProps) => {
  return (
    <div className="w-full h-full flex flex-row justify-evenly items-end">
      {totalProductiveDuration > 0 && (
        <div
          className="w-1/3 transition-all duration-300 flex rounded-lg items-center justify-center text-center overflow-hidden"
          style={{
            height: `${productiveHeight}%`,
            backgroundColor: processColor(productiveColor, {
              isDarkMode,
              opacity: isDarkMode ? 0.7 : 0.6
            })
          }}
        />
      )}
      {totalUnproductiveDuration > 0 && (
        <div
          className="w-1/3 transition-all duration-300 flex rounded-lg items-center justify-center text-center overflow-hidden"
          style={{
            height: `${unproductiveHeight}%`,
            backgroundColor: processColor(unproductiveColor, {
              isDarkMode,
              opacity: isDarkMode ? 0.7 : 0.6
            })
          }}
        />
      )}
    </div>
  )
}
