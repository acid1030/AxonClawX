/**
 * AxonClaw - 服务面板
 * 复刻自 AxonClawX ServicePanel.tsx
 */

import React from 'react';
import {
  RefreshCw,
  Play,
  Square,
  Link,
  Link2Off,
  Heart,
  Shield,
  Clock,
  HardDrive,
  Laptop,
  Server,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Power,
  History,
  ChevronDown,
  ChevronUp,
  Cloud,
  CloudOff,
  Hourglass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  systemd: <HardDrive className="w-5 h-5" />,
  launchd: <Laptop className="w-5 h-5" />,
  windows: <Server className="w-5 h-5" />,
  unsupported: <XCircle className="w-5 h-5" />,
};

const LIFECYCLE_ICON: Record<string, React.ReactNode> = {
  started: <Play className="w-3.5 h-3.5" />,
  recovered: <RefreshCw className="w-3.5 h-3.5" />,
  shutdown: <Square className="w-3.5 h-3.5" />,
  crashed: <AlertTriangle className="w-3.5 h-3.5" />,
  unreachable: <CloudOff className="w-3.5 h-3.5" />,
};

const LIFECYCLE_COLOR: Record<string, string> = {
  started: 'text-emerald-400',
  recovered: 'text-emerald-400',
  shutdown: 'text-white/40',
  crashed: 'text-red-400',
  unreachable: 'text-amber-400',
};

const LIFECYCLE_BG: Record<string, string> = {
  started: 'bg-emerald-500/10 border-emerald-500/20',
  recovered: 'bg-emerald-500/10 border-emerald-500/20',
  shutdown: 'bg-white/[0.04] border-white/[0.06]',
  crashed: 'bg-red-500/5 border-red-500/20',
  unreachable: 'bg-amber-500/5 border-amber-500/20',
};

function fmtLifecycleUptime(sec: number): string {
  if (sec <= 0) return '';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m ${sec % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export interface ServicePanelProps {
  status: any;
  healthCheckEnabled: boolean;
  healthStatus: { fail_count: number; last_ok: string } | null;
  gw: Record<string, any>;
  onCopy: (text: string) => void;
  toast: (type: 'success' | 'error', msg: string) => void;
  remote: boolean;
}

export const ServicePanel: React.FC<ServicePanelProps> = ({
  status,
  healthCheckEnabled,
  healthStatus,
  gw,
  onCopy,
  toast,
  remote,
}) => {
  // Mock data for lifecycle
  const lifecycleRecords: any[] = [];
  const lifecycleExpanded = false;

  return (
    <div className="p-4 space-y-4 text-white/80 overflow-y-auto custom-scrollbar h-full">
      {/* Process Info */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5" />
          {gw.serviceProcessInfo || 'Process Info'}
        </h4>
        {status?.running ? (
          <div className="grid grid-cols-2 gap-2">
            <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <p className="text-[9px] text-white/30 uppercase tracking-wider">{gw.status || 'Status'}</p>
              <p className="text-[12px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {gw.running || 'Running'}
              </p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <p className="text-[9px] text-white/30 uppercase tracking-wider">{gw.runtimeMode || 'Mode'}</p>
              <p className="text-[12px] font-bold font-mono text-white/70">{status.runtime || '-'}</p>
            </div>
            <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] col-span-2">
              <p className="text-[9px] text-white/30 uppercase tracking-wider">{gw.serviceDetail || 'Detail'}</p>
              <p className="text-[11px] font-mono text-white/50 break-all">{status.detail || '-'}</p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-4 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
            <Power className="w-6 h-6 text-white/15 mx-auto mb-1" />
            <p className="text-[11px] text-white/30">{gw.serviceNotRunning || 'Gateway is not running'}</p>
          </div>
        )}
      </div>

      {/* Daemon Service Status */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5" />
          {gw.serviceTitle || 'System Service'}
        </h4>
        <p className="text-[10px] text-white/30 leading-relaxed">{gw.serviceDesc || 'Run gateway as an OS-level service for auto-start on boot'}</p>

        {remote ? (
          <div className="px-3 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
            <Cloud className="w-4 h-4 text-white/20" />
            <p className="text-[11px] text-white/40">{gw.daemonRemoteHint || 'Remote gateways are already running as services. Daemon management is only available for local gateways.'}</p>
          </div>
        ) : status?.runtime === 'systemd' || status?.runtime === 'docker' ? (
          <div className="px-3 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-[11px] font-bold text-emerald-400">{gw.daemonAlreadyManaged || 'Already managed by system service'}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{status.runtime === 'systemd' ? 'systemd' : 'Docker'} — {status.detail || ''}</p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-2">
            <Info className="w-4 h-4 text-white/20" />
            <p className="text-[11px] text-white/40">Service management not available in this mode</p>
          </div>
        )}
      </div>

      {/* WebSocket Connection Status */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5" />
          {gw.svcWsTitle || 'WebSocket Connection'}
        </h4>
        <div className={cn(
          'px-3 py-3 rounded-lg border flex items-center gap-3',
          status?.ws_connected ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
        )}>
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            status?.ws_connected ? 'bg-emerald-500/15' : 'bg-red-500/15'
          )}>
            {status?.ws_connected ? (
              <Link className="w-5 h-5 text-emerald-400" />
            ) : (
              <Link2Off className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-[12px] font-bold', status?.ws_connected ? 'text-emerald-400' : 'text-red-400')}>
              {status?.ws_connected ? (gw.svcWsConnected || 'Connected') : (gw.svcWsDisconnected || 'Disconnected')}
            </p>
            <p className="text-[10px] text-white/40 font-mono mt-0.5">
              {status?.host || '127.0.0.1'}:{status?.port || 18789}
            </p>
          </div>
        </div>
      </div>

      {/* Watchdog Status */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5" />
          {gw.serviceWatchdog || 'Watchdog'}
        </h4>
        <div className={cn(
          'px-3 py-2.5 rounded-lg border flex items-center gap-2',
          healthCheckEnabled ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/[0.02] border-white/[0.06]'
        )}>
          <Shield className={cn('w-4 h-4', healthCheckEnabled ? 'text-emerald-400' : 'text-white/20')} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-[11px] font-bold', healthCheckEnabled ? 'text-emerald-400' : 'text-white/40')}>
              {healthCheckEnabled ? (gw.serviceWatchdogActive || 'Active') : (gw.serviceWatchdogInactive || 'Inactive')}
            </p>
            {healthCheckEnabled && healthStatus && (
              <p className="text-[10px] text-white/30 mt-0.5">
                {healthStatus.fail_count > 0
                  ? `${gw.hbUnhealthy || 'Unhealthy'} (${healthStatus.fail_count} fails)`
                  : `${gw.hbHealthy || 'Healthy'} — ${healthStatus.last_ok ? new Date(healthStatus.last_ok).toLocaleTimeString() : '-'}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Gateway Lifecycle Timeline */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/40 flex items-center gap-1.5">
          <History className="w-3.5 h-3.5" />
          {gw.lifecycleTitle || 'Gateway History'}
        </h4>

        {lifecycleRecords.length === 0 ? (
          <div className="px-3 py-4 rounded-lg bg-white/[0.02] border border-white/[0.06] text-center">
            <History className="w-6 h-6 text-white/10 mx-auto mb-1" />
            <p className="text-[11px] text-white/30">{gw.lifecycleEmpty || 'No lifecycle events yet'}</p>
          </div>
        ) : (
          <div className="space-y-0">
            {/* Lifecycle records would go here */}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicePanel;
