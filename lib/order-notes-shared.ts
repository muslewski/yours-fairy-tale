/**
 * Shared constants/types for customer order notes.
 *
 * This module is intentionally NOT `"use server"`: `lib/order-actions.ts` begins
 * with `"use server"`, where every exported value must be an async function, so a
 * plain `const`/`type` can't live there. Keeping them here lets both the action
 * module and its tests/UI import them without violating that rule.
 */

/** The longest a single customer note may be. */
export const MAX_NOTE_LENGTH = 2000;

/** The result of a note submission, surfaced to the dialog. */
export type AddNoteResult = { ok: true } | { ok: false; error: string };
