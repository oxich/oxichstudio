import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: 'OxichStudio - Professional Web Server Development',
  description: 'Standalone web server development platform with desktop controller',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
