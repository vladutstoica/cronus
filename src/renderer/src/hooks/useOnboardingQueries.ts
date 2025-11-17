import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { localApi } from '../lib/localApi'

export function useOnboardingQueries() {
  const [isDev, setIsDev] = useState(false)
  const [userGoals, setUserGoals] = useState('')
  const [isAiCategoriesLoading, setIsAiCategoriesLoading] = useState(false)
  const [referralSource, setReferralSource] = useState('')

  const { user, isAuthenticated } = useAuth()

  const [electronSettings, setElectronSettings] = useState<any>(null)
  const [userProjectsAndGoals, setUserProjectsAndGoals] = useState<string>('')
  const [isLoadingGoals, setIsLoadingGoals] = useState(true)
  const [hasCategories, setHasCategories] = useState(false)
  const [isLoadingHasCategories, setIsLoadingHasCategories] = useState(true)
  const [existingReferralSource, setExistingReferralSource] = useState<string>('')
  const [isLoadingReferral, setIsLoadingReferral] = useState(true)
  const [isCreatingCategories, setIsCreatingCategories] = useState(false)

  // Load data
  useEffect(() => {
    if (isAuthenticated) {
      loadOnboardingData()
    }
  }, [isAuthenticated])

  const loadOnboardingData = async () => {
    try {
      const userData = await localApi.user.get()

      if (userData) {
        setElectronSettings(userData.electron_app_settings || null)
        setUserProjectsAndGoals(userData.user_projects_and_goals || '')
        setExistingReferralSource(userData.referral_source || '')
      }
      setIsLoadingGoals(false)
      setIsLoadingReferral(false)

      // Check if user has categories
      const categoriesData = await localApi.categories.getAll()
      setHasCategories(categoriesData && categoriesData.length > 0)
      setIsLoadingHasCategories(false)
    } catch (error) {
      console.error('Error loading onboarding data:', error)
      setIsLoadingGoals(false)
      setIsLoadingHasCategories(false)
      setIsLoadingReferral(false)
    }
  }

  const createCategoriesMutation = {
    mutateAsync: async (data: { categories: any[] }) => {
      setIsCreatingCategories(true)
      try {
        // Create each category
        for (const category of data.categories) {
          await localApi.categories.create(category)
        }
        // Reload to check hasCategories
        await loadOnboardingData()
      } catch (error) {
        console.error('Error creating categories:', error)
        throw error
      } finally {
        setIsCreatingCategories(false)
      }
    },
    isLoading: isCreatingCategories
  }

  useEffect(() => {
    console.log('🚪 Onboarding modal mounted. Enabling permission requests for onboarding.')
    if (window.electron?.ipcRenderer) {
      window.electron.ipcRenderer.invoke('enable-permission-requests')
    }
    const checkDevStatus = async () => {
      const env = await window.api.getEnvVariables()
      setIsDev(env.isDev)
    }
    checkDevStatus()
  }, [])

  useEffect(() => {
    if (!isLoadingGoals) {
      console.log('Fetched user projects and goals:', userProjectsAndGoals)
    }
    if (!isLoadingHasCategories) {
      console.log('Fetched user categories:', hasCategories)
    }
  }, [userProjectsAndGoals, isLoadingGoals, hasCategories, isLoadingHasCategories])

  const handleGoalsComplete = (goals: string) => {
    setUserGoals(goals)
  }

  const handleCategoriesComplete = async (categories: any[]) => {
    if (categories.length > 0) {
      try {
        await createCategoriesMutation.mutateAsync({
          categories
        })
      } catch (error) {
        console.error('Failed to save categories:', error)
      }
    }
  }

  const hasExistingGoals = typeof userProjectsAndGoals === 'string' && userProjectsAndGoals.trim().length > 0
  const hasExistingReferral = typeof existingReferralSource === 'string' && existingReferralSource.trim().length > 0

  const isLoading = isLoadingGoals || isLoadingHasCategories || isLoadingReferral

  return {
    isDev,
    userGoals,
    isAiCategoriesLoading,
    setIsAiCategoriesLoading,
    referralSource,
    setReferralSource,
    electronSettings,
    userProjectsAndGoals,
    hasCategories,
    existingReferralSource,
    hasExistingGoals,
    hasExistingReferral,
    isLoading,
    handleGoalsComplete,
    handleCategoriesComplete
  }
}