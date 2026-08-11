import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : undefined;

  return {
    title: "青学笃行｜青年学习｜中国银行益阳分行",
    description: "思想之光照亮奋进之路，理论学习筑牢青年根基。中国银行益阳分行青年理论学习主题栏目。",
    applicationName: "青学笃行",
    icons: {
      icon: "/boc-logo.jpg",
      shortcut: "/boc-logo.jpg",
    },
    openGraph: {
      type: "website",
      title: "青学笃行｜青年学习",
      description: "思想之光照亮奋进之路，理论学习筑牢青年根基。",
      images: origin ? [{ url: `${origin}/og.jpg`, width: 1200, height: 800, alt: "青学笃行｜青年学习" }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: "青学笃行｜青年学习",
      description: "学思用贯通，知信行统一。",
      images: origin ? [`${origin}/og.jpg`] : undefined,
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
