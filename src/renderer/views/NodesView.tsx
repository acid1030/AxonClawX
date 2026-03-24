/**
 * AxonClaw - 节点管理
 * AxonClawX 风格完整复刻：节点列表、新增节点、详情、healthy检查
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Network,
  RefreshCw,
  Plus,
  Cpu,
  Search,
  MoreVertical,
  Trash2,
  Activity,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from '@/stores/gateway';
import { invokeIpc } from '@/lib/api-client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface NodeItem {
  id: string;
  name?: string;
  type?: string;
  platform?: string;
  version?: string;
  status?: string;
  lastSeen?: number;
  ip?: string;
  port?: number;
  metadata?: Record<string, unknown>;
}

const NodesView: React.FC = () => {
  const { t } = useTranslation('views');
  const initGateway = useGatewayStore((s) => s.init);
  const setStatus = useGatewayStore((s) => s.setStatus);
  const gatewayStatus = useGatewayStore((s) => s.status);

  const [connectionVerified, setConnectionVerified] = useState<boolean | null>(null);
  const isOnline = connectionVerified === true || (connectionVerified === null && gatewayStatus.state === 'running');

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NodeItem | null>(null);
  const [addForm, setAddForm] = useState({ name: '', type: 'worker', ip: '127.0.0.1', port: 18789 });
  const [addSubmitting, setAddSubmitting] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      await initGateway();
      const r = await invokeIpc<{ success: boolean; port?: number }>('gateway:checkConnection');
      setConnectionVerified(r?.success ?? false);
      if (r?.success && r?.port) setStatus({ state: 'running', port: r.port });
      return r?.success ?? false;
    } catch {
      setConnectionVerified(false);
      return false;
    }
  }, [initGateway, setStatus]);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hostApiFetch<{ nodes?: NodeItem[] }>('/api/nodes').catch(() => ({}));
      setNodes(Array.isArray(data?.nodes) ? data.nodes : []);
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    void fetchNodes();
  }, [fetchNodes, isOnline]);

  const filteredNodes = nodes.filter(
    (n) =>
      !search ||
      (n.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (n.id ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (n.type ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNode = async () => {
    if (!addForm.name.trim()) return;
    setAddSubmitting(true);
    try {
      const res = await hostApiFetch<{ success?: boolean; error?: string }>('/api/nodes', {
        method: 'POST',
        body: JSON.stringify({ ...addForm, id: addForm.name.toLowerCase().replace(/\s+/g, '-') }),
      });
      if (res?.success) {
        setAddModalOpen(false);
        setAddForm({ name: '', type: 'worker', ip: '127.0.0.1', port: 18789 });
        void fetchNodes();
      } else {
        console.error(res?.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleRemoveNode = async (nodeId: string) => {
    if (nodeId === 'local-gateway') return;
    try {
      const res = await hostApiFetch<{ success?: boolean }>(`/api/nodes/${encodeURIComponent(nodeId)}`, {
        method: 'DELETE',
      });
      if (res?.success) {
        setSelectedNode(null);
        void fetchNodes();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const statusLabel = (s?: string) => {
    if (s === 'online' || s === 'healthy' || s === 'Running') return t('nodes.statusOnline', { defaultValue: 'online' });
    if (s === 'offline' || s === 'disconnected') return t('nodes.statusOffline', { defaultValue: 'offline' });
    return s || t('nodes.statusUnknown', { defaultValue: 'unknown' });
  };

  const statusColor = (s?: string) => {
    if (s === 'online' || s === 'healthy' || s === 'Running') return 'bg-emerald-400';
    if (s === 'offline' || s === 'disconnected') return 'bg-slate-500';
    return 'bg-amber-400';
  };

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="flex flex-col h-full py-6 px-4 overflow-y-auto min-h-0">
        {/* 头部 */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">{t('nodes.title')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('nodes.subtitle')}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 rounded text-xs bg-teal-500/20 text-teal-400">{t('nodes.badges.multiNode')}</span>
              <span className="px-2 py-0.5 rounded text-xs bg-teal-500/20 text-teal-400">{t('nodes.badges.monitoring')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 pr-3 py-2 rounded-lg bg-[#1e293b] border border-slate-600/50 text-sm text-foreground placeholder:text-muted-foreground w-48"
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-teal-500/40"
              onClick={() => void checkConnection().then(() => fetchNodes())}
              disabled={loading}
            >
              <Activity className="h-4 w-4" />
              {t('nodes.healthCheck')}
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 border border-teal-500/40"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t('nodes.addNode')}
            </Button>
          </div>
        </div>

        {!isOnline && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            {t('nodes.gatewayOfflineHint')}
          </div>
        )}

        {/* 节点列表表格 */}
        <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('nodes.columns.node')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('nodes.columns.type')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('nodes.columns.status')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('nodes.columns.address')}</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">{t('nodes.columns.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      {t('nodes.loading')}
                    </td>
                  </tr>
                ) : filteredNodes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-muted-foreground">
                      {t('nodes.empty')}
                    </td>
                  </tr>
                ) : (
                  filteredNodes.map((node) => (
                    <tr
                      key={node.id}
                      className={cn(
                        'border-b border-slate-700/30 hover:bg-slate-800/30 cursor-pointer transition-colors',
                        selectedNode?.id === node.id && 'bg-teal-500/10'
                      )}
                      onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                              node.status === 'online' || node.type === 'gateway' ? 'bg-teal-500/20' : 'bg-slate-500/20'
                            )}
                          >
                            {node.type === 'gateway' ? (
                              <Server className="w-4 h-4 text-teal-400" />
                            ) : (
                              <Cpu
                                className={cn(
                                  'w-4 h-4',
                                  node.status === 'online' ? 'text-teal-400' : 'text-slate-500'
                                )}
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{node.name || node.id}</div>
                            <div className="text-xs text-muted-foreground">{node.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {node.type === 'gateway' ? 'Gateway' : node.type || 'Worker'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={cn('w-2 h-2 rounded-full', statusColor(node.status))} />
                          {statusLabel(node.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground font-mono text-xs">
                        {node.ip && node.port ? `${node.ip}:${node.port}` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {node.id !== 'local-gateway' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(t('nodes.confirmRemove', { name: node.name || node.id }))) {
                                void handleRemoveNode(node.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 节点详情 */}
        {selectedNode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-medium text-foreground">{selectedNode.name || selectedNode.id}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedNode.ip && selectedNode.port
                      ? `ws://${selectedNode.ip}:${selectedNode.port}`
                      : selectedNode.id}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded text-xs',
                    selectedNode.status === 'online' || selectedNode.type === 'gateway'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-500/20 text-slate-400'
                  )}
                >
                  {statusLabel(selectedNode.status)}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('nodes.columns.type')}</span>
                  <span>{selectedNode.type === 'gateway' ? 'Gateway' : selectedNode.type || 'Worker'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('nodes.columns.address')}</span>
                  <span className="font-mono">
                    {selectedNode.ip && selectedNode.port ? `${selectedNode.ip}:${selectedNode.port}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('nodes.platform')}</span>
                  <span>{String(selectedNode.platform || selectedNode.metadata?.os || '—')}</span>
                </div>
                {selectedNode.lastSeen && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t('nodes.lastSeen')}</span>
                    <span>
                      {new Date(selectedNode.lastSeen).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
              <h3 className="font-medium text-foreground mb-2">{t('nodes.clusterTitle')}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t('nodes.clusterHint')}</p>
              <div className="flex flex-wrap gap-2">
                {nodes.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium',
                      n.id === selectedNode.id
                        ? 'bg-teal-500/30 text-teal-400 border border-teal-500/50'
                        : 'bg-slate-700/50 text-muted-foreground'
                    )}
                  >
                    {n.name || n.id}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 新增节点弹窗 */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="bg-[#1e293b] border-slate-600/50">
          <DialogHeader>
            <DialogTitle>{t('nodes.addNode')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('nodes.form.name')}</label>
              <input
                type="text"
                placeholder="agent-coder"
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-slate-600/50 text-foreground text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('nodes.form.type')}</label>
              <select
                value={addForm.type}
                onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-slate-600/50 text-foreground text-sm"
              >
                <option value="worker">Worker</option>
                <option value="controller">Controller</option>
                <option value="backup">Backup</option>
                <option value="observer">Observer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('nodes.form.ip')}</label>
              <input
                type="text"
                placeholder="127.0.0.1"
                value={addForm.ip}
                onChange={(e) => setAddForm((f) => ({ ...f, ip: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-slate-600/50 text-foreground text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">{t('nodes.form.port')}</label>
              <input
                type="number"
                placeholder="18789"
                value={addForm.port}
                onChange={(e) => setAddForm((f) => ({ ...f, port: parseInt(e.target.value, 10) || 18789 }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0f172a] border border-slate-600/50 text-foreground text-sm"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleAddNode}
              disabled={!addForm.name.trim() || addSubmitting}
            >
              {addSubmitting ? t('nodes.form.adding') : t('nodes.form.add')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { NodesView };
export default NodesView;
