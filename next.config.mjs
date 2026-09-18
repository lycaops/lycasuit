/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  transpilePackages: ["recharts", "d3", "topojson-client"],
}
export default nextConfig
