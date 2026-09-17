import { ShareLinkButton } from "@/components/ui/share-link-button";
import { getSiteUrl } from "@/lib/seo";

type Props = {
  path: string;
  title: string;
  description?: string;
  label?: string;
  compact?: boolean;
  className?: string;
};

export function ShareLinkPanel({
  path,
  title,
  description,
  label = "Jaa linkki",
  compact = false,
  className = "",
}: Props) {
  const url = `${getSiteUrl()}${path.startsWith("/") ? path : `/${path}`}`;

  return (
    <div
      className={`rounded-xl border border-stone-200 bg-stone-50/80 p-4 ${className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-stone-900">{title}</p>
          {description && (
            <p className="mt-0.5 text-xs text-stone-600">{description}</p>
          )}
          <p className="mt-2 truncate font-mono text-xs text-stone-500">{url}</p>
        </div>
        <ShareLinkButton
          url={url}
          title={title}
          text={description}
          label={label}
          compact={compact}
          className="shrink-0"
        />
      </div>
    </div>
  );
}
