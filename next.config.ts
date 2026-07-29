import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // 教师招募页正式地址是 /laoshi。
      // /join 是最早发出去的地址，/t 是更短的备用，都永久跳到 /laoshi，
      // 这样已经发到教师群里的旧链接不会失效。
      { source: "/join", destination: "/laoshi", permanent: true },
      { source: "/t", destination: "/laoshi", permanent: true },
    ];
  },
};

export default nextConfig;
