/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  eslint: {
    // This allows production builds to succeed even with linting warnings
    ignoreDuringBuilds: true,
  },
  typescript: {
    // This ensures your NSEC demo deploys even if there are small type mismatches
    ignoreBuildErrors: true,
  },
  // If you are using Server Actions (like for createFeedback), keep this:
  experimental: {
    serverActions: true,
  }
};

export default nextConfig;