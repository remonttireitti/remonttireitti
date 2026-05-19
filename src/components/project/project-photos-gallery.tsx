import type { ProjectPhotoView } from "@/lib/project-photos";

export function ProjectPhotosGallery({
  photos,
  title = "Kuvat",
}: {
  photos: ProjectPhotoView[];
  title?: string;
}) {
  if (photos.length === 0) return null;

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      <ul className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <li
            key={photo.id}
            className="flex h-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-stone-50"
          >
            <a
              href={photo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block flex-1"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={photo.original_name ?? "Tarjouspyynnön kuva"}
                className="aspect-[4/3] h-full w-full object-cover"
              />
            </a>
            {photo.original_name ? (
              <p className="truncate px-2 py-1 text-xs text-stone-500">
                {photo.original_name}
              </p>
            ) : (
              <p className="px-2 py-1 text-xs text-transparent" aria-hidden>
                —
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
