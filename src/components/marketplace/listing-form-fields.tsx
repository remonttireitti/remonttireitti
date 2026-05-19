import { formInputClass } from "@/lib/brand-theme";
import { PUMP_TYPE_OPTIONS } from "@/lib/marketplace-listings";

export function ListingFormFields({
  defaults,
}: {
  defaults: { contact_email: string; contact_phone: string };
}) {
  return (
    <>
      <Field label="Otsikko *">
        <input
          name="title"
          required
          minLength={3}
          placeholder="Esim. Mitsubishi ILP 5 kW, 2019"
          className={formInputClass}
        />
      </Field>

      <Field label="Kuvaus *">
        <textarea
          name="description"
          required
          minLength={10}
          rows={4}
          placeholder="Kunto, mitä mukana, nouto..."
          className={formInputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kunto *">
          <select name="condition" defaultValue="used" className={formInputClass}>
            <option value="used">Käytetty</option>
            <option value="new">Uusi / käyttämätön</option>
          </select>
        </Field>
        <Field label="Laitteen tyyppi *">
          <select name="pump_type_slug" required className={formInputClass}>
            <option value="">Valitse…</option>
            {PUMP_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Valmistaja">
          <input name="manufacturer" className={formInputClass} />
        </Field>
        <Field label="Malli">
          <input name="model" className={formInputClass} />
        </Field>
        <Field label="Vuosi">
          <input
            name="year_manufactured"
            type="number"
            min={1990}
            max={2030}
            className={formInputClass}
          />
        </Field>
      </div>

      <Field label="Hinta (€)">
        <input
          name="price_eur"
          type="number"
          min={0}
          placeholder="Jätä tyhjäksi = neuvoteltavissa"
          className={formInputClass}
        />
      </Field>

      <Field label="Nouto- / sijaintiosoite">
        <input
          name="address_line"
          placeholder="Katuosoite (valinnainen)"
          className={formInputClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Postinumero *">
          <input
            name="postal_code"
            required
            maxLength={5}
            inputMode="numeric"
            className={formInputClass}
          />
        </Field>
        <Field label="Kunta *">
          <input name="municipality" required className={formInputClass} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sähköposti *">
          <input
            name="contact_email"
            type="email"
            required
            defaultValue={defaults.contact_email}
            className={formInputClass}
          />
        </Field>
        <Field label="Puhelin *">
          <input
            name="contact_phone"
            type="tel"
            required
            defaultValue={defaults.contact_phone}
            className={formInputClass}
          />
        </Field>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700">{label}</label>
      {children}
    </div>
  );
}
