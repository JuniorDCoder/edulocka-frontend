import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WalletProvider } from "@/lib/wallet-context";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Edulocka — Blockchain-Verified Academic Credentials",
  description:
    "Secure, immutable, and transparent academic certificate verification on the blockchain. Issue and verify credentials that can't be faked.",
  keywords: [
    "blockchain",
    "certificates",
    "academic",
    "verification",
    "web3",
    "ethereum",
    "education",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <WalletProvider>
            <div className="flex min-h-screen flex-col bg-background dark:bg-dark-bg">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </WalletProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
