/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Force rebuild - timestamp: 2026-03-18T12:00:00
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
}

export default nextConfig
