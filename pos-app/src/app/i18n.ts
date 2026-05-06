import { Language } from './types';

interface Translations {
  en: Record<string, string>;
  ar: Record<string, string>;
}

export const translations: Translations = {
  en: {
    // Top Bar
    'online': 'Online',
    'offline': 'Offline',
    'exchangeRate': 'Exchange Rate',
    'setRate': 'Set',
    'autoRate': 'Auto',
    'theme': 'Theme',
    'language': 'Language',
    'settings': 'Settings',
    'help': 'Help & Shortcuts',

    // Product Area
    'searchProducts': 'Search products...',
    'allProducts': 'All',
    'drinks': 'Drinks',
    'food': 'Food',
    'bakery': 'Bakery',
    'other': 'Other',
    'inStock': 'In Stock',
    'lowStock': 'Low Stock',
    'outOfStock': 'Out of Stock',
    'addCustomItem': 'Add Custom Item',
    'productName': 'Product Name',
    'price': 'Price',
    'barcode': 'Barcode',
    'category': 'Category',
    'stock': 'Stock',
    'cost': 'Cost',
    'save': 'Save',
    'cancel': 'Cancel',
    'edit': 'Edit',
    'delete': 'Delete',
    'exportProducts': 'Export Products',
    'importProducts': 'Import Products',
    'backupDB': 'Backup Database',
    'restoreDB': 'Restore Database',
    'noProducts': 'No products found',
    'noResults': 'No results for your search',

    // Cart Area
    'cart': 'Cart',
    'emptyCart': 'Your cart is empty',
    'addProducts': 'Add products to get started',
    'qty': 'Qty',
    'remove': 'Remove',
    'applyDiscount': 'Apply Discount',
    'discountCode': 'Discount Code',
    'apply': 'Apply',
    'subtotal': 'Subtotal',
    'tax': 'Tax',
    'totalUSD': 'Total (USD)',
    'totalLocal': 'Total',
    'exchangeRateHint': 'Rate',
    'checkout': 'Checkout',
    'clearCart': 'Clear Cart',

    // Reports
    'reports': 'Reports',
    'startDate': 'Start Date',
    'endDate': 'End Date',
    'generateReport': 'Generate Report',
    'dashboard': 'Dashboard',
    'exportCSV': 'Export CSV',
    'history': 'History',

    // Payment Modal
    'payment': 'Payment',
    'selectPaymentMethod': 'Select Payment Method',
    'cash': 'Cash',
    'card': 'Card',
    'mobile': 'Mobile',
    'splitPayment': 'Split Payment',
    'amountDue': 'Amount Due',
    'amountPaid': 'Amount Paid',
    'change': 'Change',
    'remaining': 'Remaining',
    'payUSD': 'Pay in USD',
    'payLocal': 'Pay in',
    'completePayment': 'Complete Payment',

    // Receipt Modal
    'receipt': 'Receipt',
    'print': 'Print',
    'close': 'Close',
    'thermal58mm': '58mm Thermal',
    'thermal80mm': '80mm Thermal',
    'date': 'Date',
    'time': 'Time',
    'transactionId': 'Transaction ID',
    'item': 'Item',
    'quantity': 'Quantity',
    'total': 'Total',
    'paymentMethod': 'Payment Method',
    'thankYou': 'Thank you for your purchase!',

    // Sales History
    'salesHistory': 'Sales History',
    'voided': 'Voided',
    'completed': 'Completed',
    'viewReceipt': 'View Receipt',
    'voidTransaction': 'Void Transaction',
    'noTransactions': 'No transactions found',

    // Analytics Dashboard
    'analytics': 'Analytics',
    'overview': 'Overview',
    'totalRevenue': 'Total Revenue',
    'transactions': 'Transactions',
    'averageTicket': 'Average Ticket',
    'topProducts': 'Top Products',
    'hourlySales': 'Hourly Sales',
    'paymentMethods': 'Payment Methods',
    'revenue': 'Revenue',
    'items': 'Items',

    // Settings Modal
    'generalSettings': 'General Settings',
    'storeName': 'Store Name',
    'taxRate': 'Tax Rate',
    'localCurrency': 'Local Currency',
    'loyaltyRate': 'Loyalty Rate',
    'saveSettings': 'Save Settings',

    // Keyboard Shortcuts
    'keyboardShortcuts': 'Keyboard Shortcuts',
    'searchKey': 'Search products',
    'checkoutKey': 'Checkout',
    'clearKey': 'Clear cart',
    'helpKey': 'Help',

    // PWA
    'installApp': 'Install App',
    'installMessage': 'Install this app for a better offline experience',
    'install': 'Install',
    'notNow': 'Not Now',

    // Offline
    'offlineMode': 'You are currently offline. Some features may be limited.',
  },
  ar: {
    // Top Bar
    'online': 'متصل',
    'offline': 'غير متصل',
    'exchangeRate': 'سعر الصرف',
    'setRate': 'تعيين',
    'autoRate': 'تلقائي',
    'theme': 'المظهر',
    'language': 'اللغة',
    'settings': 'الإعدادات',
    'help': 'المساعدة والاختصارات',

    // Product Area
    'searchProducts': 'البحث عن المنتجات...',
    'allProducts': 'الكل',
    'drinks': 'المشروبات',
    'food': 'الطعام',
    'bakery': 'المخبوزات',
    'other': 'أخرى',
    'inStock': 'متوفر',
    'lowStock': 'مخزون منخفض',
    'outOfStock': 'نفذ المخزون',
    'addCustomItem': 'إضافة منتج مخصص',
    'productName': 'اسم المنتج',
    'price': 'السعر',
    'barcode': 'الباركود',
    'category': 'الفئة',
    'stock': 'المخزون',
    'cost': 'التكلفة',
    'save': 'حفظ',
    'cancel': 'إلغاء',
    'edit': 'تعديل',
    'delete': 'حذف',
    'exportProducts': 'تصدير المنتجات',
    'importProducts': 'استيراد المنتجات',
    'backupDB': 'نسخ احتياطي لقاعدة البيانات',
    'restoreDB': 'استعادة قاعدة البيانات',
    'noProducts': 'لا توجد منتجات',
    'noResults': 'لا توجد نتائج لبحثك',

    // Cart Area
    'cart': 'السلة',
    'emptyCart': 'السلة فارغة',
    'addProducts': 'أضف منتجات للبدء',
    'qty': 'الكمية',
    'remove': 'إزالة',
    'applyDiscount': 'تطبيق الخصم',
    'discountCode': 'كود الخصم',
    'apply': 'تطبيق',
    'subtotal': 'المجموع الفرعي',
    'tax': 'الضريبة',
    'totalUSD': 'المجموع (دولار)',
    'totalLocal': 'المجموع',
    'exchangeRateHint': 'السعر',
    'checkout': 'الدفع',
    'clearCart': 'مسح السلة',

    // Reports
    'reports': 'التقارير',
    'startDate': 'تاريخ البداية',
    'endDate': 'تاريخ النهاية',
    'generateReport': 'إنشاء تقرير',
    'dashboard': 'لوحة القيادة',
    'exportCSV': 'تصدير CSV',
    'history': 'السجل',

    // Payment Modal
    'payment': 'الدفع',
    'selectPaymentMethod': 'اختر طريقة الدفع',
    'cash': 'نقداً',
    'card': 'بطاقة',
    'mobile': 'محفظة إلكترونية',
    'splitPayment': 'دفع مقسم',
    'amountDue': 'المبلغ المستحق',
    'amountPaid': 'المبلغ المدفوع',
    'change': 'الباقي',
    'remaining': 'المتبقي',
    'payUSD': 'الدفع بالدولار',
    'payLocal': 'الدفع بـ',
    'completePayment': 'إتمام الدفع',

    // Receipt Modal
    'receipt': 'الإيصال',
    'print': 'طباعة',
    'close': 'إغلاق',
    'thermal58mm': '58 ملم حراري',
    'thermal80mm': '80 ملم حراري',
    'date': 'التاريخ',
    'time': 'الوقت',
    'transactionId': 'رقم المعاملة',
    'item': 'المنتج',
    'quantity': 'الكمية',
    'total': 'المجموع',
    'paymentMethod': 'طريقة الدفع',
    'thankYou': 'شكراً لك على الشراء!',

    // Sales History
    'salesHistory': 'سجل المبيعات',
    'voided': 'ملغى',
    'completed': 'مكتمل',
    'viewReceipt': 'عرض الإيصال',
    'voidTransaction': 'إلغاء المعاملة',
    'noTransactions': 'لا توجد معاملات',

    // Analytics Dashboard
    'analytics': 'التحليلات',
    'overview': 'نظرة عامة',
    'totalRevenue': 'إجمالي الإيرادات',
    'transactions': 'المعاملات',
    'averageTicket': 'متوسط الفاتورة',
    'topProducts': 'المنتجات الأكثر مبيعاً',
    'hourlySales': 'المبيعات بالساعة',
    'paymentMethods': 'طرق الدفع',
    'revenue': 'الإيرادات',
    'items': 'العناصر',

    // Settings Modal
    'generalSettings': 'الإعدادات العامة',
    'storeName': 'اسم المتجر',
    'taxRate': 'معدل الضريبة',
    'localCurrency': 'العملة المحلية',
    'loyaltyRate': 'معدل الولاء',
    'saveSettings': 'حفظ الإعدادات',

    // Keyboard Shortcuts
    'keyboardShortcuts': 'اختصارات لوحة المفاتيح',
    'searchKey': 'البحث عن المنتجات',
    'checkoutKey': 'الدفع',
    'clearKey': 'مسح السلة',
    'helpKey': 'المساعدة',

    // PWA
    'installApp': 'تثبيت التطبيق',
    'installMessage': 'قم بتثبيت هذا التطبيق للحصول على تجربة أفضل في وضع عدم الاتصال',
    'install': 'تثبيت',
    'notNow': 'ليس الآن',

    // Offline
    'offlineMode': 'أنت حالياً غير متصل. قد تكون بعض الميزات محدودة.',
  },
};

export const useTranslation = (lang: Language) => {
  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  return { t };
};
