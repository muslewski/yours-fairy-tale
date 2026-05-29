export type CheckoutLineItem = {
  label: string;
  /** Amount in whole currency units (e.g. dollars), not cents. */
  amount: number;
};

export type CheckoutCart = {
  items: CheckoutLineItem[];
  total: number;
  /** ISO 4217 code, lowercase. Defaults to "usd". */
  currency?: string;
};

/**
 * The stable contract every checkout implementation must satisfy.
 * The mock and a future real-Stripe component both accept exactly these props,
 * so swapping one for the other never touches call sites.
 */
export type CheckoutProps = {
  open: boolean;
  cart: CheckoutCart;
  onClose: () => void;
};
