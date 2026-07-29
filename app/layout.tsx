import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const SITE_URL = "https://www.jiashiyouyue.com";
const TITLE = "家师有约 — 严选南京家教";
const DESCRIPTION = "严选南京家教，教务一对一匹配。持证教师 · 免费匹配 · 不满意可换老师。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s | 家师有约",
  },
  description: DESCRIPTION,
  // 微信/QQ 里粘贴链接时靠这组标签渲染成卡片（图 + 标题 + 描述），
  // 没有的话只显示一行光秃秃的网址
  openGraph: {
    type: "website",
    siteName: "家师有约",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "zh_CN",
    images: [
      // 微信会把卡片图裁成正方形，所以正文内容都收在图片中间的正方形区域内
      { url: "/og-image.png", width: 1200, height: 630, alt: "家师有约 — 严选南京家教" },
      { url: "/og-square.png", width: 800, height: 800, alt: "家师有约" },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "家师有约",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      style={{ colorScheme: "light" }}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
