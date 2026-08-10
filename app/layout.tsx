import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Openthropic — Multi-LLM Chat Platform",
  description: "Chat with multiple LLMs simultaneously. Compare responses from GPT-4o, Claude, Gemini, Llama and more — all in one place.",
  keywords: ["LLM", "AI", "chat", "GPT-4", "Claude", "Gemini", "OpenRouter"],
  openGraph: {
    title: "Openthropic — Multi-LLM Chat Platform",
    description: "Chat with multiple LLMs simultaneously. Compare responses side by side.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
