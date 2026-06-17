import { expect, test, vi } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/order-access", () => ({
  ensureOrderAccessToken: vi.fn().mockResolvedValue("tok_test_access_token_32xxxxxxxxxx"),
}));

import { sendEmail } from "@/lib/email";
import { ensureOrderAccessToken } from "@/lib/order-access";
import { sendStatusTransitionEmail } from "@/lib/order-status-email";

test("status email links to the order via the durable /open access link, not bare /sign-in", async () => {
  await sendStatusTransitionEmail({
    orderId: "order_1",
    ownerEmail: "ada@example.com",
    newStatus: "proof_ready",
    childName: "Mia",
  });

  // The durable access token was ensured for this exact order.
  expect(ensureOrderAccessToken).toHaveBeenCalledWith("order_1");
  // The sent email embeds the /open/<token> link and no longer hardcodes /sign-in.
  const html = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0].html as string;
  expect(html).toContain("/open/tok_test_access_token_32xxxxxxxxxx");
  expect(html).not.toContain('yoursfairytale.com/sign-in"');
});
