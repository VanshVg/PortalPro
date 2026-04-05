export default function PortalAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
