import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../Icons/IconComponents';

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function FloatingPanel({ isOpen, onClose, children }: FloatingPanelProps) {
  const { t } = useTranslation('panel');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`
              fixed right-0 top-0 h-full w-[340px]
              bg-gradient-to-b from-[rgba(15,45,45,0.95)] to-[rgba(10,35,40,0.92)]
              backdrop-blur-2xl
              border-l border-green-500/10
              shadow-2xl
              z-50
              flex flex-col
            `}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-white/5">
              <h2 className="text-white font-semibold text-sm">{t('overviewTitle')}</h2>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Icons.close className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
