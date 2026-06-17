import { SessionProvider } from "@/components/auth/SessionProvider";

export const dynamic = "force-dynamic";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen bg-background flex flex-col items-center px-4 pt-4">
        {children}
      </div>
    </SessionProvider>
  );
}
