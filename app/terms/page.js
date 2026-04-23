'use client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';

export default function TermsPage() {
  return (
    <AuthProvider>
      <div className="home-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ padding: '6rem 2rem 4rem', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%' }}>
        <h1 style={{ marginBottom: '2rem' }}>Terms of Service</h1>
        <div className="card">
          <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>Last updated: {new Date().getFullYear()}</p>
          <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
            By using ClipDrop, you agree not to use the service for any illegal or abusive behavior.
          </p>
          <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
            While we strive for 100% uptime, ClipDrop is provided "as is" and we are not liable for any lost clips or files. Please ensure you have backups of critical data before relying solely on a temporary clipboard.
          </p>
        </div>
      </main>
      <Footer />
    </div>
    </AuthProvider>
  );
}
