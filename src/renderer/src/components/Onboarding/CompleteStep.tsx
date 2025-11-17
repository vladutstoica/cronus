import { CheckCircle } from 'lucide-react'
import { Input } from '../ui/input'

interface CompleteStepProps {
  hasExistingReferral: boolean
  referralSource: string
  setReferralSource: (value: string) => void
  handleNext: () => void
}

export function CompleteStep({
  hasExistingReferral,
  referralSource,
  setReferralSource,
  handleNext
}: CompleteStepProps) {
  return (
    <div className="text-center space-y-6 flex flex-col items-center">
      <div className="flex justify-center">
        <div className="bg-green-100 dark:bg-green-900 p-4 rounded-full">
          <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
      </div>
      <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
        You&apos;re all set up. Cronus will now track your activity to help you stay focused.
      </p>
      {!hasExistingReferral && (
        <div className="w-full max-w-md mx-auto space-y-4">
          <div className="text-left flex flex-col gap-1">
            <label htmlFor="referral" className="font-medium text-base text-foreground mb-4 block">
              Btw, how did you hear about Cronus?{' '}
              <div className="text-xs text-muted-foreground">Optional</div>
            </label>
            <Input
              id="referral"
              type="text"
              placeholder="e.g. Twitter, a friend, Google search..."
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNext()
                }
              }}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  )
}
