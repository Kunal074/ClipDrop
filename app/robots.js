export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',      // Don't index internal APIs
        '/room/',     // Don't index private drop rooms
        '/dashboard'  // Don't index user dashboards
      ],
    },
    sitemap: 'https://clipdrop.online/sitemap.xml',
  }
}
