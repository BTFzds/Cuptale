export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="shell max-w-2xl px-5 pt-6 pb-12 sm:px-6">
      {children}
    </div>
  );
}
