"use client";

interface EmptyStateProps {
  heading: string;
  subtext: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  variant?: "blank" | "search";
}

export default function EmptyState({
  heading,
  subtext,
  action,
  variant = "blank",
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center animate-fade-in">
      <div className="mb-5 text-ink-faint/70">
        {variant === "search" ? <SearchIllustration /> : <NotepadIllustration />}
      </div>
      <h2 className="font-display text-lg font-semibold text-ink">
        {heading}
      </h2>
      <p className="mt-1.5 max-w-[26ch] text-[14px] leading-relaxed text-ink-soft">
        {subtext}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="tap-scale mt-6 rounded-control bg-accent px-5 py-2.5 text-[14px] font-medium text-on-accent shadow-card transition-colors hover:bg-accent-hover"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function NotepadIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="12" width="48" height="64" rx="6" stroke="currentColor" strokeWidth="2.5" />
      <path d="M30 30h28M30 40h28M30 50h18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path
        d="M56 60l14-14a4.24 4.24 0 116 6L62 66l-8 2 2-8z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIllustration() {
  return (
    <svg width="88" height="88" viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="38" cy="38" r="20" stroke="currentColor" strokeWidth="2.5" />
      <path d="M53 53l14 14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M30 38h16M38 30v16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}
