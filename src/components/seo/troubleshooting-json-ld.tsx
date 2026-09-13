import type { HeatPumpSlug } from "@/constants/heat-pumps";
import { getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import {
  pumpLabel,
  type TroubleshootingGuide,
} from "@/lib/troubleshooting-guides";
import {
  resolveCallProWhenForPump,
  troubleshootingHowToSteps,
  troubleshootingSymptomTitle,
} from "@/lib/troubleshooting-seo";

type Props = {
  guide: TroubleshootingGuide;
  pump: HeatPumpSlug;
  path: string;
};

export function TroubleshootingJsonLd({ guide, pump, path }: Props) {
  const base = getSiteUrl();
  const url = `${base}${path}`;
  const pumpName = pumpLabel(pump);
  const steps = troubleshootingHowToSteps(guide, pump);
  const callPro = resolveCallProWhenForPump(guide, pump);

  const faqEntities = [
    ...(guide.followUps?.map((f) => ({
      "@type": "Question" as const,
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: f.options.map((o) => o.label).join(". "),
      },
    })) ?? []),
    {
      "@type": "Question" as const,
      name: "Milloin kannattaa kutsua ammattilainen?",
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: callPro.join(" "),
      },
    },
  ];

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Vian selvitys",
            item: `${base}/vian-selvitys`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: pumpName,
            item: `${base}/vian-selvitys/${pump}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: guide.title,
            item: url,
          },
        ],
      },
      {
        "@type": "HowTo",
        name: troubleshootingSymptomTitle(guide, pump),
        description: guide.summary,
        inLanguage: "fi-FI",
        url,
        step: steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
        provider: {
          "@type": "Organization",
          name: siteConfig.legalName,
          url: base,
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqEntities,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
