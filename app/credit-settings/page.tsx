import CreditSettingsClient from "./settings-client";
import { resolveCompanyIdByAccessToken, resolveSingleCompanyId } from "../../lib/tenant";

type Customer = {
  ledger_name: string;
  credit_limit: string;
};

type Setting = {
  ledger_name: string;
  credit_limit: string;
  threshold_percent: string;
  overdue_days_threshold: number;
};

async function getCustomers(companyId: string): Promise<Customer[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const query = new URL(`${url}/rest/v1/tally_customers`);
  query.searchParams.set("select", "ledger_name,credit_limit");
  query.searchParams.set("company_id", `eq.${companyId}`);
  query.searchParams.set("customer_type", "eq.customer");
  query.searchParams.set("order", "ledger_name.asc");
  const res = await fetch(query.toString(), { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Customer fetch failed: ${res.status}`);
  return (await res.json()) as Customer[];
}

async function getSettings(companyId: string): Promise<Setting[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  const query = new URL(`${url}/rest/v1/customer_credit_settings`);
  query.searchParams.set("select", "ledger_name,credit_limit,threshold_percent,overdue_days_threshold");
  query.searchParams.set("company_id", `eq.${companyId}`);
  query.searchParams.set("is_active", "eq.true");
  const res = await fetch(query.toString(), { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Settings fetch failed: ${res.status}`);
  return (await res.json()) as Setting[];
}

export default async function CreditSettingsPage({ searchParams }: { searchParams: { access?: string; token?: string } }) {
  const accessToken = searchParams.access || searchParams.token || "";
  const companyId = (await resolveCompanyIdByAccessToken(accessToken)) || (accessToken ? null : await resolveSingleCompanyId());
  if (!companyId) {
    return <main><header><h1>Unauthorized</h1><p>Invalid or missing access token.</p></header></main>;
  }
  const [customers, settings] = await Promise.all([getCustomers(companyId), getSettings(companyId)]);
  return (
    <main>
      <header>
        <h1>Credit Settings</h1>
        <p>Set customer credit limit and alert thresholds.</p>
      </header>
      <CreditSettingsClient companyId={companyId} accessToken={accessToken} customers={customers} settings={settings} />
    </main>
  );
}
