import React from 'react';
import { useModal } from '../context/ModalContext';
import OverlayDurationPicker from './OverlayDurationPicker';

const RootModalManager = () => {
  const { modalState, hideModal } = useModal();

  if (!modalState.visible) return null;

  const renderModal = () => {
    switch (modalState.type) {
      case 'durationPicker':
        return (
          <OverlayDurationPicker
            visible={modalState.visible}
            sessionType={modalState.props.sessionType}
            onClose={() => {
              console.log('🔴 Modal onClose called');
              hideModal();
            }}
            onConfirm={modalState.props.onConfirm}
            onCancel={() => {
              if (modalState.props.onCancel) {
                modalState.props.onCancel();
              }
              hideModal();
            }}
          />
        );
      default:
        return null;
    }
  };

  return renderModal();
};

export default RootModalManager;