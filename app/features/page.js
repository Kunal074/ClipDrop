'use client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';

export default function FeaturesPage() {
  return (
    <AuthProvider>
      <div className="home-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ padding: '6rem 2rem 4rem', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%' }}>
        <h1 style={{ marginBottom: '2rem' }}>Use Cases & Features</h1>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3>✦ Universal Clipboard</h3>
            <p style={{ color: 'var(--text-2)' }}>Copy on your phone, paste on your desktop instantly without any apps installed.</p>
          </div>
          <div>
            <h3>✦ Drop Rooms</h3>
            <p style={{ color: 'var(--text-2)' }}>Create temporary 6-digit rooms for seamless team file sharing. Rooms expire securely.</p>
          </div>
          <div>
            <h3>✦ 1GB File Uploads</h3>
            <p style={{ color: 'var(--text-2)' }}>Upload massive files directly to your Google Drive—completely bypassing storage limits.</p>
          </div>
          <div>
            <h3>✦ Built-in Tools</h3>
            <p style={{ color: 'var(--text-2)' }}>Access AI summaries, OCR image-to-text, code formatting, and 15+ PDF conversion tools.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </AuthProvider>
  );
}
