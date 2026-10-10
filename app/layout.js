import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { BOJE } from "../lib/brand";

// Fontovi iz knjige standarda (brand/tokens.json → fontovi)
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "Coffee Team — Servis",
  description: "Coffee Team · Servis · Kafa · Oprema — prijave kvarova, nalozi i magacin",
};

export const viewport = {
  themeColor: BOJE.povrsina,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="sr-Latn"
      className={`${manrope.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
