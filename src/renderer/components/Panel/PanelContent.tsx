import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

export function PanelContent() {
  const { t } = useTranslation('panel');

  return (
    <div className="space-y-4">
      {/* Health Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">{t('overviewTitle')}</h3>
          <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
            {t('online')}
          </span>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="text-white/60 text-xs mb-1">Gateway</div>
            <div className="text-white font-semibold">{t('gatewayStable')}</div>
          </div>
          
          <div>
            <div className="text-white/60 text-xs mb-1">{t('activeChannels')}</div>
            <div className="text-white font-semibold">4 / 6</div>
          </div>
          
          <div>
            <div className="text-white/60 text-xs mb-1">{t('taskQueue')}</div>
            <div className="text-white font-semibold">18</div>
          </div>
        </div>
      </motion.div>

      {/* Tasks Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
      >
        <h3 className="text-white font-semibold text-sm mb-3">{t('todayTasks')}</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
              </div>
              <span className="text-white/90 text-sm">{t('taskContentGeneration')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs">
              {t('statusRunning')}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/60" />
              </div>
              <span className="text-white/90 text-sm">{t('taskChannelHealth')}</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/60 text-xs">
              {t('statusQueued')}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
      >
        <h3 className="text-white font-semibold text-sm mb-3">{t('quickActions')}</h3>
        
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            {t('runDiagnostics')}
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            {t('backupData')}
          </button>
          <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors">
            {t('newTemplate')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
