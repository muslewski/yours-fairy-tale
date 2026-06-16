import { expect, test, vi } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/order-tracking-link", () => ({
  createOrderTrackingLink: vi
    .fn()
    .mockResolvedValue(
      "https://example.com/sign-in/verify?token=abc&callbackURL=%2Fapp%2Forders%2Forder_1",
    ),
}));

import { sendEmail } from "@/lib/email";
import { createOrderTrackingLink } from "@/lib/order-tracking-link";
import { sendStatusTransitionEmail } from "@/lib/order-status-email";

test("status email links to the order via a one-click tracking link, not bare /sign-in", async () => {
  await sendStatusTransitionEmail({
    orderId: "order_1",
    ownerEmail: "ada@example.com",
    newStatus: "proof_ready",
    childName: "Mia",
  });

  // The tracking link was minted with a callbackURL deep-linking to the order.
  expect(createOrderTrackingLink).toHaveBeenCalledWith(
    expect.objectContaining({ email: "ada@example.com", callbackURL: "/app/orders/order_1" }),
  );
  // The sent email embeds that link and no longer hardcodes /sign-in.
  const html = (sendEmail as ReturnType<typeof vi.fn>).mock.calls[0][0].html as string;
  expect(html).toContain("/sign-in/verify?token=abc");
  expect(html).not.toContain('yoursfairytale.com/sign-in"');
});
