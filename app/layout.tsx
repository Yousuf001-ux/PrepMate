import type { Metadata } from "next";
import { manrope } from "@/lib/fonts";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrepMate AI — Smart Academic Study Planner",
  description: "Personalized, structured, and realistic study schedules powered by AI to help university and medical students succeed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <TooltipProvider delay={0}>
          {children}
        </TooltipProvider>
        <Toaster closeButton position="top-right" />
      </body>
    </html>
  );
}
