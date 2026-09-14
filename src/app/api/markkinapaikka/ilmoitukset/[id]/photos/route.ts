import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { uploadListingPhotosFromFormData } from "@/lib/listing-photos";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Lataa ilmoituskuvat erillisellä pyynnöllä (ei server action 1 Mt -rajaa). */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Kirjaudu sisään." }, { status: 401 });
  }

  const { id: listingId } = await context.params;
  if (!listingId) {
    return NextResponse.json({ error: "Ilmoitus puuttuu." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("equipment_listings")
    .select("seller_id")
    .eq("id", listingId)
    .single();

  if (!listing || listing.seller_id !== user.id) {
    return NextResponse.json(
      { error: "Ilmoitusta ei löydy tai sinulla ei ole oikeutta." },
      { status: 403 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Kuvien lataus epäonnistui." },
      { status: 400 },
    );
  }

  try {
    await uploadListingPhotosFromFormData(listingId, formData);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[listing-photos-upload]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Kuvien tallennus epäonnistui.",
      },
      { status: 500 },
    );
  }
}
