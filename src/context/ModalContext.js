import React, { createContext, useContext, useState } from 'react';

const ModalContext = createContext();

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    visible: false,
    type: null,
    props: {}
  });

  const showModal = (type, props = {}) => {
    setModalState({
      visible: true,
      type,
      props
    });
  };

  const hideModal = () => {
    setModalState({
      visible: false,
      type: null,
      props: {}
    });
  };

  const value = {
    modalState,
    showModal,
    hideModal
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};