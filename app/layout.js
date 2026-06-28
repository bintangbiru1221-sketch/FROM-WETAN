import './styles/style.css';
import './styles/icons.css';

export const metadata = {
  title: 'WETAN GANG — Broadcast Email Premium',
  description: 'Kelola hingga 5 akun Gmail, broadcast email bertahap, dan pantau real-time dari satu dashboard.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
