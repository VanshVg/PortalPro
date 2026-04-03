import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@portalpro/ui";
import Image from "next/image";

export default function LoginPage() {
  return (
    <Card className="shadow-modal">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo-icon.png" alt="PortalPro" width={48} height={48} priority />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your agency dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-neutral-700">
            Email
          </label>
          <Input id="email" type="email" placeholder="you@agency.com" />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-neutral-700">
            Password
          </label>
          <Input id="password" type="password" placeholder="Enter your password" />
        </div>
        <Button className="w-full" size="lg">
          Sign In
        </Button>
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-neutral-500">Or continue with</span>
          </div>
        </div>
        <Button variant="outline" className="w-full">
          Send Magic Link
        </Button>
        <p className="text-center text-xs text-neutral-500">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-primary hover:underline">
            Create workspace
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
