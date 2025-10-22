/** @type {import('next').NextConfig} */
const nextConfig = {
  // 忽略 TypeScript 构建错误
  typescript: {
    ignoreBuildErrors: true, // [!code ++]
  },
  // 忽略 ESLint 构建错误
  eslint: {
    ignoreDuringBuilds: true, // [!code ++]
  },
}

module.exports = nextConfig
