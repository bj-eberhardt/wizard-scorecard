import React, { useId, useRef, useState } from 'react';
import { CircleHelp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDialogA11y } from '../hooks/useDialogA11y';
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
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();

  useDialogA11y({ open, containerRef: dialogRef, onClose: () => setOpen(false) });

  return (
    <div className={`inline-block ${className ?? ''}`}>
      <button
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
        <CircleHelp size={16} strokeWidth={2.25} aria-hidden />
      </button>

      {open && (
        <div
          ref={dialogRef}
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
                data-autofocus
                className="cursor-pointer rounded bg-blue-600 px-3 py-1 text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
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
