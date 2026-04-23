'use client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';

export default function FAQPage() {
  return (
    <AuthProvider>
      <div className="home-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ padding: '6rem 2rem 4rem', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%' }}>
        <h1 style={{ marginBottom: '2rem' }}>Help Center / FAQ</h1>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <h3>Is ClipDrop completely free?</h3>
            <p style={{ color: 'var(--text-2)' }}>Yes! All standard clipboard features, rooms, and tools are entirely free to use.</p>
          </div>
          <div>
            <h3>How do files up to 1GB work?</h3>
            <p style={{ color: 'var(--text-2)' }}>If you link your Google account, massive files are uploaded directly to your own Google Drive.</p>
          </div>
          <div>
            <h3>Are my clips secure?</h3>
            <p style={{ color: 'var(--text-2)' }}>Clips in shared rooms expire automatically. Your personal workspace clips are private to your account.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
    </AuthProvider>
  );
}
