export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="shell max-w-2xl">{children}</div>;
}
