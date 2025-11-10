import { useState } from 'react'
import type { CanonicalBlock } from '../lib/dayTimelineHelpers'
import { toast } from './use-toast'

interface UseManualEntryProps {
  baseDate: Date
  onModalClose?: () => void
}

export const useManualEntry = ({ baseDate, onModalClose }: UseManualEntryProps) => {
  // Note: Manual entry functionality needs full reimplementation with localApi
  // This is a stub version to avoid TypeScript errors

  const [modalState, setModalState] = useState<{
    isOpen: boolean
    startTime: { hour: number; minute: number } | null
    endTime: { hour: number; minute: number } | null
    editingEntry: CanonicalBlock | null
  }>({
    isOpen: false,
    startTime: null,
    endTime: null,
    editingEntry: null
  })

  // Stub mutation objects that match the expected interface
  const createManualEntry = {
    mutate: () => {
      toast({
        title: 'Feature Not Available',
        description: 'Manual entry creation needs to be reimplemented',
        variant: 'destructive'
      })
    },
    mutateAsync: async () => {
      toast({
        title: 'Feature Not Available',
        description: 'Manual entry creation needs to be reimplemented',
        variant: 'destructive'
      })
    },
    isLoading: false
  }

  const updateManualEntry = {
    mutate: () => {
      toast({
        title: 'Feature Not Available',
        description: 'Manual entry update needs to be reimplemented',
        variant: 'destructive'
      })
    },
    mutateAsync: async () => {
      toast({
        title: 'Feature Not Available',
        description: 'Manual entry update needs to be reimplemented',
        variant: 'destructive'
      })
    },
    isLoading: false
  }

  const deleteManualEntry = {
    mutate: () => {
      toast({
        title: 'Feature Not Available',
        description: 'Manual entry deletion needs to be reimplemented',
        variant: 'destructive'
      })
    },
    mutateAsync: async () => {
      toast({
        title: 'Feature Not Available',
        description: 'Manual entry deletion needs to be reimplemented',
        variant: 'destructive'
      })
    },
    isLoading: false
  }

  const handleModalClose = () => {
    setModalState({ isOpen: false, startTime: null, endTime: null, editingEntry: null })
    onModalClose?.()
  }

  const handleModalSubmit = (data: { name: string; categoryId?: string }) => {
    toast({
      title: 'Feature Not Available',
      description: 'Manual entry functionality needs to be reimplemented with localApi',
      variant: 'destructive'
    })
    handleModalClose()
  }

  const handleModalDelete = (entryId: string) => {
    toast({
      title: 'Feature Not Available',
      description: 'Manual entry deletion needs to be reimplemented with localApi',
      variant: 'destructive'
    })
    handleModalClose()
  }

  const handleSelectManualEntry = (entry: CanonicalBlock) => {
    setModalState({
      isOpen: true,
      startTime: null,
      endTime: null,
      editingEntry: entry
    })
  }

  const openNewEntryModal = (
    startTime: { hour: number; minute: number },
    endTime: { hour: number; minute: number }
  ) => {
    setModalState({ isOpen: true, startTime, endTime, editingEntry: null })
  }

  return {
    modalState,
    handleModalClose,
    handleModalSubmit,
    handleModalDelete,
    handleSelectManualEntry,
    openNewEntryModal,
    updateManualEntry
  }
}
