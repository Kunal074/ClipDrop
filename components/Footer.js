import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid rgba(255,255,255,0.05)',
      background: '#0a0a0f',
      padding: '3rem 2rem 2rem',
      color: '#9ca3af',
      fontSize: '0.9rem',
      marginTop: 'auto'
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, auto))',
        justifyContent: 'center',
        gap: '5rem'
      }}>
        {/* Brand & Socials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '280px' }}>
          <h2 style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.5px' }}>
            ClipDrop
          </h2> 
          <p style={{ lineHeight: 1.6}}>
            Your universal cloud clipboard. Sync text, images, and files across all your devices instantly.
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {/* Instagram */}
            <a href="https://www.instagram.com/k.unal_sahu____/" target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', transition: 'color 0.2s' }} title="Instagram">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
            {/* LinkedIn */}
            <a href="https://www.linkedin.com/in/kunal-s-509065357" target="_blank" rel="noopener noreferrer" style={{ color: '#00d4ff', transition: 'color 0.2s' }} title="LinkedIn">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            {/* Twitter */}
            <a href="#" style={{ color: '#00d4ff', transition: 'color 0.2s' }} title="Twitter / X">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            </a>
            {/* GitHub */}
            <a href="#" style={{ color: '#00d4ff', transition: 'color 0.2s' }} title="GitHub">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
            </a>
            {/* Email */}
            <a href="mailto:clipdrop79@gmail.com" style={{ color: '#00d4ff', transition: 'color 0.2s' }} title="Email Us">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </a>
          </div>
        </div>

        {/* Product / Why Choose Us */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'flex-start' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 500 }}>Product</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', justifyContent: 'flex-start' }}>
            <li><Link href="/dashboard" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Personal Workspace</Link></li>
            <li><a href="#" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Chrome Extension</a></li>
            <li><a href="/features" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Use Cases & Features</a></li>
            <li style={{ color: '#10b981', fontWeight: 500 }}>✓ Free 1GB File Uploads</li>
            <li style={{ color: '#10b981', fontWeight: 500 }}>✓ Auto-Expiring Rooms</li>
          </ul>
        </div>

        {/* Free Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'flex-start' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 500 }}>Free Tools</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', justifyContent: 'flex-start' }}>
            <li><a href="/tools/word-to-pdf" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Word to PDF</a></li>
            <li><a href="/tools/excel-to-pdf" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Excel to PDF</a></li>
            <li><a href="/tools/jpg-to-pdf" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Image to PDF</a></li>
            <li><a href="/tools/compress-image" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Image Compressor</a></li>
            <li><a href="/tools/add-watermark" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Add Watermark</a></li>
          </ul>
        </div>

        {/* Support & Legal */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'flex-start' }}>
          <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 500 }}>Support & Legal</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', justifyContent: 'flex-start' }}>
            <li><a href="mailto:clipdrop79@gmail.com?subject=Feedback" className="footer-link" style={{ color: '#00d4ff', textDecoration: 'none', fontWeight: 500 }}>Send Feedback 💡</a></li>
            <li><a href="/faq" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Help Center / FAQ</a></li>
            <li><a href="/privacy" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a></li>
            <li><a href="/terms" className="footer-link" style={{ color: 'inherit', textDecoration: 'none' }}>Terms of Service</a></li>
          </ul>
        </div>
      </div>

      <div style={{
        maxWidth: 1200,
        margin: '3rem auto 0',
        paddingTop: '2rem',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.5rem',
        textAlign: 'center'
      }}>
        <p style={{ margin: 0 }}>&copy; {new Date().getFullYear()} ClipDrop. All rights reserved.</p>
        <p style={{ margin: 0, fontSize: '0.8rem' }}>Made with ❤️ by Kunal</p>
      </div>

      <style jsx>{`
        .footer-link:hover {
          color: #00d4ff !important;
        }
      `}</style>
    </footer>
  );
}
