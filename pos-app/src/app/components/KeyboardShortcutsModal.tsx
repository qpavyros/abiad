import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Language } from '../types';
import { useTranslation } from '../i18n';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
}

export function KeyboardShortcutsModal({
  open,
  onClose,
  lang,
}: KeyboardShortcutsModalProps) {
  const { t } = useTranslation(lang);
  const openSettingsLabel = lang === 'ar' ? 'فتح الإعدادات' : 'Open settings';
  const toggleLanguageLabel = lang === 'ar' ? 'تبديل اللغة' : 'Toggle language';
  const toggleThemeLabel = lang === 'ar' ? 'تبديل المظهر' : 'Toggle theme';
  const openHistoryLabel = lang === 'ar' ? 'فتح سجل المبيعات' : 'Open sales history';
  const clearCartNowLabel = lang === 'ar' ? 'مسح السلة مباشرة' : 'Clear cart (instant)';
  const clearCartConfirmLabel =
    lang === 'ar' ? 'مسح السلة (مع تأكيد)' : 'Clear cart (with confirmation)';
  const toggleHelpLabel = lang === 'ar' ? 'إظهار/إخفاء نافذة الاختصارات' : 'Toggle shortcuts modal';
  const openAnalyticsLabel = lang === 'ar' ? 'فتح التحليلات' : 'Open analytics';
  const checkoutIfItemsLabel =
    lang === 'ar' ? 'الدفع (إذا السلة غير فارغة)' : 'Checkout (if cart not empty)';

  const shortcuts = [
    { key: 'Ctrl + K', description: t('searchKey') },
    { key: 'Ctrl + S', description: openSettingsLabel },
    { key: 'Ctrl + L', description: toggleLanguageLabel },
    { key: 'Ctrl + D', description: toggleThemeLabel },
    { key: 'Ctrl + R', description: openHistoryLabel },
    { key: 'Ctrl + N', description: clearCartNowLabel },
    { key: 'Ctrl + Enter', description: t('checkoutKey') },
    { key: 'Ctrl + Shift + C', description: clearCartConfirmLabel },
    { key: 'Ctrl + /', description: toggleHelpLabel },
    { key: 'F1', description: toggleHelpLabel },
    { key: 'F2', description: openSettingsLabel },
    { key: 'F3', description: openAnalyticsLabel },
    { key: 'F4', description: checkoutIfItemsLabel },
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            {t('keyboardShortcuts')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted"
            >
              <span className="text-sm">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-background border border-border rounded">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button onClick={onClose}>{t('close')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
