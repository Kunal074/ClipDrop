'use client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/components/AuthProvider';

export default function PrivacyPage() {
  return (
    <AuthProvider>
      <div className="home-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ padding: '6rem 2rem 4rem', maxWidth: '800px', margin: '0 auto', flex: 1, width: '100%' }}>
        <h1 style={{ marginBottom: '2rem' }}>Privacy Policy</h1>
        <div className="card">
          <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>Last updated: {new Date().getFullYear()}</p>
          <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
            We take your privacy seriously. Your clipboard data is encrypted during transit. 
            Clips in temporary Drop Rooms are automatically deleted based on expiration policies.
          </p>
          <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>
            We do not sell your personal data. We use secure cloud databases (Neon/PostgreSQL) and connect directly to your Google Drive for large files to ensure we don't hold your heavy data.
          </p>
        </div>
      </main>
      <Footer />
    </div>
    </AuthProvider>
  );
}
