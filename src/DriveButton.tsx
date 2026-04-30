export interface DriveButtonProps {
  onSave: () => Promise<void>;
  saving: boolean;
  saved: boolean;
  link?: string;
  label: string;
}

export function DriveButton({ onSave, saving, saved, link, label }: DriveButtonProps) {
  if (saved && link) {
    return (
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
        View in Drive
      </a>
    );
  }
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 2.4l3.6 6.24H4.8L8.4 2.4h4.08zM4.08 10.08L1.2 14.88 4.08 19.2h15.84l2.88-4.32-2.88-4.8H4.08zM16.08 2.4l5.04 8.88H16.08L12.48 5.04 16.08 2.4z" />
      </svg>
      {saving ? "Saving..." : label}
    </button>
  );
}
