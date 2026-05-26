"use client";

import { useMemo, useState } from "react";

type Customer = { ledger_name: string; credit_limit: string };
type Setting = { ledger_name: string; credit_limit: string; threshold_percent: string; overdue_days_threshold: number };

type Props = {
  companyId: string;
  accessToken: string;
  customers: Customer[];
  settings: Setting[];
  initialSearch?: string;
};

export default function CreditSettingsClient({ companyId, accessToken, customers, settings, initialSearch = "" }: Props) {
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [rows, setRows] = useState(() => {
    const map = new Map(settings.map((s) => [s.ledger_name.toLowerCase(), s]));
    return customers.map((c) => {
      const s = map.get(c.ledger_name.toLowerCase());
      return {
        ledger_name: c.ledger_name,
        credit_limit: s?.credit_limit || c.credit_limit || "0",
        threshold_percent: s?.threshold_percent || "90",
        overdue_days_threshold: String(s?.overdue_days_threshold || 1),
      };
    });
  });
  const [search, setSearch] = useState(initialSearch);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.ledger_name.toLowerCase().includes(q));
  }, [rows, search]);

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const res = await fetch("/api/credit-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, accessToken, rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setNotice(`Saved ${data.updated_count || 0} customers.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <p style={{ marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Search customer"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={saving}
          style={{ width: "100%", maxWidth: 460, padding: "8px 10px", borderRadius: 8, border: "1px solid #cfd8cf" }}
        />
      </p>
      <p style={{ marginBottom: 10 }}>
        <button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</button>
        {notice ? <span style={{ marginLeft: 10 }}>{notice}</span> : null}
      </p>
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Credit Limit (Rs)</th>
            <th>Alert Threshold %</th>
            <th>Overdue Days</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((row) => (
            <tr key={row.ledger_name}>
              <td>{row.ledger_name}</td>
              <td>
                {row.credit_limit}
              </td>
              <td>
                <input
                  type="text"
                  value={row.threshold_percent}
                  onChange={(e) => setRows((prev) => prev.map((p) => (p.ledger_name === row.ledger_name ? { ...p, threshold_percent: e.target.value } : p)))}
                  disabled={saving}
                />
              </td>
              <td>
                <input
                  type="text"
                  value={row.overdue_days_threshold}
                  onChange={(e) => setRows((prev) => prev.map((p) => (p.ledger_name === row.ledger_name ? { ...p, overdue_days_threshold: e.target.value } : p)))}
                  disabled={saving}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
