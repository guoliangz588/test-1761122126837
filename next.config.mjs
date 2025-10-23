// next.config.mjs

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  // 忽略 TypeScript 构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  // 忽略 ESLint 构建错误  
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
