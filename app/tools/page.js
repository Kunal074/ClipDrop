'use client';
import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/components/AuthProvider';
import { ToastProvider, ToastContainer } from '@/components/Toast';

export default function ToolsDashboard() {
  const [searchQuery, setSearchQuery] = useState('');

  const toolCategories = [
    {
      name: 'Organize PDF',
      tools: [
        { name: 'Merge PDF', slug: 'merge-pdf', icon: '🔗', desc: 'Combine multiple PDFs into one file' },
        { name: 'Split PDF', slug: 'split-pdf', icon: '✂️', desc: 'Separate one page or a whole set for easy conversion' },
        { name: 'Remove Pages', slug: 'remove-pages', icon: '🗑️', desc: 'Remove pages from a PDF document' },
        { name: 'Rotate PDF', slug: 'rotate-pdf', icon: '↻', desc: 'Rotate your PDFs the way you need them' },
      ],
    },
    {
      name: 'Edit PDF',
      tools: [
        { name: 'Add Watermark', slug: 'add-watermark', icon: '©️', desc: 'Stamp an image or text over your PDF' },
        { name: 'Add Page Numbers', slug: 'add-page-numbers', icon: '🔢', desc: 'Add page numbers into PDFs with ease' },
      ],
    },
    {
      name: 'Convert To PDF',
      tools: [
        { name: 'Word to PDF', slug: 'word-to-pdf', icon: '📝', desc: 'Make DOC and DOCX files easy to read by converting them', keywords: 'doc to pdf docx to pdf office to pdf document to pdf' },
        { name: 'PowerPoint to PDF', slug: 'powerpoint-to-pdf', icon: '📊', desc: 'Make PPT and PPTX slideshows easy to view by converting them', keywords: 'ppt to pdf pptx to pdf presentation to pdf office to pdf' },
        { name: 'Excel to PDF', slug: 'excel-to-pdf', icon: '📈', desc: 'Make EXCEL spreadsheets easy to read by converting them', keywords: 'xls to pdf xlsx to pdf spreadsheet to pdf office to pdf' },
        { name: 'JPG to PDF', slug: 'jpg-to-pdf', icon: '🖼️', desc: 'Convert JPG images to PDF in seconds', keywords: 'image to pdf photo to pdf picture to pdf jpeg to pdf' },
        { name: 'PNG to PDF', slug: 'png-to-pdf', icon: '🏞️', desc: 'Convert PNG images to PDF in seconds', keywords: 'image to pdf photo to pdf picture to pdf' },
      ],
    },

    {
      name: 'Image Tools',
      tools: [
        { name: 'Resize Image', slug: 'resize-image', icon: '📐', desc: 'Resize images by defining pixels or percentages' },
        { name: 'Compress Image', slug: 'compress-image', icon: '🗜️', desc: 'Compress JPG, PNG or GIF with the best quality' },
        { name: 'SVG to Image', slug: 'svg-to-image', icon: '🔄', desc: 'Convert vector SVG to JPG or PNG' },
        { name: 'Image to SVG', slug: 'image-to-svg', icon: '✏️', desc: 'Trace image to vector SVG format' },
      ],
    },
  ];

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="home-page">
          <Navbar />
          <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>
                All <span className="gradient-text">Tools</span>
              </h1>
              <p style={{ color: 'var(--text-2)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
                Free, fast, and secure tools to manipulate your files. 
                Most tools run directly in your browser without uploading to any server!
              </p>
              
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <input
                  type="text"
                  placeholder="Search tools... (e.g., 'merge', 'image')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', fontSize: '1.1rem', padding: '1rem', borderRadius: '50px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
              </div>
            </div>

            {toolCategories.map((category) => {
              const filteredTools = category.tools.filter(tool => {
                const query = searchQuery.toLowerCase();
                return tool.name.toLowerCase().includes(query) || 
                       tool.desc.toLowerCase().includes(query) ||
                       (tool.keywords && tool.keywords.toLowerCase().includes(query));
              });

              if (filteredTools.length === 0) return null;

              return (
                <section key={category.name} style={{ marginBottom: '4rem' }}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--text-1)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem' }}>
                    {category.name}
                  </h2>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '1.5rem'
                  }}>
                    {filteredTools.map((tool) => (
                      <Link href={`/tools/${tool.slug}`} key={tool.slug} style={{ textDecoration: 'none' }}>
                        <div className="card feature-card" style={{ height: '100%', transition: 'transform 0.2s, background 0.2s', cursor: 'pointer' }}>
                          <div className="feature-icon" style={{ fontSize: '2rem', marginBottom: '1rem' }}>{tool.icon}</div>
                          <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-1)' }}>{tool.name}</h3>
                          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.4 }}>{tool.desc}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              );
            })}

            {toolCategories.every(c => c.tools.filter(t => {
              const query = searchQuery.toLowerCase();
              return t.name.toLowerCase().includes(query) || 
                     t.desc.toLowerCase().includes(query) ||
                     (t.keywords && t.keywords.toLowerCase().includes(query));
            }).length === 0) && (
              <div style={{ textAlign: 'center', color: 'var(--text-2)', marginTop: '4rem', fontSize: '1.2rem' }}>
                No tools found matching "{searchQuery}"
              </div>
            )}
          </main>
          <ToastContainer />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
