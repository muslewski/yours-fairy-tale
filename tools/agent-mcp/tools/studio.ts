import type { OrderStatus } from "@/lib/order-stages";
import {
  applyOrderStatusCore,
  applyPromisedByCore,
  attachVideoCore,
} from "@/lib/studio-order-mutations";

export async function setStatus(orderId: string, status: OrderStatus) {
  return applyOrderStatusCore(orderId, status);
}

export async function setPromisedBy(orderId: string, iso: string | null) {
  return applyPromisedByCore(orderId, iso);
}

/**
 * Attach a synthetic proof video (metadata-only). The bytes need not exist in
 * Blob for state/UI testing — only playback would 404. Pass a real test-blob
 * pathname when you need the video proxy to resolve.
 */
export async function attachProof(orderId: string, pathname = `agent-proof-${Date.now()}.mp4`) {
  return attachVideoCore({ orderId, kind: "proof", blob: { pathname, contentType: "video/mp4", size: 1024 } });
}

export async function attachFinalVideo(orderId: string, pathname = `agent-final-${Date.now()}.mp4`) {
  return attachVideoCore({ orderId, kind: "finalVideo", blob: { pathname, contentType: "video/mp4", size: 1024 } });
}
