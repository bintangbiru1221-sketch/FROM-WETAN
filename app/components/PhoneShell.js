import Sidebar from './Sidebar';

// Catatan: nama file/komponen ini sengaja dipertahankan "PhoneShell" supaya
// semua page.js yang sudah ada (import { ... } from '../components/PhoneShell')
// tidak perlu diubah satu-satu. Tapi sekarang isinya BUKAN bingkai HP lagi —
// ini app shell responsif sungguhan: sidebar di desktop, bottom nav di mobile.
export default function PhoneShell({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-area">
        {children}
      </div>
    </div>
  );
}
