# Checkout (SIMULATION)

This folder is a **mock** of a Stripe embedded checkout. It looks and behaves
like an in-page Stripe Checkout (branded merchant panel, card form, processing
spinner, success screen) but makes **no network calls and charges nothing**. A
"Test mode" ribbon makes that obvious in the UI.

## How it's used

Call sites import only from the barrel and render against the `CheckoutProps`
contract (`open` / `cart` / `onClose`):

```tsx
import { Checkout, type CheckoutCart } from "@/components/checkout";

const [open, setOpen] = useState(false);
const cart: CheckoutCart = { items: [{ label: "Hardcover", amount: 49 }], total: 49 };

<button onClick={() => setOpen(true)}>Create your book</button>
<Checkout open={open} cart={cart} onClose={() => setOpen(false)} />
```

Today: used by `components/home/configurator.tsx`.

## Going live with real Stripe

Nothing at the call sites needs to change. Two options:

1. **Replace the implementation** — keep `index.ts` exporting `Checkout`, but
   point it at a real component that renders Stripe's `<EmbeddedCheckout>`
   inside the same dialog shell, keeping the `CheckoutProps` signature. Add a
   route handler that creates a Checkout Session and returns its `client_secret`.
2. **Delete this folder** and create a new `components/checkout/` that exports
   `Checkout` + the same types.

Required pieces for real Stripe:
- `pnpm add @stripe/stripe-js @stripe/react-stripe-js stripe`
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `.env.local`
- A server route (e.g. `app/api/checkout/route.ts`) that creates the session
  from `cart` and returns `{ client_secret }`.

Because the contract is stable, the configurator (and any future CTA) keeps
working untouched.
