import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface SidebarItemProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isCollapsed?: boolean;
  onClick?: () => void;
}

export function SidebarItem({ icon: Icon, label, isActive, isCollapsed, onClick }: SidebarItemProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`
        group relative w-full flex items-center gap-3
        ${isCollapsed ? 'justify-center px-3 py-3' : 'px-3 py-2.5'}
        rounded-lg
        transition-all duration-200
        ${isActive 
          ? 'bg-blue-500/20 text-blue-400 border-l-2 border-blue-400' 
          : 'text-white/60 hover:bg-white/5 hover:text-white/90'
        }
      `}
      whileHover={{ x: isActive ? 0 : 2 }}
    >
      <Icon className={`flex-shrink-0 ${isCollapsed ? 'w-5 h-5' : 'w-[18px] h-[18px]'}`} />
      
      {!isCollapsed && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="text-sm font-medium truncate"
        >
          {label}
        </motion.span>
      )}
      
      {isActive && isCollapsed && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-400 rounded-r-full"
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      )}
    </motion.button>
  );
}
