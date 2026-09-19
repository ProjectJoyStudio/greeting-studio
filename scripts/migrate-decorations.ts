// One-off maintenance run: moves the Project Joy decorations library into the
// working storage area and gives each decoration its verified reserve copy.
// Safe to run again at any time.

import { migrateDecorationsToPrimary } from "../src/lib/memory-book/decorations-migrate.server";

const result = await migrateDecorationsToPrimary();
console.log(JSON.stringify(result, null, 2));
