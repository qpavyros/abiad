import { Download } from 'lucide-react';
import { Button } from './ui/button';
import { Language } from '../types';
import { useTranslation } from '../i18n';

type PWAInstallBannerProps = Readonly<{
  onClose: () => void;
  onInstall: () => void;
  lang: Language;
}>;

export function PWAInstallBanner({ onClose, onInstall, lang }: PWAInstallBannerProps) {
  const { t } = useTranslation(lang);

  return (
    <div className="bg-accent text-accent-foreground px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Download className="h-5 w-5" />
        <div>
          <div className="font-medium">{t('installApp')}</div>
          <div className="text-sm opacity-90">{t('installMessage')}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onInstall}>
          <Download className="h-4 w-4 mr-1" />
          {t('install')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>
          {t('notNow')}
        </Button>
      </div>
    </div>
  );
}
