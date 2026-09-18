import { storageFor } from "@/lib/storage/registry.server";
import { placementsOf } from "@/lib/storage/backup.server";
const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
const { data } = await (supabaseAdmin as any).from("memory_book_materials")
  .select("id,kind,bucket,path,size_bytes,created_at")
  .eq("book_id","a3a08306-acf2-4bad-9c78-378e41561fd6")
  .order("created_at",{ascending:false}).limit(5);
console.log(data);
const row = (data ?? [])[0];
if (row) {
  console.log("placements:", (await placementsOf(row.path)).map((p:any)=>`${p.provider}/${p.role}/${p.status}/${p.size_bytes}/${p.last_error}`));
  console.log("primary head:", await storageFor("primary")!.head(row.path));
  console.log("backup head:", await storageFor("backup")!.head(row.path));
}
