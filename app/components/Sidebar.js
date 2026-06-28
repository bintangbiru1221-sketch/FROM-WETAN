'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/dashboard', icon: 'ti-layout-dashboard', label: 'Dashboard' },
  { href: '/contacts', icon: 'ti-users', label: 'Contacts' },
  { href: '/campaign', icon: 'ti-plus', label: 'Campaign' },
  { href: '/sender', icon: 'ti-mail', label: 'Sender Accounts' },
  { href: '/templates', icon: 'ti-template', label: 'Templates' },
  { href: '/logs', icon: 'ti-history', label: 'Logs' },
  { href: '/billing', icon: 'ti-credit-card', label: 'Billing' },
  { href: '/profile', icon: 'ti-user', label: 'Profil' },
  { href: '/settings', icon: 'ti-settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-box"><i className="ti ti-send" aria-hidden="true"></i></div>
        <span className="logo-name">WETAN GANG</span>
      </div>
      <div className="sidebar-nav">
        {ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link key={item.href} href={item.href} className={`sidebar-item ${isActive ? 'on' : ''}`}>
              <i className={`ti ${item.icon}`} aria-hidden="true"></i>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
