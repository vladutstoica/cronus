import { Minus, Plus } from 'lucide-react'
import { Button } from '../../ui/button'

const CalendarZoomControls = ({
  handleZoomIn,
  handleZoomOut
}: {
  handleZoomIn: () => void
  handleZoomOut: () => void
}) => {
  return (
    <div className="absolute border-[1px] border-solid border-input rounded-md bg-card/50 backdrop-blur-sm bottom-4 right-4 z-40 flex flex-col gap-1">
      <Button variant="outline" size="xs" onClick={handleZoomIn} className="border-none bg-card/10">
        <Plus size={16} />
      </Button>
      <Button
        variant="outline"
        size="xs"
        onClick={handleZoomOut}
        className="border-none bg-card/10"
      >
        <Minus size={16} />
      </Button>
    </div>
  )
}

export default CalendarZoomControls
