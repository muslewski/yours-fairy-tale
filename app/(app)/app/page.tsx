/**
 * /app — customer dashboard placeholder.
 *
 * This is a minimal server component — the real dashboard (order cards, status
 * timeline, photo upload) lands in a later task. The layout above already
 * verified the session; this page can trust it exists.
 *
 * Copy is calm and parent-facing per the brand-voice guide.
 */
import { getOrdersForCurrentCustomer } from "@/lib/customer-data";

export const metadata = {
  title: "Your videos — Yours Fairy Tale",
};

export default async function AppPage() {
  const orders = await getOrdersForCurrentCustomer();

  return (
    <main className="min-h-screen bg-brand-cream px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <h1
          className="text-4xl text-brand-deep mb-4"
          style={{ fontFamily: "var(--font-fredoka)" }}
        >
          Your videos
        </h1>

        {orders.length === 0 ? (
          <p
            className="text-brand-deep/70 text-lg"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            No videos yet. When you place an order, it will live here so you
            can follow every step of production.
          </p>
        ) : (
          <p
            className="text-brand-deep/70 text-lg"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            You have {orders.length} order{orders.length > 1 ? "s" : ""}.
            Order cards and your production timeline are coming soon.
          </p>
        )}

        <div
          className="mt-10 rounded-2xl border-2 border-brand-deep bg-white shadow-comic p-6"
        >
          <p
            className="text-sm text-brand-deep/60 uppercase tracking-widest mb-1"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Coming soon
          </p>
          <p
            className="text-brand-deep font-medium"
            style={{ fontFamily: "var(--font-quicksand)" }}
          >
            Your order cards, production status, and video delivery will appear
            here once your video is in progress.
          </p>
        </div>
      </div>
    </main>
  );
}
