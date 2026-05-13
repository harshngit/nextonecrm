import React from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Modal from './Modal'
import Button from './Button'

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to perform this action?', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'info'
  loading = false
}) {
  const icons = {
    danger: <AlertTriangle className="text-red-500" size={24} />,
    warning: <AlertTriangle className="text-amber-500" size={24} />,
    info: <AlertTriangle className="text-blue-500" size={24} />
  }

  const confirmButtonVariants = {
    danger: 'danger',
    warning: 'warning',
    info: 'primary'
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title}
      size="sm"
    >
      <div className="flex flex-col items-center text-center py-2">
        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
          variant === 'danger' ? 'bg-red-50 dark:bg-red-900/20' : 
          variant === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20' : 
          'bg-blue-50 dark:bg-blue-900/20'
        }`}>
          {icons[variant]}
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          {message}
        </p>

        <div className="flex gap-3 w-full">
          <Button 
            variant="outline" 
            className="flex-1 rounded-xl" 
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button 
            variant={variant === 'danger' ? 'danger' : 'primary'}
            className="flex-1 rounded-xl shadow-lg shadow-red-500/10" 
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
