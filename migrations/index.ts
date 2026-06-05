import * as migration_20260604_000000_wizard_order_fields from "./20260604_000000_wizard_order_fields";
import * as migration_20260605_000000_order_customer_notes from "./20260605_000000_order_customer_notes";

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
];
