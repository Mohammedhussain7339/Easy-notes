
import type { Metadata, Viewport } from "next";
import { Source_Serif_4, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const serif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Marginalia — Notes",
  description: "A quiet place to keep your notes.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F6F4EF",
};

const noFlashScript = `
(function() {
  try {
    var stored = localStorage.getItem('marginalia.theme.v2');
    var valid = ['minimalism','glassmorphism','neumorphism','dark-modern','material','aurora','paper'];
    var theme = valid.indexOf(stored) !== -1 ? stored : 'paper';
    document.documentElement.setAttribute('data-theme', theme);
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'paper');
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${serif.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>

      <body className="font-sans min-h-dvh">
        <Providers>
          <div className="mx-auto min-h-dvh w-full max-w-2xl md:max-w-3xl lg:max-w-4xl">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
