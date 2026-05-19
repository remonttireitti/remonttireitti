"use client";

import { useState } from "react";
import { formInputClass } from "@/lib/brand-theme";
import {
  isDeviceListing,
  LISTING_PRODUCT_CATEGORIES,
  type ListingProductCategory,
} from "@/lib/marketplace-categories";
import { PUMP_TYPE_OPTIONS } from "@/lib/marketplace-listings";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-stone-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export function ListingCategoryFields({
  defaultCategory = "device",
}: {
  defaultCategory?: ListingProductCategory;
}) {
  const [category, setCategory] = useState<ListingProductCategory>(defaultCategory);
  const showPumpType = isDeviceListing(category);

  return (
    <>
      <Field label="Tuoteryhmä *">
        <select
          name="product_category"
          required
          value={category}
          onChange={(e) =>
            setCategory(e.target.value as ListingProductCategory)
          }
          className={formInputClass}
        >
          {LISTING_PRODUCT_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label} — {c.description}
            </option>
          ))}
        </select>
      </Field>

      {showPumpType ? (
        <Field label="Lämpöpumpun tyyppi">
          <select name="pump_type_slug" className={formInputClass}>
            <option value="">Valitse (valinnainen)…</option>
            {PUMP_TYPE_OPTIONS.filter((o) => o.value !== "varaosa").map(
              (o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ),
            )}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="pump_type_slug" value="" />
      )}
    </>
  );
}
