import { motion } from 'framer-motion';
import { Icons } from '../Icons/IconComponents';

interface CollapseButtonProps {
  isCollapsed: boolean;
  onToggle: () => void;
  tooltip?: string;
}

export function CollapseButton({ isCollapsed, onToggle, tooltip }: CollapseButtonProps) {
  const Icon = Icons.chevronLeft;
  
  return (
    <motion.button
      onClick={onToggle}
      className={`
        group relative w-8 h-8 rounded-full
        bg-gradient-to-b from-white/10 to-white/5
        hover:from-white/15 hover:to-white/10
        active:from-white/5 active:to-white/[0.02]
        border border-white/10
        backdrop-blur-xl
        transition-all duration-200
        flex items-center justify-center
      `}
      whileHover={{ scale: 1.05 }}
      whilePress={{ scale: 0.95 }}
      title={tooltip || (isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
    >
      <motion.div
        animate={{ rotate: isCollapsed ? 180 : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
      >
        <Icon className="w-4 h-4 text-white/70 group-hover:text-white/90" />
      </motion.div>
    </motion.button>
  );
}
