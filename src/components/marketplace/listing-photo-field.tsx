"use client";

import { ProjectPhotoUpload } from "@/components/project/project-photo-upload";

export function ListingPhotoField({
  files,
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-stone-700">Kuvat</p>
      <ProjectPhotoUpload
        name="listing_photos"
        files={files}
        onFilesChange={onFilesChange}
        emptyLabel="Lisää kuvia (laite, tarra, kunto…)"
        hint="Kuvat näkyvät ilmoituksessa. Enintään 8 kuvaa, 5 Mt / kuva. Valinnainen."
      />
    </div>
  );
}
