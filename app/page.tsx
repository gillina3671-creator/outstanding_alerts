import Link from "next/link";

export default function Home() {
  return (
    <main>
      <header>
        <h1>Outstanding Alerts</h1>
        <p>Use the link below to open overdue receivables.</p>
      </header>
      <div className="card">
        <p>
          <Link href="/overdue">Open Overdue Page</Link>
        </p>
        <p>
          If token is enabled, open <code>/overdue?token=YOUR_TOKEN</code>
        </p>
      </div>
    </main>
  );
}
