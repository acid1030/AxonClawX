/**
 * AxonClaw - 安装向导
 * AxonClawX 风格：完整 5 步安装引导 (欢迎 → 运行环境 → AI 模型 → 安装组件 → 完成)
 * 复用 Setup 页的 SetupWizardContent
 */

import React from 'react';
import { SetupWizardContent } from '@/pages/Setup';
import { useSettingsStore } from '@/stores/settings';

interface InstallationWizardViewProps {
  onNavigateTo?: (view: string) => void;
}

export const InstallationWizardView: React.FC<InstallationWizardViewProps> = ({
  onNavigateTo,
}) => {
  const markSetupComplete = useSettingsStore((s) => s.markSetupComplete);

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#0f172a] overflow-hidden">
      <SetupWizardContent
        showTitleBar={false}
        onComplete={() => {
          markSetupComplete();
          onNavigateTo?.('chat');
        }}
      />
    </div>
  );
};

export default InstallationWizardView;
