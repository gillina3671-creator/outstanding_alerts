# Overdue Portal (Next.js)

## 1) Setup
- copy `.env.example` to `.env.local`
- set your values
- set `INTERAKT_OWNER_PHONE` in each company system `.env`

## 2) DB change (one time)
Add required columns/index:
```sql
alter table public.tally_companies add column if not exists access_token text;
alter table public.tally_companies add column if not exists owner_phone_number text;
create unique index if not exists tally_companies_access_token_key on public.tally_companies(access_token);
```

## 3) Sync behavior
On every sync, system will auto-save:
- `owner_phone_number` = owner phone digits
- `access_token` = same owner phone digits

So no manual token setup needed.

## 4) Install and run portal
```bash
npm install
npm run dev
```

Owner link format:
- `http://localhost:3000/overdue?access=OWNER_PHONE_DIGITS`
- Example: `http://localhost:3000/overdue?access=9526830843`
