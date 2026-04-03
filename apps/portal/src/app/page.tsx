import { Card, CardContent, CardHeader, CardTitle, Button } from "@portalpro/ui";
import Image from "next/image";

export default function PortalHomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
        <Image src="/logo-full.png" alt="PortalPro" width={120} height={30} priority />
        <Button variant="ghost" size="sm">
          Sign In
        </Button>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Your Portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-neutral-500">
              Track your project progress, review deliverables, and communicate with your agency — all in one place.
            </p>
            <Button size="lg">Sign In to Continue</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
