import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gutermann Color Matcher",
  description: "Browse Gutermann thread colors and find close thread matches from a picked color."
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
