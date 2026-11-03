import Logo from '../assets/wizard-logo.png';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t } = useTranslation();
  return (
    <div className="mb-4 text-center">
      <h1 className="text-xl font-bold text-gold">{t('header.title')}</h1>
      {/* mobile shrinks the logo to ~64 px so the board gets the screen back;
          desktop keeps the natural size */}
      <img src={Logo} alt={t('header.logoAlt')} className="mx-auto h-16 w-auto md:h-auto" />
    </div>
  );
}
