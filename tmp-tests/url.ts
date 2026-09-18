const { memoryBookFileUrl } = await import("@/lib/memory-book/storage.server");
const path = "users/ddb9c1b8-8531-4371-a5f0-ef1f10089632/memory-book/a3a08306-acf2-4bad-9c78-378e41561fd6/photos/1789768913476-c34cb6c5-8dd3-4ec3-8df4-80011340d654.png";
const url = await memoryBookFileUrl("r2", path, 300);
const res = await fetch(url!);
console.log("signed read status:", res.status, "bytes:", (await res.arrayBuffer()).byteLength);
