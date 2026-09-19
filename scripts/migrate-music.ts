// One-off maintenance run: moves the Project Joy music library into the
// working storage area and gives each track its verified reserve copy.
// Safe to run again at any time.

import { migrateMusicLibraryToPrimary } from "../src/lib/music/music-migrate.server";

const result = await migrateMusicLibraryToPrimary();
console.log(JSON.stringify(result, null, 2));
