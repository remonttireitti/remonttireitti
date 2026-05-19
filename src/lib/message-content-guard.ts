/** Estä yhteystietojen jako viesteissä ennen tarjouksen hyväksyntää. */

const EMAIL_RE =
  /[a-z0-9._%+-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+/i;

const PHONE_RE =
  /(?:\+358|00358|0)\s*[\d\s\-()]{6,14}\d|(?:\+?\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/;

const URL_RE =
  /(?:https?:\/\/|www\.)[^\s]+|\b[a-z0-9][-a-z0-9]{0,62}\.(?:fi|com|net|org|eu|io)\b/i;

/** Vähintään 7 peräkkäistä numeroa (myös välilyönnein jaeltuna). */
const PHONE_DIGIT_RUN_RE = /(?:\d[\s\-().]*){6,}\d/;

const AT_WORD_RE = /\b(?:ät|at|aro?base|strudel|miuku|meikku)\b/gi;
const DOT_WORD_RE = /\b(?:piste|pilkku|dot)\b/gi;

const EMAIL_PROVIDER_RE =
  /\b(?:gmail|googlemail|hotmail|outlook|yahoo|live|icloud|protonmail|meil)\b/i;

/** esim. "foo ät gmail piste com" tai "foo gmail piste com" */
const SPELLED_EMAIL_RE =
  /\b[a-z0-9][a-z0-9._%+-]{1,40}\s*(?:(?:@|ät|at)\s*)?(?:gmail|googlemail|hotmail|outlook|yahoo|live|icloud|protonmail|meil)\b(?:\s*(?:\.|piste|dot)\s*|\s+)(?:com|fi|net|org|eu)\b/i;

/** Suomenkieliset numerosanat (puhekieliset mukaan lukien). */
const FINNISH_NUMBER_WORDS: Record<string, string> = {
  nolla: "0",
  nol: "0",
  yks: "1",
  yksi: "1",
  ykkönen: "1",
  ykkonen: "1",
  kaks: "2",
  kaksi: "2",
  kakkonen: "2",
  kolme: "3",
  neljä: "4",
  nelja: "4",
  neljäs: "4",
  neljas: "4",
  viis: "5",
  viisi: "5",
  kuus: "6",
  kuusi: "6",
  seiska: "7",
  seitsemän: "7",
  seitseman: "7",
  kasi: "8",
  kahdeksan: "8",
  ysi: "9",
  yhdeksän: "9",
  yhdeksan: "9",
};

const FINNISH_NUMBER_WORD_PATTERN = new RegExp(
  `\\b(?:${Object.keys(FINNISH_NUMBER_WORDS).join("|")})\\b`,
  "gi",
);

export const CONTACT_INFO_BLOCKED_MESSAGE =
  "Viestissä ei saa olla sähköpostia, puhelinnumeroa tai verkkosivun osoitetta ennen tarjouksen hyväksymistä. Yhteystiedot voi jakaa vasta kun asiakas on hyväksynyt tarjouksen.";

function normalizeFinnishSpelledNumbers(text: string): string {
  return text.replace(FINNISH_NUMBER_WORD_PATTERN, (word) => {
    const key = word.toLowerCase();
    return FINNISH_NUMBER_WORDS[key] ?? word;
  });
}

/** Muuntaa "ät gmail piste com" → "user@gmail.com" -tyyppiseksi tekstiksi. */
function normalizeObfuscatedEmailWords(text: string): string {
  let s = text.toLowerCase();
  s = s.replace(AT_WORD_RE, "@");
  s = s.replace(DOT_WORD_RE, ".");
  s = s.replace(/\s*@\s*/g, "@");
  s = s.replace(/\s*\.\s*/g, ".");
  s = s.replace(
    /\b(gmail|googlemail|hotmail|outlook|yahoo|live|icloud|protonmail|meil)\s+(com|fi|net|org|eu)\b/gi,
    "$1.$2",
  );
  return s;
}

function normalizeForContactDetection(text: string): string {
  return normalizeObfuscatedEmailWords(normalizeFinnishSpelledNumbers(text));
}

function containsPhoneLikeDigitRun(text: string): boolean {
  const normalized = normalizeForContactDetection(text);
  if (PHONE_RE.test(normalized)) return true;
  if (PHONE_DIGIT_RUN_RE.test(normalized)) return true;

  const digitsOnly = normalized.replace(/\D/g, "");
  return digitsOnly.length >= 7;
}

function containsEmailLikeContent(text: string): boolean {
  const raw = text.trim();
  if (SPELLED_EMAIL_RE.test(raw)) return true;

  const normalized = normalizeForContactDetection(raw);
  if (EMAIL_RE.test(normalized)) return true;

  if (EMAIL_PROVIDER_RE.test(normalized)) {
    const hasLocalPart =
      /[a-z0-9._%+-]{2,}@/.test(normalized) ||
      /\b[a-z0-9][a-z0-9._%+-]{1,40}\s+(?:gmail|googlemail|hotmail|outlook|yahoo|live|icloud|protonmail|meil)\b/i.test(
        raw,
      );
    const hasTld =
      /\.(?:com|fi|net|org|eu)\b/i.test(normalized) ||
      /\b(?:piste|dot)\s*(?:com|fi|net|org|eu)\b/i.test(raw);
    if (hasLocalPart && hasTld) return true;
  }

  return false;
}

export function messageContainsContactInfo(body: string): boolean {
  const text = body.trim();
  if (!text) return false;

  const normalized = normalizeForContactDetection(text);
  return (
    containsEmailLikeContent(text) ||
    containsPhoneLikeDigitRun(text) ||
    URL_RE.test(text) ||
    URL_RE.test(normalized)
  );
}

export function validateMessageContactRules(
  body: string,
  contactRestricted: boolean,
): { ok: true } | { ok: false; error: string } {
  if (!contactRestricted) return { ok: true };
  if (messageContainsContactInfo(body)) {
    return { ok: false, error: CONTACT_INFO_BLOCKED_MESSAGE };
  }
  return { ok: true };
}

export function isContactRestrictedProjectStatus(status: string): boolean {
  return status === "published" || status === "receiving_bids";
}
