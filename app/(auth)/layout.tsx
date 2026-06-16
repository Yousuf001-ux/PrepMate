import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Link
        href="/"
        className="text-primary"
        style={{
          fontSize: "var(--font-headline-headline-small-font-size)",
          letterSpacing: "var(--font-headline-headline-medium-letter-spacing)",
          position: "absolute",
          top: 16,
          left: 40,
        }}
      >
        PrepMate AI
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
