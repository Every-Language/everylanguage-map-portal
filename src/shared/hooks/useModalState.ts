import { useState, useCallback, useMemo } from 'react';

export interface ModalState {
  activeModal: string | null;
  modalData: Record<string, unknown>;
}

export interface ModalActions {
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  setModalData: (data: Record<string, unknown>) => void;
  updateModalData: (key: string, value: unknown) => void;
  clearModalData: () => void;
  isModalOpen: (modalId: string) => boolean;
}

export interface UseModalStateOptions {
  initialModal?: string;
  initialData?: Record<string, unknown>;
  onModalChange?: (modalId: string | null, data: Record<string, unknown>) => void;
}

export function useModalState(
  options: UseModalStateOptions = {}
): ModalState & ModalActions {
  const {
    initialModal = null,
    initialData = {},
    onModalChange,
  } = options;

  // State
  const [activeModal, setActiveModal] = useState<string | null>(initialModal);
  const [modalData, setModalDataState] = useState<Record<string, unknown>>(initialData);

  // Actions
  const openModal = useCallback((modalId: string, data: Record<string, unknown> = {}) => {
    setActiveModal(modalId);
    setModalDataState(data);
    onModalChange?.(modalId, data);
  }, [onModalChange]);

  const closeModal = useCallback(() => {
    setActiveModal(null);
    setModalDataState({});
    onModalChange?.(null, {});
  }, [onModalChange]);

  const setModalData = useCallback((data: Record<string, unknown>) => {
    setModalDataState(data);
    onModalChange?.(activeModal, data);
  }, [activeModal, onModalChange]);

  const updateModalData = useCallback((key: string, value: unknown) => {
    setModalDataState(prev => {
      const newData = { ...prev, [key]: value };
      onModalChange?.(activeModal, newData);
      return newData;
    });
  }, [activeModal, onModalChange]);

  const clearModalData = useCallback(() => {
    setModalDataState({});
    onModalChange?.(activeModal, {});
  }, [activeModal, onModalChange]);

  const isModalOpen = useCallback((modalId: string) => {
    return activeModal === modalId;
  }, [activeModal]);

  // Computed state
  const state = useMemo(() => ({
    activeModal,
    modalData,
  }), [activeModal, modalData]);

  return {
    ...state,
    openModal,
    closeModal,
    setModalData,
    updateModalData,
    clearModalData,
    isModalOpen,
  };
} 