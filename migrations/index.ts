import * as migration_20260604_000000_wizard_order_fields from "./20260604_000000_wizard_order_fields";

export const migrations = [
  {
    up: migration_20260604_000000_wizard_order_fields.up,
    down: migration_20260604_000000_wizard_order_fields.down,
    name: "20260604_000000_wizard_order_fields",
  },
];
