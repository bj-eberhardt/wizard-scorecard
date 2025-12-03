import Logo from '../assets/wizard-logo.png';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t } = useTranslation();
  return (
    <div className="mb-4 text-center">
      <h1 className="text-xl font-bold">{t('header.title')}</h1>
      <img src={Logo} alt={t('header.logoAlt')} className="mx-auto" />
    </div>
  );
}
