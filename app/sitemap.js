export default function sitemap() {
  const baseUrl = 'https://clipdrop.online';

  // Core pages
  const routes = [
    { path: '', priority: 1, changeFrequency: 'always' },
    { path: '/login', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/register', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/dashboard', priority: 0.5, changeFrequency: 'daily' },
  ];

  // Tool pages
  const tools = [
    'add-page-numbers',
    'add-watermark',
    'compress-image',
    'compress-pdf',
    'excel-to-pdf',
    'extract-pdf-pages',
    'image-to-pdf',
    'image-to-svg',
    'merge-pdf',
    'office-to-pdf',
    'organize-pdf',
    'pdf-to-jpg',
    'powerpoint-to-pdf',
    'remove-pages',
    'word-to-pdf'
  ];

  const toolRoutes = tools.map((tool) => ({
    path: `/tools/${tool}`,
    priority: 0.9,
    changeFrequency: 'weekly',
  }));

  const allRoutes = [...routes, ...toolRoutes];

  return allRoutes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
