/**
 * Modal Component - VerseForge
 * Base modal component with universe theme support and plugin extensibility
 */

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { withPluginComponent } from '../../providers/PluginRegistryProvider';
import Button from '../Button/Button';

/* === TYPES === */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  variant?: 'default' | 'universe';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  universe?: string;
}

/* === STYLE VARIANTS === */

const getSizeClasses = (size: ModalProps['size']) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return sizes[size || 'md'];
};

const getVariantClasses = (variant: ModalProps['variant']) => {
  const variants = {
    default: 'border',
    universe: 'universe-surface universe-border',
  };

  return variants[variant || 'default'];
};

const getVariantStyles = (variant: ModalProps['variant']) => {
  if (variant === 'universe') {
    return {}; // Universe variant uses CSS custom properties
  }

  return {
    backgroundColor: 'var(--color-universe-surface)',
    borderColor: 'var(--color-universe-primary)',
    color: 'var(--color-universe-text)'
  };
};

/* === BASE COMPONENT === */

const BaseModal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  variant = 'default',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  universe: _universe,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  /* === KEYBOARD HANDLING === */

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (!modalRef.current || e.key !== 'Tab') return;

      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus();
          e.preventDefault();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('keydown', handleTabKey);

      // Store current active element and focus modal
      previousActiveElement.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, closeOnEscape, onClose]);

  /* === FOCUS MANAGEMENT === */

  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
      previousActiveElement.current = null;
    }
  }, [isOpen]);

  /* === BODY SCROLL LOCK === */

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /* === RENDER === */

  if (!isOpen) return null;

  const sizeClasses = getSizeClasses(size);
  const variantClasses = getVariantClasses(variant);
  const variantStyles = getVariantStyles(variant);

  const overlayClasses = [
    'fixed inset-0 z-modal',
    'bg-black bg-opacity-50',
    'flex items-center justify-center',
    'p-4',
    'animate-fade-in',
  ].join(' ');

  const modalClasses = [
    'relative w-full',
    sizeClasses,
    variantClasses,
    'rounded-lg shadow-xl',
    'animate-slide-up',
    'focus:outline-none',
  ].join(' ');

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose();
    }
  };

  const CloseIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );

  return createPortal(
    <div
      className={overlayClasses}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div ref={modalRef} className={modalClasses} style={variantStyles} tabIndex={-1}>
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            className={`flex items-center justify-between p-6 border-b ${variant === 'universe' ? 'border-universe-accent' : ''
              }`}
            style={variant !== 'universe' ? { borderColor: 'var(--color-universe-primary)' } : {}}
          >
            {title && (
              <h2
                id="modal-title"
                className="text-xl font-semibold"
                style={{ color: 'var(--color-universe-text)' }}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="ml-auto -mr-2"
                aria-label="Close modal"
              >
                <CloseIcon />
              </Button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div
            className={`flex items-center justify-end gap-3 p-6 border-t ${variant === 'universe' ? 'border-universe-accent' : ''
              }`}
            style={variant !== 'universe' ? { borderColor: 'var(--color-universe-primary)' } : {}}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

/* === PLUGIN-ENHANCED COMPONENT === */

export const Modal = withPluginComponent<ModalProps>('Modal', BaseModal);

/* === CONVENIENCE HOOKS === */

export const useModal = (initialOpen = false) => {
  const [isOpen, setIsOpen] = React.useState(initialOpen);

  const openModal = React.useCallback(() => setIsOpen(true), []);
  const closeModal = React.useCallback(() => setIsOpen(false), []);
  const toggleModal = React.useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
  };
};

/* === EXPORT === */

export default Modal;
