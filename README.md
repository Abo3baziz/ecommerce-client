# 🛍️ Ecommerce Storefront & Admin Console

An online store, built as the customer-facing half of a full-stack project.
Shoppers browse a catalog, fill a cart and check out; store staff work in a
private dashboard to manage products, stock, orders and more. It talks to a
custom backend API that lives in its own repo.

**Part of a full-stack app** · [View Portfolio](https://codebyahmed.online)

| | |
|---|---|
| 🌐 **Live store** | [ecommerce-storefront-ashy.vercel.app](https://ecommerce-storefront-ashy.vercel.app) |
| 🔌 **API repo** | [github.com/Abo3baziz/ecommerce-api](https://github.com/Abo3baziz/ecommerce-api) |
| 👤 **Portfolio** | [codebyahmed.online](https://codebyahmed.online) |

## 🛒 What shoppers can do

- 🔍 Browse by category, search, filter and sort — the site remembers your
  filters as you move around
- 🖼️ Open a product page with color/size options, a photo gallery and reviews
- 🛒 Add to cart (quantities merge instead of duplicating) and check out in
  three simple steps
- 📦 Track orders afterwards with a clear status timeline — the price you
  paid is locked in at purchase time, even if prices change later
- ⭐ Leave one review per product, with photos
- 👤 Manage the account: profile, password, email and phone (verified by a
  code sent to you), saved addresses, seeing where you're signed in, and
  deleting the account

## 🧑‍💼 What store staff get (the dashboard at `/admin`)

- 📊 A dashboard with sales numbers and charts, plus deeper analytics for the
  owner: profit & loss, an expenses ledger, and coupon performance
- 🗂️ Full control of the catalog: products with their options and photos,
  categories, and stock levels (staff can hold stock aside for an order and
  release it again)
- 🚚 An order queue that only allows sensible next steps — confirming,
  shipping, delivering — and keeps stock and payments in sync automatically
- 👥 Customer accounts, ✅ review moderation, 🎟️ discount coupon management
- 🧾 Every staff action is written to a permanent log, so changes can always
  be traced back
- 👀 **Public demo mode**: the dashboard can be opened without signing in.
  Visitors can look at real data, but nothing can be changed — the server
  refuses any edit. Personal details like emails and phone numbers are
  partly hidden.

## ✨ Small touches

- ⏳ Visitors are told up front when the demo server may need up to ~50
  seconds to wake up, instead of staring at a blank page
- 📝 Forms show mistakes right where you typed them, before anything is sent
- 💰 Prices are always calculated by the server, so fiddling with the
  browser can't change what you pay

## 🧰 Tech stack

| Layer | Tools |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Data fetching | TanStack Query, Axios |
| UI | Tailwind CSS, shadcn/ui, lucide-react, recharts |
| Forms | react-hook-form + Zod |

## 🚀 Run it locally

```bash
npm install
npm run dev        # http://localhost:3001 — the backend uses 3000
npm test
npm run typecheck
```

The backend needs to be running too — see
[ecommerce-api](https://github.com/Abo3baziz/ecommerce-api). Create a
`.env.local` file:

```
NEXT_PUBLIC_API_BASE_URL=/api/v1   # keep it relative
API_ORIGIN=http://localhost:3000   # where the API runs
```

## 👀 Try the public demo locally

With the backend running, set two switches:

- 🖥️ backend `.env`: `ENABLE_DEMO_MODE=true`
- 🌐 client `.env.local`: `NEXT_PUBLIC_DEMO_MODE=true`

Then open `http://localhost:3001/admin` — no account needed. Real staff sign
in as usual and keep full control.

## ☁️ Deployment

The store runs on Vercel and forwards browser requests to the API
([Render](https://render.com) + Postgres), so logins keep working smoothly.
Pushes to `main` deploy automatically.

---

© Ahmed Abdelaziz · [Portfolio](https://codebyahmed.online)
