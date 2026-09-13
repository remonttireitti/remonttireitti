import Image from "next/image";

export type SeoFigureProps = {
  src: string;
  alt: string;
  /** HTML title — täydentää alt-tekstiä (ei korvaa sitä). */
  title: string;
  caption: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
};

/**
 * Kuva figure/figcaption-rakenteella — alt, title ja kuvateksti hakukoneille ja saavutettavuudelle.
 */
export function SeoFigure({
  src,
  alt,
  title,
  caption,
  width,
  height,
  priority = false,
  className = "",
}: SeoFigureProps) {
  const isSvg = src.endsWith(".svg");

  return (
    <figure className={`overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm ${className}`}>
      <Image
        src={src}
        alt={alt}
        title={title}
        width={width}
        height={height}
        priority={priority}
        unoptimized={isSvg}
        className="h-auto w-full object-cover"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
      <figcaption className="border-t border-stone-100 px-4 py-3">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <p className="mt-0.5 text-sm text-stone-600">{caption}</p>
      </figcaption>
    </figure>
  );
}
