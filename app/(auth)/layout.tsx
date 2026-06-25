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
        className="text-primary absolute top-4 left-10 max-sm:left-4"
        style={{
          fontSize: "var(--font-headline-headline-small-font-size)",
          letterSpacing: "var(--font-headline-headline-medium-letter-spacing)",
        }}
      >
        PrepMate
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
