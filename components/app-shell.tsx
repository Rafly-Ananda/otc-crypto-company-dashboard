'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useData } from '@/components/data-provider';
import { SyncStatusBanner } from '@/components/sync-status-banner';
import { Upload, LayoutDashboard } from 'lucide-react';

const NAV = [
  { href: '/',       label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload Data', icon: Upload },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { summary, source, fileName } = useData();

  return (
    <div className="flex min-h-screen flex-col bg-background grid-bg">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:h-16 sm:px-6 lg:px-10">

          {/* Logo + brand */}
          <Link href="/" className="flex items-center gap-3">
            <Logo size={32} />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight text-foreground">
                OTC <span className="font-normal opacity-60">CRYPTO</span>
              </p>
              <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                PT Aliansi Koin Global
              </p>
            </div>
          </Link>

          {/* Centre: report identity */}
          <div className="hidden flex-col items-center md:flex">
            <p className="text-xs font-bold uppercase tracking-widest text-foreground">
              Simpllo &mdash; MNC Report
            </p>
            {source === 'sheet' ? (
              <p className="text-[10px] text-otc-volume">Live &mdash; Google Sheet</p>
            ) : source === 'uploaded' && fileName ? (
              <p className="text-[10px] text-otc-profit">{fileName}</p>
            ) : (
              <p className="text-[10px] text-muted-foreground">
                {summary.dateRange.start && summary.dateRange.end
                  ? `${summary.dateRange.start} \u2192 ${summary.dateRange.end}`
                  : 'Sample data'}
              </p>
            )}
          </div>

          {/* Right: nav + theme toggle */}
          <div className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-foreground/10 text-foreground'
                      : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
                  }`}
                >
                  <Icon size={13} />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
            <div className="ml-1 h-4 w-px bg-border" />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ── Sync status banner ──────────────────────────────────────────── */}
      <SyncStatusBanner />

      {/* ── Page content ────────────────────────────────────────────────── */}
      {children}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5 lg:px-10">
          <div className="flex items-center gap-2.5">
            <Logo size={20} />
            <span className="text-xs text-muted-foreground">
              PT Aliansi Koin Global &middot; Simpllo MNC
            </span>
          </div>
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/40">
            Confidential
          </span>
        </div>
      </footer>
    </div>
  );
}
