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
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-500',
      iconColor: 'text-purple-400',
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
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-500',
      iconColor: 'text-purple-400',
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

// Toast container component
const ToastContainer = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Individual toast item
const ToastItem = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (toast.duration <= 0) return;

    const interval = 50; // Update interval in ms
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
  const borderColorClass = toast.borderColor || 'border-gray-500';
  const iconColorClass = toast.iconColor || 'text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8, transition: { duration: 0.2 } }}
      className={`
        relative max-w-md rounded-xl border-2 shadow-2xl backdrop-blur-sm
        pointer-events-auto overflow-hidden
        ${bgColorClass}/10 ${borderColorClass}/30
        bg-[#1A1A1A]/90 border-[#2A2A2A]/50
        hover:border-opacity-60 transition-all duration-200
      `}
    >
      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-[#FF8C42] to-[#FF9D5C] transition-all duration-50"
             style={{ width: `${progress}%` }} />
      )}

      <div className="flex items-start space-x-3 p-4">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${bgColorClass}/20 border ${borderColorClass}/50 flex-shrink-0`}>
          <Icon className={iconColorClass} size={18} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white text-sm leading-tight mb-1">
                {toast.title}
              </h4>
              {toast.message && (
                <p className="text-gray-300 text-sm leading-relaxed">
                  {toast.message}
                </p>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-3 p-1 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/10 flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {/* Action button */}
          {toast.action && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toast.action.onClick}
              className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg
                bg-[#FF8C42] hover:bg-[#FF8C42]/90 text-white transition-all duration-200
                shadow-lg shadow-[#FF8C42]/20"
            >
              {toast.action.label}
              {toast.action.showArrow && <span className="ml-1">→</span>}
            </motion.button>
          )}
        </div>
      </div>

      {/* Type indicator bar */}
      <div className={`h-1 ${bgColorClass}/30`} />
    </motion.div>
  );
};

export default ToastProvider;
