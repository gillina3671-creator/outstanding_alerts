import { NextRequest, NextResponse } from "next/server";

type ReminderRow = {
  company_id: string | null;
  customer_name: string;
  customer_number: string | number | null;
  invoicenumber: string;
  closing_balance: string;
};

function digits(v: string): string {
  return v.replace(/\D/g, "");
}

async function resolveCompanyIdByAccessToken(accessToken: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  if (!accessToken) return null;

  const query = new URL(`${url}/rest/v1/tally_companies`);
  query.searchParams.set("select", "Guid");
  query.searchParams.set("access_token", `eq.${accessToken}`);
  query.searchParams.set("is_active", "eq.true");
  query.searchParams.set("limit", "1");

  const res = await fetch(query.toString(), {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Company token lookup failed: ${res.status} ${txt.slice(0, 300)}`);
  }

  const rows = (await res.json()) as Array<{ Guid?: string }>;
  const guid = rows?.[0]?.Guid;
  return guid || null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const accessToken = String(body?.accessToken || "");
    const companyId = await resolveCompanyIdByAccessToken(accessToken);
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = ((body?.rows || []) as ReminderRow[]).filter((row) => row.company_id === companyId);

    const interaktKey = process.env.INTERAKT_API_KEY;
    const interaktBase = process.env.INTERAKT_BASE_URL || "https://api.interakt.ai";
    const countryCode = process.env.INTERAKT_COUNTRY_CODE || "+91";
    const templateName = process.env.INTERAKT_CUSTOMER_TEMPLATE_NAME || "customer_payment_remind";
    const ownerPhoneRaw = process.env.INTERAKT_OWNER_PHONE || "";
    const ownerTemplateName = process.env.INTERAKT_OWNER_CONFIRMATION_TEMPLATE_NAME || "reminder_confirmation";

    if (!interaktKey) {
      return NextResponse.json({ error: "Missing INTERAKT_API_KEY" }, { status: 500 });
    }

    let sent = 0;
    let failed = 0;
    const results: Array<{ phone: string; ok: boolean; response: unknown }> = [];

    for (const row of rows) {
      const phone = digits(String(row.customer_number || ""));
      if (!phone) {
        failed += 1;
        results.push({ phone: "", ok: false, response: "Missing customer_number" });
        continue;
      }

      const payload = {
        countryCode,
        phoneNumber: phone,
        type: "Template",
        template: {
          name: templateName,
          languageCode: "en",
          bodyValues: [row.customer_name || "Customer", String(row.closing_balance || "0"), row.invoicenumber || "-"],
        },
      };

      const res = await fetch(`${interaktBase.replace(/\/$/, "")}/v1/public/message/`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${interaktKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let j: unknown = null;
      try {
        j = await res.json();
      } catch {
        j = await res.text();
      }

      if (res.ok) {
        sent += 1;
        results.push({ phone, ok: true, response: j });
      } else {
        failed += 1;
        results.push({ phone, ok: false, response: j });
      }
    }

    let owner_confirmation_sent = false;
    let owner_confirmation_response: unknown = null;
    const ownerPhone = digits(ownerPhoneRaw);

    if (sent > 0 && ownerPhone) {
      const ownerPayload = {
        countryCode,
        phoneNumber: ownerPhone,
        type: "Template",
        template: {
          name: ownerTemplateName,
          languageCode: "en",
          bodyValues: [String(sent)],
        },
      };

      const ownerRes = await fetch(`${interaktBase.replace(/\/$/, "")}/v1/public/message/`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${interaktKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ownerPayload),
      });

      try {
        owner_confirmation_response = await ownerRes.json();
      } catch {
        owner_confirmation_response = await ownerRes.text();
      }
      owner_confirmation_sent = ownerRes.ok;
    }

    return NextResponse.json({
      sent_count: sent,
      failed_count: failed,
      results,
      owner_confirmation_sent,
      owner_confirmation_response,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Unknown error" }, { status: 500 });
  }
}
