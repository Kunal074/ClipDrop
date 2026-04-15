import './globals.css';

export const metadata = {
  title: 'ClipDrop — Universal Clipboard & File Sharing',
  description: 'Paste text, images, and files up to 1 GB across all your devices instantly. Auto-expires. No friction.',
  keywords: 'clipboard sync, file sharing, cross-device, real-time, drop room',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
