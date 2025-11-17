import { CircleQuestionMark } from 'lucide-react'
import { useEffect, useState } from 'react'
import tutorialVideo from '../../assets/cronus-tutorial-25-june.mp4'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog'

interface TutorialModalProps {
  isFirstVisit: boolean
  onClose: () => void
}

export function TutorialModal({ isFirstVisit, onClose }: TutorialModalProps) {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isFirstVisit) {
      setTimeout(() => {
        setIsOpen(true)
      }, 1000)
    }
  }, [isFirstVisit])

  const handleClose = () => {
    setIsOpen(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex h-[80vh] w-full max-w-4xl flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-xl font-semibold">1m Tutorial</DialogTitle>
          <DialogDescription className="sr-only">
            Interactive tutorial showing how to use Cronus for productivity tracking
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm mx-6 text-muted-foreground pb-4">
          Open some other application (like Chrome) to start the tracking.
        </p>

        <div className="flex-1 px-6 flex flex-col items-center justify-center">
          <video
            src={tutorialVideo}
            controls
            autoPlay
            loop
            className="rounded-lg shadow-lg max-h-[50vh] w-auto"
            style={{ objectFit: 'contain' }}
          >
            Your browser does not support the video tag.
          </video>
        </div>
        <a
          href="https://www.loom.com/share/34531aee1ce94343a2c4c7cee04a0dc8?sid=a601c97f-9d16-4a7d-97e3-d8fc3db96679"
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-center items-center text-muted-foreground text-sm font-medium"
        >
          Open video in browser
        </a>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              You can always re-watch this tutorial from the{' '}
              <CircleQuestionMark className="inline-block w-4 h-4 mb-0.5" /> menu in the top right.
            </p>
            <Button onClick={handleClose} className="min-w-[120px]">
              Got it, let&apos;s start!
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
