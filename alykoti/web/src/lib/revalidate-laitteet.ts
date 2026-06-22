import { revalidatePath } from "next/cache";
import { LAITTEET } from "@/lib/laitteet-paths";

/** Päivitä kaikki laitteet-sivut + vanhat uudelleenohjaukset. */
export function revalidateLaitteet() {
  for (const path of Object.values(LAITTEET)) {
    if (typeof path === "string") revalidatePath(path);
  }
  revalidatePath("/keskusyksikko");
  revalidatePath("/koti/valot");
  revalidatePath("/koti/laitteet");
}
