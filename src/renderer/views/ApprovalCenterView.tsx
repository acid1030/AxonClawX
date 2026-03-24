/**
 * AxonClaw - Approval Center
 * AxonClawX 风格：审批列表、详情、通过/拒绝
 * 需 OpenClaw Gateway 支持 approvals 相关 RPC
 */

import React, { useEffect, useState } from 'react';
import { FileCheck, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGatewayStore } from '@/stores/gateway';
import { PageHeader } from '@/components/common/PageHeader';
import { useTranslation } from 'react-i18next';

interface ApprovalItem {
  id: string;
  type?: string;
  title?: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

export const ApprovalCenterView: React.FC = () => {
  const { t } = useTranslation('approval');
  const gatewayStatus = useGatewayStore((s) => s.status);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isOnline = gatewayStatus.state === 'running';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isOnline) {
          const rpc = useGatewayStore.getState().rpc;
          const data = (await rpc('approvals.list').catch(() => ({ items: [] }))) as {
            items?: ApprovalItem[];
          };
          setItems(data?.items ?? []);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-[#0f172a]">
        <FileCheck className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">{t('title')}</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          {t('offlineHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0f172a]">
      <div className="w-full flex flex-col h-full py-6">
        <PageHeader
          title={t('title')}
          subtitle={t('subtitle')}
          stats={[{ label: t('pendingCount'), value: items.filter((i) => i.status === 'pending').length }]}
          statsBorderColor="border-indigo-500/40"
        />
      <div className="flex-1 overflow-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('emptyTitle')}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('emptyDesc')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title ?? item.id}</p>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        {t('approve')}
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/40 text-red-400">
                        <XCircle className="h-4 w-4 mr-1" />
                        {t('reject')}
                      </Button>
                    </>
                  )}
                  {item.status === 'approved' && (
                    <span className="text-xs text-emerald-400">{t('approved')}</span>
                  )}
                  {item.status === 'rejected' && (
                    <span className="text-xs text-red-400">{t('rejected')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default ApprovalCenterView;
