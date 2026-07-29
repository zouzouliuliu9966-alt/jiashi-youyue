import type { NextConfig } from "next";

const TEACHER_HOST = "teacher.jiashiyouyue.com";

const nextConfig: NextConfig = {
  async rewrites() {
    // 必须放 beforeFiles：rewrites() 直接返回数组时规则是在匹配完文件系统之后才跑的，
    // 而 "/" 命中了真实存在的首页，重写永远轮不到。beforeFiles 才能覆盖已有页面。
    return {
      beforeFiles: [
        // teacher.jiashiyouyue.com 打开就是招募页。
        // 只重写根路径，其它路径照常走（teacher.jiashiyouyue.com/teacher/login 也能用）
        {
          source: "/",
          destination: "/laoshi",
          has: [{ type: "host", value: TEACHER_HOST }],
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async redirects() {
    return [
      // 招募页正式地址是 /laoshi（主域名下）。
      // /join 是最早发出去的地址，/t 是更短的备用，都永久跳到 /laoshi，
      // 这样已经发到教师群里的旧链接不会失效。
      { source: "/join", destination: "/laoshi", permanent: true },
      { source: "/t", destination: "/laoshi", permanent: true },
    ];
  },
};

export default nextConfig;
