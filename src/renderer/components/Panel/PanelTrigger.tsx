import { motion } from 'framer-motion';
import { Icons } from '../Icons/IconComponents';

interface PanelTriggerProps {
  onClick: () => void;
  isOpen: boolean;
}

export function PanelTrigger({ onClick, isOpen }: PanelTriggerProps) {
  if (isOpen) return null;

  return (
    <motion.button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6
        w-12 h-12 rounded-full
        bg-gradient-to-br from-green-500/20 to-green-600/20
        hover:from-green-500/30 hover:to-green-600/30
        backdrop-blur-xl
        border border-green-500/20
        shadow-lg shadow-green-500/10
        flex items-center justify-center
        z-30
        group
      `}
      whileHover={{ scale: 1.05 }}
      whilePress={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      title="Open task panel (⌘K)"
    >
      <Icons.panelOpen className="w-5 h-5 text-green-400 group-hover:text-green-300" />
    </motion.button>
  );
}
