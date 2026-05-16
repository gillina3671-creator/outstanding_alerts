"use client";

import { useMemo, useState } from "react";

type Row = {
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

function formatNum(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "0.00";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function OverdueClient({ rows, token }: { rows: Row[]; token: string }) {
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [sending, setSending] = useState(false);
  const [sentRows, setSentRows] = useState<Record<number, boolean>>({});
  const [snackbar, setSnackbar] = useState<{ text: string; type: "success" | "error"; visible: boolean }>({
    text: "",
    type: "success",
    visible: false,
  });
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows.map((row, index) => ({ row, index }));
    return rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => {
        const customer = (row.customer_name || "").toLowerCase();
        const ref = (row.invoicenumber || "").toLowerCase();
        const phone = String(row.customer_number || "").toLowerCase();
        const voucherType = (row.voucher_type || "").toLowerCase();
        return customer.includes(q) || ref.includes(q) || phone.includes(q) || voucherType.includes(q);
      });
  }, [rows, search]);

  const rowsWithPhoneCount = useMemo(() => rows.filter((r) => getPhoneDigits(r.customer_number).length > 0).length, [rows]);
  const selectedIndexes = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k)),
    [selected]
  );

  function toggleAll(checked: boolean) {
    const next: Record<number, boolean> = {};
    filteredRows.forEach(({ index: i }) => {
      if (!sentRows[i]) next[i] = checked;
    });
    setSelected((prev) => ({ ...prev, ...next }));
  }

  function getPhoneDigits(value: string | number | null): string {
    if (value === null || value === undefined) return "";
    return String(value).replace(/\D/g, "");
  }

  function showSnackbar(text: string, type: "success" | "error") {
    setSnackbar({ text, type, visible: true });
    setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, visible: false }));
    }, 2500);
  }

  async function sendSelected() {
    if (selectedIndexes.length === 0) {
      showSnackbar("Select at least one customer row.", "error");
      return;
    }
    setSending(true);
    try {
      const payload = selectedIndexes.map((i) => rows[i]);
      const res = await fetch("/api/send-reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, rows: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to send reminders");
      const results = Array.isArray(data.results) ? data.results : [];
      const sentIndexMap: Record<number, boolean> = {};
      selectedIndexes.forEach((rowIndex, idx) => {
        const r = results[idx];
        if (r?.ok) sentIndexMap[rowIndex] = true;
      });
      setSentRows((prev) => ({ ...prev, ...sentIndexMap }));
      setSelected((prev) => {
        const next = { ...prev };
        Object.keys(sentIndexMap).forEach((k) => {
          next[Number(k)] = false;
        });
        return next;
      });
      if ((data.failed_count || 0) === 0 && (data.sent_count || 0) > 0) {
        showSnackbar(`Success: ${data.sent_count} reminder${data.sent_count > 1 ? "s" : ""} sent.`, "success");
      } else if ((data.sent_count || 0) > 0) {
        showSnackbar(`Partially sent: ${data.sent_count} sent, ${data.failed_count} failed.`, "success");
      } else {
        showSnackbar(`No reminders sent. Failed: ${data.failed_count || 0}.`, "error");
      }
    } catch (err) {
      showSnackbar(err instanceof Error ? err.message : "Failed to send reminders", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 12 }}>
        <p>
          Rows with customer number: {rowsWithPhoneCount} | Selected: {selectedIndexes.length}
        </p>
        <p style={{ marginTop: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer / ref no / phone / voucher type"
            disabled={sending}
            style={{ width: "100%", maxWidth: 460, padding: "8px 10px", borderRadius: 8, border: "1px solid #cfd8cf" }}
          />
        </p>
        <p style={{ display: "flex", gap: 8 }}>
          <button onClick={() => toggleAll(true)} disabled={sending}>Select all shown</button>
          <button onClick={() => toggleAll(false)} disabled={sending}>Clear</button>
          <button onClick={sendSelected} disabled={sending || selectedIndexes.length === 0}>
            {sending ? "Sending..." : "Send Reminder"}
          </button>
        </p>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Select</th>
              <th>Customer</th>
              <th>Phone</th>
              <th>Ref No</th>
              <th>Voucher Type</th>
              <th>Bill Date</th>
              <th>Due Date</th>
              <th>Overdue Days</th>
              <th>Amount</th>
              <th>Closing Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ row: r, index: idx }) => {
              const isSent = !!sentRows[idx];
              return (
                <tr
                  key={`${r.invoicenumber}-${r.customer_name}-${idx}`}
                  style={isSent ? { background: "#f1f3f1", color: "#7a827a" } : undefined}
                >
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[idx]}
                      disabled={sending || isSent}
                      onChange={(e) => setSelected((prev) => ({ ...prev, [idx]: e.target.checked }))}
                    />
                  </td>
                  <td>{r.customer_name}</td>
                  <td>{r.customer_number || "-"}</td>
                  <td><span className="badge">{r.invoicenumber}</span></td>
                  <td>{r.voucher_type || "-"}</td>
                  <td>{r.date || "-"}</td>
                  <td>{r.duedate || "-"}</td>
                  <td>{r.overdue_days ?? 0}</td>
                  <td>{formatNum(r.amount)}</td>
                  <td>{formatNum(r.closing_balance)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {snackbar.visible ? (
        <div
          style={{
            position: "fixed",
            left: "50%",
            bottom: 20,
            transform: "translateX(-50%)",
            background: snackbar.type === "success" ? "#0f8a5f" : "#b42318",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            zIndex: 2000,
            fontWeight: 600,
            maxWidth: "90vw",
          }}
        >
          {snackbar.text}
        </div>
      ) : null}
    </>
  );
}
