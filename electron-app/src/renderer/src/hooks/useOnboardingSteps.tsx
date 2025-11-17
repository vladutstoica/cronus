import { useState, useMemo } from 'react'
import { User } from '@shared/types'
import { AccessibilityStep } from '../components/Onboarding/AccessibilityStep'
import { CompleteStep } from '../components/Onboarding/CompleteStep'
import { ScreenRecordingStep } from '../components/Onboarding/ScreenRecordingStep'
import { WelcomeStep } from '../components/Onboarding/WelcomeStep'
import { AiCategoryCustomization } from '../components/Settings/AiCategoryCustomization'
import GoalInputForm from '../components/Settings/GoalInputForm'

interface UseOnboardingStepsProps {
  user: User | null
  hasExistingGoals: boolean
  hasCategories: boolean
  hasExistingReferral: boolean
  userGoals: string
  permissionStatus: number | null
  hasRequestedPermission: boolean
  screenRecordingStatus: number | null
  hasRequestedScreenRecording: boolean
  referralSource: string
  setReferralSource: (source: string) => void
  onGoalsComplete: (goals: string) => void
  onCategoriesComplete: (categories: any[]) => void
  onNext: () => void
  onAiCategoriesLoadingChange: (loading: boolean) => void
}

export function useOnboardingSteps({
  user,
  hasExistingGoals,
  hasCategories,
  hasExistingReferral,
  userGoals,
  permissionStatus,
  hasRequestedPermission,
  screenRecordingStatus,
  hasRequestedScreenRecording,
  referralSource,
  setReferralSource,
  onGoalsComplete,
  onCategoriesComplete,
  onNext,
  onAiCategoriesLoadingChange
}: UseOnboardingStepsProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const baseSteps = useMemo(() => [
    {
      id: 'welcome',
      title: 'We care about your privacy',
      content: <WelcomeStep />
    },
    {
      id: 'goals',
      title: '',
      content: <GoalInputForm onboardingMode={true} onComplete={onGoalsComplete} />
    },
    {
      id: 'ai-categories',
      title: 'Customize Your Categories',
      content: (
        <AiCategoryCustomization
          onComplete={onCategoriesComplete}
          goals={userGoals}
          onLoadingChange={onAiCategoriesLoadingChange}
        />
      )
    },
    {
      id: 'accessibility',
      title: 'Enable Accessibility Permission',
      content: (
        <AccessibilityStep
          permissionStatus={permissionStatus}
          hasRequestedPermission={hasRequestedPermission}
        />
      )
    },
    {
      id: 'screen-recording',
      title: 'Enable Window OCR Permission',
      content: (
        <ScreenRecordingStep
          screenRecordingStatus={screenRecordingStatus}
          hasRequestedScreenRecording={hasRequestedScreenRecording}
        />
      )
    },
    {
      id: 'complete',
      title: "You're All Set!",
      content: (
        <CompleteStep
          hasExistingReferral={hasExistingReferral}
          referralSource={referralSource}
          setReferralSource={setReferralSource}
          handleNext={onNext}
        />
      )
    }
  ], [
    userGoals,
    permissionStatus,
    hasRequestedPermission,
    screenRecordingStatus,
    hasRequestedScreenRecording,
    hasExistingReferral,
    referralSource,
    setReferralSource,
    onGoalsComplete,
    onCategoriesComplete,
    onNext,
    onAiCategoriesLoadingChange
  ])

  const steps = useMemo(() => {
    return baseSteps.filter((step) => {
      if (step.id === 'goals' && hasExistingGoals) {
        return false
      }

      if (step.id === 'ai-categories' && hasCategories) {
        return false
      }

      return true
    })
  }, [baseSteps, hasExistingGoals, hasCategories])

  const handleNext = () => {
    console.log('🚀 User clicked Next. Proceeding to next step, currentStep:', currentStep)
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkipToEnd = () => {
    const completeStepIndex = steps.findIndex((step) => step.id === 'complete')
    if (completeStepIndex !== -1) {
      setCurrentStep(completeStepIndex)
    }
  }

  const currentStepData = steps[currentStep]
  const isLastStep = currentStep === steps.length - 1
  const isGoalStep = currentStepData?.id === 'goals'
  const isAiCategoriesStep = currentStepData?.id === 'ai-categories'
  const isAccessibilityStep = currentStepData?.id === 'accessibility'
  const isScreenRecordingStep = currentStepData?.id === 'screen-recording'
  const isWelcomeStep = currentStepData?.id === 'welcome'

  return {
    currentStep,
    setCurrentStep,
    steps,
    currentStepData,
    isLastStep,
    isGoalStep,
    isAiCategoriesStep,
    isAccessibilityStep,
    isScreenRecordingStep,
    isWelcomeStep,
    handleNext,
    handleBack,
    handleSkipToEnd
  }
}