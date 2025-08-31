const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || 'http://localhost:' + PORT;
const BRAND = 'DuckRetro';
const VALUE_PROP = 'Vintage duck collectibles';
const HOME_DESCRIPTION = 'DuckRetro — your source for vintage duck collectibles and memorabilia.';
const HERO_IMAGE = 'https://via.placeholder.com/1200x630.png?text=DuckRetro';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const products = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'));

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// middleware for non-public paths to add noindex
const NOINDEX_PATHS = ['/cart', '/checkout', '/orders', '/api', '/auth', '/admin'];
app.use(NOINDEX_PATHS, (req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  next();
});

app.get('/', (req, res) => {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/p/${p.slug}`
    }))
  };
  res.render('home', {
    brand: BRAND,
    valueProp: VALUE_PROP,
    homeDescription: HOME_DESCRIPTION,
    heroImage: HERO_IMAGE,
    baseUrl: BASE_URL,
    products,
    itemListJson: JSON.stringify(itemList)
  });
});

// Alias by numeric ID -> redirect to slug
app.get('/p/:id(\\d+)', (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (product) {
    res.redirect(301, `/p/${product.slug}`);
  } else {
    res.status(404).send('Not found');
  }
});

app.get('/p/:slug', (req, res) => {
  const product = products.find(p => p.slug === req.params.slug);
  if (!product) {
    return res.status(404).send('Product not found');
  }
  const description = truncate(product.seoDescription || product.description, 160);
  const productJson = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image,
    description: product.description,
    sku: product.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: product.currency,
      availability: `https://schema.org/${product.availability}`,
      url: `${BASE_URL}/p/${product.slug}`
    }
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: BRAND, item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: product.name, item: `${BASE_URL}/p/${product.slug}` }
    ]
  };
  res.render('product', {
    brand: BRAND,
    product,
    description,
    baseUrl: BASE_URL,
    productJsonLd: JSON.stringify(productJson),
    breadcrumbJson: JSON.stringify(breadcrumb)
  });
});

// robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nAllow: /\nAllow: /p/\nDisallow: /cart\nDisallow: /checkout\nDisallow: /orders\nDisallow: /api/\nDisallow: /auth/\nDisallow: /admin/\nSitemap: ${BASE_URL}/sitemap.xml`);
});

// sitemap.xml
app.get('/sitemap.xml', (req, res) => {
  const urls = [
    `<url><loc>${BASE_URL}/</loc><lastmod>${new Date().toISOString()}</lastmod></url>`,
    ...products.map(p => `<url><loc>${BASE_URL}/p/${p.slug}</loc><lastmod>${new Date().toISOString()}</lastmod></url>`)
  ];
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="https://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`);
});

app.listen(PORT, () => {
  console.log(`Server running at ${BASE_URL}`);
});
