import { MotionProvider } from "@/components/motion-provider";
import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "VeriForge",
  description: "Private email list cleaning and correction",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
