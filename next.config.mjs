/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs']
  },
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build',
  },
  // Properly handle dynamic routes
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Prevent static optimization for pages that use dynamic imports
  staticPageGenerationTimeout: 60,
  // Configure static generation
  generateBuildId: async () => {
    return 'player-tracker-build'
  }
}

export default nextConfig