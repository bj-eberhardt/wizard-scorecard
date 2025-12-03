import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  // __APP_VERSION__ is injected at build time
  return (
    <footer className="mt-8 text-center text-gray-500 text-sm">
      {t('footer.copy', { year, version: __APP_VERSION__ })}
    </footer>
  );
}
