import { getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";

const MARKETING_IMAGES = [
  {
    url: "/marketing/kilpailuta-remontti-tarjouspyynto.svg",
    name: "Kilpailuta remontti — tee tarjouspyyntö omakotitaloon",
    description:
      "Kuvitus remontin kilpailutuksesta: kuvaile kohde, liitä kuvat ja julkaise tarjouspyyntö ilmaiseksi.",
  },
  {
    url: "/marketing/vertaa-remonttitarjouksia.svg",
    name: "Vertaa remonttitarjouksia ja tingaa vastatarjouksella",
    description:
      "Kuvitus tarjousten vertailusta: hinta, takuu ja aikataulu samassa muodossa.",
  },
  {
    url: "/marketing/lampopumpun-vian-selvitys.svg",
    name: "Lämpöpumpun vian selvitys — tarkista oire itse",
    description:
      "Kuvitus lämpöpumpun vian selvityksestä ennen huoltopyyntöä.",
  },
] as const;

/** Etusivun kuvien ImageObject — täydentää FAQ-schemaa. */
export function HomePageJsonLd() {
  const base = getSiteUrl();

  const graph = MARKETING_IMAGES.map((img) => ({
    "@type": "ImageObject" as const,
    contentUrl: `${base}${img.url}`,
    name: img.name,
    description: img.description,
    inLanguage: "fi-FI",
    author: {
      "@type": "Organization",
      name: siteConfig.legalName,
    },
  }));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": graph,
        }),
      }}
    />
  );
}
