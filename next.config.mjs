/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs']
  },
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build',
  },
  // Ignore build errors during static generation for API routes
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  }
}

export default nextConfig