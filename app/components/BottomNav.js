import Link from 'next/link';

const ITEMS = [
  { href: '/dashboard', icon: 'ti-layout-dashboard', label: 'Home' },
  { href: '/contacts', icon: 'ti-users', label: 'Kontak' },
  { href: '/campaign', icon: 'ti-plus', label: 'Campaign' },
  { href: '/sender', icon: 'ti-mail', label: 'Sender' },
  { href: '/profile', icon: 'ti-user', label: 'Profil' },
];

export default function BottomNav({ active }) {
  return (
    <div className="bnav">
      {ITEMS.map((item) => (
        <Link key={item.href} href={item.href} className={`bni ${active === item.href ? 'on' : ''}`}>
          <i className={`ti ${item.icon}`} aria-hidden="true"></i>
          <span>{item.label}</span>
        </Link>
      ))}
    </div>
  );
}
