'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navigation = [
  { label: 'Dashboard', href: '/dashboard', marker: 'DB' },
  { label: 'Forecast', href: '/forecast', marker: 'FC' },
  { label: 'Peak Prediction', href: '/peak-prediction', marker: 'PP' },
  { label: 'AI Explanation', href: '/ai-explanation', marker: 'AI' },
  { label: 'Recommendations', href: '/recommendations', marker: 'RE' },
  { label: 'Alerts', href: '/alerts', marker: 'AL' },
  { label: 'Analytics', href: '/analytics', marker: 'AN' },
  { label: 'Datasets', href: '/datasets', marker: 'DS' },
  { label: 'Model Training', href: '/model-training', marker: 'MT' },
  { label: 'Model Comparison', href: '/model-comparison', marker: 'MC' },
  { label: 'Research', href: '/research', marker: 'RS' },
  { label: 'Reports', href: '/reports', marker: 'RP' }
];

const accountNavigation = [
  { label: 'Profile', href: '/profile', marker: 'PR' },
  { label: 'Settings', href: '/settings', marker: 'ST' },
  { label: 'Admin Panel', href: '/admin', marker: 'AD' }
];

function NavigationLink({ label, href, marker, onNavigate }: { label: string; href: string; marker: string; onNavigate: () => void }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link className={`navigation-link${active ? ' navigation-link-active' : ''}`} href={href} onClick={onNavigate}>
      <span className="navigation-marker" aria-hidden="true">{marker}</span>
      <span>{label}</span>
    </Link>
  );
}

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="app-frame">
      <button className="mobile-menu-button" type="button" onClick={() => setSidebarOpen(true)} aria-label="Open navigation">
        <span />
        <span />
        <span />
      </button>
      {sidebarOpen && <button className="sidebar-backdrop" type="button" onClick={closeSidebar} aria-label="Close navigation" />}
      <aside className={`app-sidebar${sidebarOpen ? ' app-sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">GS</span>
          <span>
            <strong>GridSense</strong>
            <small>Delhi power grid</small>
          </span>
          <button className="sidebar-close-button" type="button" onClick={closeSidebar} aria-label="Close navigation">×</button>
        </div>
        <div className="navigation-group">
          <p className="navigation-heading">Operations</p>
          {navigation.map((item) => <NavigationLink key={item.href} {...item} onNavigate={closeSidebar} />)}
        </div>
        <div className="navigation-group navigation-account-group">
          <p className="navigation-heading">Account</p>
          {accountNavigation.map((item) => <NavigationLink key={item.href} {...item} onNavigate={closeSidebar} />)}
        </div>
        <div className="sidebar-status">
          <span className="status-indicator" />
          <span><strong>System online</strong><small>Forecast services ready</small></span>
        </div>
      </aside>
      <div className="app-content">
        <header className="app-header">
          <div>
            <p className="header-context">GridSense AI / Operations</p>
            <p className="header-location">Delhi Power Grid</p>
          </div>
          <div className="header-actions">
            <Link className="header-alert-link" href="/alerts">Alerts <span className="alert-count">3</span></Link>
            <Link className="user-menu" href="/profile"><span className="user-avatar">OP</span><span><strong>Grid Operator</strong><small>Operator account</small></span></Link>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
