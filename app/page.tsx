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
          <Link href="/credit-settings">Open Credit Settings</Link>
        </p>
        <p>
          Open using a company link: <code>/overdue?access=COMPANY_TOKEN</code>
        </p>
        <p>
          Credit settings link: <code>/credit-settings?access=COMPANY_TOKEN</code>
        </p>
      </div>
    </main>
  );
}
