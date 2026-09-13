import { formatBudget } from "@/lib/projects";
import { getSiteUrl } from "@/lib/seo";
import { siteConfig } from "@/lib/site-config";
import type { PublicOpenProject } from "@/lib/public-projects-server";

type Props = {
  project: PublicOpenProject;
};

/** Avoin tarjouspyyntö — JobPosting-schema UGC-long-tail -hakuun. */
export function ProjectJsonLd({ project }: Props) {
  const base = getSiteUrl();
  const url = `${base}/tarjouspyynnot/${project.id}`;
  const label = project.job_type_name ?? project.category_name;

  const graph: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: project.title,
    description: project.summary,
    datePosted: project.created_at,
    hiringOrganization: {
      "@type": "Organization",
      name: siteConfig.name,
      sameAs: base,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: project.municipality,
        addressCountry: "FI",
      },
    },
    employmentType: "CONTRACTOR",
    industry: label,
    url,
    directApply: true,
    applicantLocationRequirements: {
      "@type": "Country",
      name: "Finland",
    },
  };

  if (project.bid_deadline) {
    graph.validThrough = project.bid_deadline;
  }

  const budgetText = formatBudget(project.budget_min, project.budget_max);
  if (budgetText && budgetText !== "Ei ilmoitettu") {
    graph.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "EUR",
      value: {
        "@type": "QuantitativeValue",
        name: budgetText,
      },
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
