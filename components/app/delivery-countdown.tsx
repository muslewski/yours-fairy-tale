/**
 * DeliveryCountdown — the parent's calm ETA card (server component).
 *
 * Days granularity, never negative numbers, hidden when there is no promise
 * and once the film is delivered (countdownState owns those rules and is
 * unit-tested). The ring fills as the production window elapses. Copy per the
 * brand-voice guide: sentence case, no em-dashes, no alarm.
 */
import { countdownState, formatPromisedDate } from "@/lib/delivery";
import { MascotImage } from "@/components/app/mascot-image";
import type { OrderStatus } from "@/lib/order-stages";

const RING_RADIUS = 32;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 201

export function DeliveryCountdown({
  status,
  promisedBy,
  createdAt,
  childName,
}: {
  status: OrderStatus;
  promisedBy: string | null;
  createdAt: string;
  childName?: string;
}) {
  const state = countdownState({
    status,
    promisedBy,
    createdAt,
    now: new Date(),
  });
  if (state.kind === "hidden") return null;

  const heading = childName
    ? `${childName}'s film is on its way`
    : "Your film is on its way";

  return (
    <div className="mt-6 flex items-center gap-5 rounded-2xl border-2 border-brand-deep bg-white p-5">
      {state.kind === "overdue" ? (
        <MascotImage
          animatedSrc="/mascot/builder-240.webp"
          staticSrc="/mascot/builder-static.png"
          width={45}
          height={72}
          className="h-[72px] w-auto shrink-0"
        />
      ) : (
        <svg
          width="76"
          height="76"
          viewBox="0 0 76 76"
          role="img"
          aria-label={
            state.kind === "soon"
              ? "Ready very soon"
              : `${state.days} days to go`
          }
          className="shrink-0"
        >
          <circle
            cx="38"
            cy="38"
            r={RING_RADIUS}
            fill="var(--color-brand-cream)"
            stroke="var(--color-brand-deep)"
            strokeOpacity="0.15"
            strokeWidth="6"
          />
          <circle
            cx="38"
            cy="38"
            r={RING_RADIUS}
            fill="none"
            stroke="var(--color-brand-blue)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={
              state.kind === "soon"
                ? RING_CIRCUMFERENCE * 0.04
                : RING_CIRCUMFERENCE * (1 - state.fractionElapsed)
            }
            transform="rotate(-90 38 38)"
          />
          <text
            x="38"
            y={state.kind === "soon" ? 43 : 36}
            textAnchor="middle"
            fill="var(--color-brand-deep)"
            style={{ fontFamily: "var(--font-fredoka)", fontSize: state.kind === "soon" ? 13 : 19 }}
          >
            {state.kind === "soon" ? "soon" : state.days}
          </text>
          {state.kind === "counting" ? (
            <text
              x="38"
              y="50"
              textAnchor="middle"
              fill="var(--color-brand-deep)"
              opacity="0.6"
              style={{ fontFamily: "var(--font-quicksand)", fontSize: 9, fontWeight: 700 }}
            >
              days
            </text>
          ) : null}
        </svg>
      )}

      <div style={{ fontFamily: "var(--font-quicksand)" }}>
        {state.kind === "overdue" ? (
          <>
            <p className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              Nearly finished
            </p>
            <p className="mt-0.5 text-sm text-brand-deep/70">
              The final touches are taking a little longer than we hoped. It
              will be worth the wait.
            </p>
          </>
        ) : (
          <>
            <p className="text-lg text-brand-deep" style={{ fontFamily: "var(--font-fredoka)" }}>
              {heading}
            </p>
            <p className="mt-0.5 text-sm text-brand-deep/70">
              {state.kind === "soon"
                ? "It should be ready very soon."
                : `We expect it ready by ${formatPromisedDate(state.promisedBy)}.`}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
