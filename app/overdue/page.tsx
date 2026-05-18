import { headers } from "next/headers";
import OverdueClient from "./overdue-client";

type Outstanding = {
  customer_name: string;
  customer_number: string | number | null;
  invoicenumber: string;
  date: string;
  duedate: string | null;
  overdue_days: number | null;
  amount: string;
  closing_balance: string;
  voucher_type: string | null;
};

function num(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function getOverdueRows(limit: number): Promise<Outstanding[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

  const query = new URL(`${url}/rest/v1/outstanding`);
  query.searchParams.set("select", "customer_name,customer_number,invoicenumber,date,duedate,overdue_days,amount,closing_balance,voucher_type");
  query.searchParams.set("bill_type", "eq.receivable");
  query.searchParams.set("overdue_days", "gt.0");
  query.searchParams.set("order", "customer_name.asc,duedate.asc");
  query.searchParams.set("limit", String(limit));

  const res = await fetch(query.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Supabase fetch failed: ${res.status} ${txt.slice(0, 300)}`);
  }
  return (await res.json()) as Outstanding[];
}

export default async function OverduePage({ searchParams }: { searchParams: { limit?: string; token?: string } }) {
  const requiredToken = process.env.OVERDUE_PAGE_TOKEN;
  const providedToken = searchParams.token || "";
  if (requiredToken && providedToken !== requiredToken) {
    return (
      <main>
        <header>
          <h1>Unauthorized</h1>
          <p>Invalid or missing token.</p>
        </header>
      </main>
    );
  }
  const limit = Math.min(Math.max(Number(searchParams.limit || 5000), 1), 20000);
  const rows = await getOverdueRows(limit);
  const total = rows.reduce((acc, r) => acc + Number(r.closing_balance || 0), 0);
  const host = headers().get("host") || "localhost:3000";

  return (
    <main>
      <header>
        <h1>RoundALERTS</h1>
        <p>
          Showing {rows.length} overdue rows | Total due: Rs {num(total)} | Host: {host}
        </p>
      </header>
      <OverdueClient rows={rows} token={providedToken} />
    </main>
  );
}
