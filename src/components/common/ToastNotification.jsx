import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertTriangle, Info, Gift, CreditCard, Calendar, Clock } from 'lucide-react';

// Toast context for managing notifications
const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast provider component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      ...toast,
      duration: toast.duration || 5000,
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // Auto remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }
    
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'success',
      title,
      message,
      icon: Check,
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500',
      iconColor: 'text-green-400',
      ...options,
    });
  }, [addToast]);

  const error = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'error',
      title,
      message,
      icon: AlertTriangle,
      bgColor: 'bg-red-500',
      borderColor: 'border-red-500',
      iconColor: 'text-red-400',
      duration: 7000, // Errors stay longer
      ...options,
    });
  }, [addToast]);

  const warning = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'warning',
      title,
      message,
      icon: AlertTriangle,
      bgColor: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-400',
      ...options,
    });
  }, [addToast]);

  const info = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'info',
      title,
      message,
      icon: Info,
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500',
      iconColor: 'text-blue-400',
      ...options,
    });
  }, [addToast]);

  const booking = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'booking',
      title,
      message,
      icon: Calendar,
      bgColor: 'bg-[var(--color-primary)]',
      borderColor: 'border-[var(--color-primary)]',
      iconColor: 'text-[var(--color-primary)]',
      ...options,
    });
  }, [addToast]);

  const payment = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'payment',
      title,
      message,
      icon: CreditCard,
      bgColor: 'bg-green-500',
      borderColor: 'border-green-500',
      iconColor: 'text-green-400',
      ...options,
    });
  }, [addToast]);

  const reminder = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'reminder',
      title,
      message,
      icon: Clock,
      bgColor: 'bg-yellow-500',
      borderColor: 'border-yellow-500',
      iconColor: 'text-yellow-400',
      ...options,
    });
  }, [addToast]);

  const promotion = useCallback((title, message, options = {}) => {
    return addToast({
      type: 'promotion',
      title,
      message,
      icon: Gift,
      bgColor: 'bg-[var(--color-primary)]',
      borderColor: 'border-[var(--color-primary)]',
      iconColor: 'text-[var(--color-primary)]',
      ...options,
    });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info,
    booking,
    payment,
    reminder,
    promotion,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// Toast container component - Shows only 1 toast at a time
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  // Only show the first toast
  const currentToast = toasts[0];
  const remainingCount = toasts.length - 1;

  return (
    <div className="fixed top-6 right-6 z-[9999] pointer-events-none max-w-sm">
      <AnimatePresence mode="wait">
        {currentToast && (
          <ToastItem key={currentToast.id} toast={currentToast} onRemove={removeToast} />
        )}
      </AnimatePresence>
      
      {/* Show remaining count */}
      {remainingCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-3 pointer-events-auto"
        >
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#1A1A1A]/95 border border-[#2A2A2A] backdrop-blur-xl shadow-lg">
            <span className="text-xs font-semibold text-gray-400">
              +{remainingCount} more
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// Individual toast item
const ToastItem = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration <= 0) return;

    const interval = 50;
    const decrement = (100 / (toast.duration / interval));
    
    const timer = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev - decrement;
        if (newProgress <= 0) {
          clearInterval(timer);
          return 0;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.duration]);

  const Icon = toast.icon || Info;
  const bgColorClass = toast.bgColor || 'bg-gray-500';
  const iconColorClass = toast.iconColor || 'text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95, transition: { duration: 0.2 } }}
      className="relative rounded-[20px] shadow-2xl backdrop-blur-2xl pointer-events-auto overflow-hidden bg-[#0A0A0A]/98 border border-[#1A1A1A] w-80"
    >
      {/* Progress bar */}
      {toast.duration > 0 && (
        <div 
          className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] transition-all duration-50"
          style={{ width: `${progress}%` }} 
        />
      )}

      <div className="p-4">
        <div className="flex items-start space-x-3">
          {/* Icon */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${bgColorClass}/10 border border-${bgColorClass.replace('bg-', '')}/30 flex items-center justify-center`}>
            <Icon className={iconColorClass} size={18} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-start justify-between mb-1">
              <h4 className="font-bold text-white text-sm leading-tight">
                {toast.title}
              </h4>
              
              {/* Close button */}
              <button
                onClick={() => onRemove(toast.id)}
                className="ml-2 p-1 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5 flex-shrink-0 active:scale-95"
              >
                <X size={16} />
              </button>
            </div>
            
            {toast.message && (
              <p className="text-gray-400 text-sm leading-relaxed mb-3">
                {toast.message}
              </p>
            )}

            {/* Action button */}
            {toast.action && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={toast.action.onClick}
                className="inline-flex items-center px-3 py-1.5 text-xs font-bold rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                {toast.action.label}
                <svg className="w-3 h-3 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ToastProvider;
