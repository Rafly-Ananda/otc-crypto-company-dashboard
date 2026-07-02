import { AlertTriangle, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useData } from '@/components/data-provider';

export function SyncStatusBanner() {
  const { source, syncing, lastSyncTime, syncError } = useData();

  // Show nothing if source is 'uploaded' (not synced from sheet)
  if (source === 'uploaded') return null;

  // Empty dataset warning
  if (source === 'empty') {
    return (
      <div className="border-b border-border bg-card/50 px-4 py-3 sm:px-6 sm:py-3.5">
        <div className="mx-auto max-w-screen-2xl">
          <div className="flex items-center gap-3 rounded-lg border border-otc-loss/30 bg-otc-loss/10 px-3.5 py-2.5">
            <AlertTriangle size={16} className="shrink-0 text-otc-loss" />
            <p className="text-xs text-foreground font-medium">
              {syncError === 'Sheet not configured'
                ? 'Google Sheet not configured. Please add environment variables to enable sync.'
                : 'Empty dataset. No data available from Google Sheet.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Sheet sync status
  return (
    <div className="border-b border-border bg-card/50 px-4 py-3 sm:px-6 sm:py-3.5">
      <div className="mx-auto max-w-screen-2xl">
        <div className={`flex items-center justify-between rounded-lg border px-3.5 py-2.5 text-xs ${
          syncError
            ? 'border-otc-loss/30 bg-otc-loss/10'
            : 'border-otc-volume/30 bg-otc-volume/10'
        }`}>
          <div className="flex items-center gap-3">
            {syncing ? (
              <Loader2 size={14} className="animate-spin text-otc-volume shrink-0" />
            ) : syncError ? (
              <AlertCircle size={14} className="text-otc-loss shrink-0" />
            ) : (
              <CheckCircle2 size={14} className="text-otc-profit shrink-0" />
            )}
            <div>
              <p className={`font-medium ${syncError ? 'text-otc-loss' : 'text-otc-profit'}`}>
                {syncing ? 'Syncing...' : syncError ? 'Sync error' : 'Synced'}
              </p>
              {lastSyncTime && !syncing && (
                <p className="text-[10px] text-muted-foreground">
                  Last sync: {lastSyncTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>
          {syncError && (
            <p className="text-[10px] text-otc-loss ml-4">{syncError}</p>
          )}
        </div>
      </div>
    </div>
  );
}
