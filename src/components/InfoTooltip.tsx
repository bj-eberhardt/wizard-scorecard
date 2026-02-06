import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface InfoTooltipProps {
  title?: string;
  content: string;
  className?: string;
}

export default function InfoTooltip({ title, content, className }: InfoTooltipProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className={`inline-block ${className ?? ''}`}>
      <button
        ref={ref}
        type="button"
        aria-label={title}
        aria-expanded={open}
        aria-pressed={open}
        onClick={() => setOpen((s) => !s)}
        className={`ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors ${
          open ? 'bg-white text-blue-700 border border-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={title}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="0.9em" height="0.9em" className="inline-block" aria-hidden>
          <path d="M11.5 6h1v7h-1z" fill="currentColor" />
          <circle cx="12" cy="17" r="1" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-md w-full bg-white rounded shadow-lg p-4 text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="font-semibold text-base mb-2" id="info-modal-title">
                {title}
              </div>
            )}
            <div className="text-sm">{content}</div>
            <div className="mt-4 text-right">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('buttons.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
