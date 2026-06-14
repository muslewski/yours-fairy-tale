import * as migration_20260604_000000_wizard_order_fields from "./20260604_000000_wizard_order_fields";
import * as migration_20260605_000000_order_customer_notes from "./20260605_000000_order_customer_notes";
import * as migration_20260610_000000_waitlist from "./20260610_000000_waitlist";
import * as migration_20260610_000001_order_amount_promise from "./20260610_000001_order_amount_promise";
import * as migration_20260613_000000_media_site_media from "./20260613_000000_media_site_media";

export const migrations = [
  {
    up: migration_20260604_000000_wizard_order_fields.up,
    down: migration_20260604_000000_wizard_order_fields.down,
    name: "20260604_000000_wizard_order_fields",
  },
  {
    up: migration_20260605_000000_order_customer_notes.up,
    down: migration_20260605_000000_order_customer_notes.down,
    name: "20260605_000000_order_customer_notes",
  },
  {
    up: migration_20260610_000000_waitlist.up,
    down: migration_20260610_000000_waitlist.down,
    name: "20260610_000000_waitlist",
  },
  {
    up: migration_20260610_000001_order_amount_promise.up,
    down: migration_20260610_000001_order_amount_promise.down,
    name: "20260610_000001_order_amount_promise",
  },
  {
    up: migration_20260613_000000_media_site_media.up,
    down: migration_20260613_000000_media_site_media.down,
    name: "20260613_000000_media_site_media",
  },
];
