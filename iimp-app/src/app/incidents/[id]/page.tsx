import Link from "next/link";

// Stub detail page — full implementation coming later
export default function IncidentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Link
            href="/"
            className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            Incident {params.id}
          </h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-12 text-center">
        <p className="text-gray-500 text-sm">
          Detail page for <span className="font-mono font-medium">{params.id}</span> — coming soon.
        </p>
      </main>
    </div>
  );
}
