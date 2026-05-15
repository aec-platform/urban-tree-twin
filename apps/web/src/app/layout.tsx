import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Urban Tree Twin',
  description:
    'Digital twin SaaS cho cây xanh đô thị — GIS, chấm sức khoẻ qua ảnh, dự báo nguy cơ đổ và lịch cắt tỉa.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
