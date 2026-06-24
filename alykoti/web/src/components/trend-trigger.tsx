"use client";

type Props = {
  onClick: () => void;
  className?: string;
  title?: string;
};

export function TrendTrigger({ onClick, className = "", title = "Näytä trendi" }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`inline-flex shrink-0 items-center justify-center rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 ${className}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="size-4"
        aria-hidden
      >
        <path
          fillRule="evenodd"
          d="M.75 15.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H1.5a.75.75 0 0 1-.75-.75Zm3.5-4.5a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Zm3.5-4.5a.75.75 0 0 1 .75-.75h3.5a.75.75 0 0 1 0 1.5h-3.5a.75.75 0 0 1-.75-.75Z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  );
}
