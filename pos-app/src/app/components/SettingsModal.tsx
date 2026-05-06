import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Settings as SettingsType, Language, DatabaseMode } from '../types';
import { useTranslation } from '../i18n';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  settings: SettingsType;
  onSave: (settings: SettingsType) => void;
  lang: Language;
  onExportProductsCSV?: () => void;
  onImportProductsCSV?: (file: File) => Promise<void> | void;
}

export function SettingsModal({
  open,
  onClose,
  settings,
  onSave,
  lang,
  onExportProductsCSV,
  onImportProductsCSV,
}: SettingsModalProps) {
  const { t } = useTranslation(lang);
  const [formData, setFormData] = useState(settings);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const isArabic = lang === 'ar';

  useEffect(() => {
    if (open) {
      setFormData(settings);
    }
  }, [open, settings]);

  const handleSave = () => {
    const normalized: SettingsType = {
      ...formData,
      adminPin: String(formData.adminPin || '').trim() || '1234',
      ownerPin: String(formData.ownerPin || '').trim() || '9999',
      cashierPin: String(formData.cashierPin || '').trim() || '0000',
      vatNumber: String(formData.vatNumber || '').trim(),
      receiptFooter: String(formData.receiptFooter || '').trim(),
      requirePin: formData.requirePin !== false,
    };
    onSave(normalized);
    onClose();
  };

  const handleChange = <K extends keyof SettingsType>(field: K, value: SettingsType[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert(isArabic ? 'يرجى اختيار صورة فقط.' : 'Please choose an image file.');
      event.target.value = '';
      return;
    }

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(file);
      });
      handleChange('receiptLogoBase64', base64);
    } catch {
      alert(isArabic ? 'تعذر قراءة الشعار.' : 'Failed to read logo image.');
    } finally {
      event.target.value = '';
    }
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !onImportProductsCSV) {
      event.target.value = '';
      return;
    }
    try {
      await onImportProductsCSV(file);
    } finally {
      event.target.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('generalSettings')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">{t('storeName')} (English)</Label>
            <Input
              id="storeName"
              value={formData.storeName}
              onChange={(e) => handleChange('storeName', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeNameAr">{t('storeName')} (Arabic)</Label>
            <Input
              id="storeNameAr"
              value={formData.storeNameAr}
              onChange={(e) => handleChange('storeNameAr', e.target.value)}
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="taxRate">{t('taxRate')} (%)</Label>
            <Input
              id="taxRate"
              type="number"
              step="0.1"
              value={formData.taxRate}
              onChange={(e) => handleChange('taxRate', Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="localCurrency">{t('localCurrency')}</Label>
            <Input
              id="localCurrency"
              value={formData.localCurrency}
              onChange={(e) => handleChange('localCurrency', e.target.value.toUpperCase())}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="loyaltyRate">{t('loyaltyRate')} (%)</Label>
            <Input
              id="loyaltyRate"
              type="number"
              step="0.1"
              value={formData.loyaltyRate}
              onChange={(e) => handleChange('loyaltyRate', Number(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="databaseMode">{t('databaseMode') || 'Database Mode'}</Label>
            <Select
              value={formData.databaseMode || 'offline'}
              onValueChange={(value) => handleChange('databaseMode', value as DatabaseMode)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online (Firebase)</SelectItem>
                <SelectItem value="offline">Offline (LocalStorage)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {isArabic
                ? 'الوضع المتصل للمزامنة السحابية، وغير المتصل لتخزين المتصفح.'
                : 'Online mode is for cloud sync. Offline mode stores data in the browser.'}
            </p>
          </div>

          {(onExportProductsCSV || onImportProductsCSV) && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label>{isArabic ? 'استيراد/تصدير CSV/Excel' : 'Bulk CSV/Excel Import/Export'}</Label>
              <p className="text-xs text-muted-foreground">
                {isArabic
                  ? 'ارفع ملف CSV أو Excel للمنتجات أو صدّر الملف الحالي للتعديل الخارجي.'
                  : 'Upload a products CSV/Excel file, or export the current list for external editing.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {onImportProductsCSV && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => csvInputRef.current?.click()}
                  >
                    {isArabic ? 'استيراد CSV/Excel' : 'Import CSV/Excel'}
                  </Button>
                )}
                {onExportProductsCSV && (
                  <Button type="button" variant="outline" onClick={onExportProductsCSV}>
                    {isArabic ? 'تصدير CSV' : 'Export CSV'}
                  </Button>
                )}
              </div>
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={handleCsvUpload}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="vatNumber">{isArabic ? 'الرقم الضريبي (VAT)' : 'VAT Number'}</Label>
            <Input
              id="vatNumber"
              value={formData.vatNumber || ''}
              onChange={(e) => handleChange('vatNumber', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receiptFooter">{isArabic ? 'رسالة تذييل الإيصال' : 'Receipt Footer Message'}</Label>
            <Input
              id="receiptFooter"
              value={formData.receiptFooter || ''}
              onChange={(e) => handleChange('receiptFooter', e.target.value)}
              placeholder={isArabic ? 'شكراً لزيارتكم' : 'Thank you for visiting us'}
            />
          </div>

          <div className="space-y-2">
            <Label>{isArabic ? 'شعار المتجر على الإيصال' : 'Store Logo on Receipt'}</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <Button type="button" variant="outline" onClick={() => logoInputRef.current?.click()}>
                {isArabic ? 'رفع شعار' : 'Upload Logo'}
              </Button>
              {formData.receiptLogoBase64 && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleChange('receiptLogoBase64', '')}
                >
                  {isArabic ? 'حذف الشعار' : 'Remove Logo'}
                </Button>
              )}
            </div>
            {formData.receiptLogoBase64 && (
              <img
                src={formData.receiptLogoBase64}
                alt="Receipt logo preview"
                className="h-16 object-contain rounded border border-border p-2 bg-white"
              />
            )}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adminPin">{isArabic ? 'رمز المدير (Admin PIN)' : 'Admin PIN'}</Label>
            <Input
              id="adminPin"
              type="password"
              value={formData.adminPin || ''}
              onChange={(e) => handleChange('adminPin', e.target.value)}
              placeholder="1234"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerPin">{isArabic ? 'رمز المالك (Owner PIN)' : 'Owner PIN'}</Label>
            <Input
              id="ownerPin"
              type="password"
              value={formData.ownerPin || ''}
              onChange={(e) => handleChange('ownerPin', e.target.value)}
              placeholder="9999"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cashierPin">{isArabic ? 'رمز الكاشير (Cashier PIN)' : 'Cashier PIN'}</Label>
            <Input
              id="cashierPin"
              type="password"
              value={formData.cashierPin || ''}
              onChange={(e) => handleChange('cashierPin', e.target.value)}
              placeholder="0000"
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formData.requirePin !== false}
              onChange={(e) => handleChange('requirePin', e.target.checked)}
            />
            <span>{isArabic ? 'تفعيل شاشة القفل بالرمز' : 'Enable PIN lock screen'}</span>
          </label>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button className="flex-1" onClick={handleSave}>
              {t('saveSettings')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
