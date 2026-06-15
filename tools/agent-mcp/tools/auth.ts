import { createOrderTrackingLink } from "@/lib/order-tracking-link";

/** Mint a magic sign-in link so Playwright can authenticate as the customer. */
export async function mintLoginLink(
  email: string,
  baseUrl: string = process.env.BETTER_AUTH_URL ?? "http://localhost:3100",
  callbackURL = "/app",
): Promise<string> {
  return createOrderTrackingLink({ email: email.trim().toLowerCase(), baseUrl, callbackURL });
}
