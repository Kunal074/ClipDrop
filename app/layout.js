import './globals.css';

export const metadata = {
  metadataBase: new URL('https://clipdrop.online'),
  title: {
    default: 'ClipDrop — Universal Clipboard & File Sharing',
    template: '%s | ClipDrop',
  },
  description: 'Paste text, images, and files up to 1 GB across all your devices instantly. Real-time sync, auto-expiry, drop rooms, and 15+ free PDF & image tools.',
  keywords: [
    'clipboard sync', 'file sharing', 'cross-device clipboard', 'real-time sync',
    'drop room', 'paste images online', 'share files instantly', 'PDF tools',
    'image to PDF', 'free file sharing', 'clipdrop'
  ],
  authors: [{ name: 'ClipDrop' }],
  creator: 'ClipDrop',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://clipdrop.online',
    siteName: 'ClipDrop',
    title: 'ClipDrop — Universal Clipboard & File Sharing',
    description: 'Paste text, images, and files up to 1 GB across all your devices instantly. Real-time sync, auto-expiry, drop rooms, and 15+ free PDF & image tools.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ClipDrop — Universal Clipboard & File Sharing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClipDrop — Universal Clipboard & File Sharing',
    description: 'Paste text, images, and files across all your devices instantly.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
  },
  alternates: {
    canonical: 'https://clipdrop.online',
  },
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
