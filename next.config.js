/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: { unoptimized: true },
  basePath: '/eldoria-utilities-web',
  assetPrefix: '/eldoria-utilities-web/',
  trailingSlash: true
};

module.exports = nextConfig;
