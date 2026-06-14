"use client";

import { useState } from "react";
import { formInputClass } from "@/lib/brand-theme";
import {
  isDeviceListing,
  LISTING_PRODUCT_CATEGORIES,
  type ListingProductCategory,
} from "@/lib/marketplace-categories";
import { MARKETPLACE_DEVICE_TYPE_GROUPS } from "@/lib/marketplace-device-types";

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
  const showDeviceType = isDeviceListing(category);

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

      {showDeviceType ? (
        <Field label="Laitteen tyyppi">
          <select name="pump_type_slug" className={formInputClass}>
            <option value="">Valitse (valinnainen)…</option>
            {MARKETPLACE_DEVICE_TYPE_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      ) : (
        <input type="hidden" name="pump_type_slug" value="" />
      )}
    </>
  );
}
