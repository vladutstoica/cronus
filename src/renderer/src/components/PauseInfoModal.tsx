import React from 'react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog'

interface PauseInfoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

const PauseInfoModal: React.FC<PauseInfoModalProps> = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pause Tracking</DialogTitle>
          <DialogDescription>
            Are you sure you want to pause Cronus tracking? We automatically track when your
            computer goes to sleep/becomes inactive and pause the tracking accordingly. You can
            still force pause tracking here if you do not want your activity to appear in the
            timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onConfirm}>
            Manually Pause Tracking
          </Button>
          <Button onClick={onClose}>Let Cronus handle pausing</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PauseInfoModal
