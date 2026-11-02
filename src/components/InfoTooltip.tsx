import React, { useEffect, useId, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { T } from '../test-ids';

interface InfoTooltipProps {
  title?: string;
  content: string;
  className?: string;
  testId?: string;
}

export default function InfoTooltip({ title, content, className, testId }: InfoTooltipProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement | null>(null);
  // unique id per instance (fixes the previous duplicated hard-coded id)
  const titleId = useId();

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
        data-testid={testId}
        className={`ml-1 inline-flex cursor-pointer items-center justify-center w-6 h-6 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors ${
          open
            ? 'bg-white text-blue-700 border border-blue-600'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title={title}
      >
        {/* F17: the title is a question, so the icon shows a "?" in a circle
            (lucide CircleHelp) instead of the previous hand-drawn "!". */}
        <CircleHelp size={16} strokeWidth={2.25} aria-hidden />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          data-testid={T.infoModal.dialog}
          className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-md w-full cursor-default bg-white rounded shadow-lg p-4 text-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="font-semibold text-base mb-2" id={titleId}>
                {title}
              </div>
            )}
            <div className="text-sm">{content}</div>
            <div className="mt-4 text-right">
              <button
                type="button"
                onClick={() => setOpen(false)}
                data-testid={T.infoModal.close}
                className="px-3 py-1 cursor-pointer bg-blue-600 text-white rounded hover:bg-blue-700"
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
