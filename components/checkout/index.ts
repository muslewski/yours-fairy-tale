// Public checkout interface.
//
// Everything in this folder is a SIMULATION of a Stripe embedded checkout —
// no network calls, no real charges. The rest of the app only imports from
// here, against the stable `CheckoutProps` contract, so going live later means
// replacing the implementation behind this barrel (see ./README.md) without
// touching any call site.

export type { CheckoutCart, CheckoutLineItem, CheckoutProps } from "./types";
export { MockStripeCheckout as Checkout } from "./mock-stripe-checkout";
