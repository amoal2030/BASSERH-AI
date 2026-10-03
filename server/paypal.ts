import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import {
  getPageById,
  updatePageMaxComments,
  createPaymentRecord,
  getPaymentByOrderId,
  updatePaymentStatus,
} from './db.ts';

export interface PaymentPackage {
  id: string;
  nameAr: string;
  nameEn: string;
  maxComments: number;
  amount: string; // Server authoritative price
  currency: string; // 'USD'
  popular?: boolean;
  badge?: string;
  descriptionAr: string;
  descriptionEn: string;
}

// Server-authoritative package pricing dictionary (NEVER manipulated by client)
export const PAYMENT_PACKAGES: Record<string, PaymentPackage> = {
  pkg_100: {
    id: 'pkg_100',
    nameAr: 'باقة الانطلاق (100 تعليق)',
    nameEn: 'Starter Pack (100 Comments)',
    maxComments: 100,
    amount: '4.99',
    currency: 'USD',
    descriptionAr: 'مناسبة للمجموعات الصغيرة واستطلاعات الرأي السريعة',
    descriptionEn: 'Ideal for small groups and quick feedback sessions',
  },
  pkg_1000: {
    id: 'pkg_1000',
    nameAr: 'باقة المحترفين (1,000 تعليق)',
    nameEn: 'Pro Pack (1,000 Comments)',
    maxComments: 1000,
    amount: '14.99',
    currency: 'USD',
    popular: true,
    badge: 'الأكثر طلباً',
    descriptionAr: 'الخيار المثالي لمنشئي المحتوى، الفرق والمشاريع الناشئة',
    descriptionEn: 'The most popular tier for creators, teams and growing projects',
  },
  pkg_10000: {
    id: 'pkg_10000',
    nameAr: 'باقة الأعمال (10,000 تعليق)',
    nameEn: 'Business Pack (10,000 Comments)',
    maxComments: 10000,
    amount: '49.99',
    currency: 'USD',
    badge: 'قيمة فائقة',
    descriptionAr: 'للحملات الترويجية والمسابقات والاستبيانات واسعة النطاق',
    descriptionEn: 'Built for large-scale campaigns, contests, and surveys',
  },
  pkg_100000: {
    id: 'pkg_100000',
    nameAr: 'باقة المؤثرين (100,000 تعليق)',
    nameEn: 'Enterprise Pack (100,000 Comments)',
    maxComments: 100000,
    amount: '149.99',
    currency: 'USD',
    descriptionAr: 'للمؤثرين والمنظمات التي تستقبل تفاعلات ضخمة ومستمرة',
    descriptionEn: 'For influencers and organizations with massive audience engagement',
  },
  pkg_1000000: {
    id: 'pkg_1000000',
    nameAr: 'باقة المليون (1,000,000 تعليق)',
    nameEn: 'VIP Million Pack (1,000,000 Comments)',
    maxComments: 1000000,
    amount: '499.99',
    currency: 'USD',
    badge: 'سعة غير محدودة تقريباً',
    descriptionAr: 'أقصى طاقة استيعابية للمنصات الكبرى والمناسبات الوطنية',
    descriptionEn: 'Highest capacity for large platforms and national-scale events',
  },
};

export function getPayPalConfig() {
  // Always ensure .env changes on disk are refreshed in process.env
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
    }
  } catch (e) {}

  const rawMode = (process.env.PAYPAL_MODE || 'sandbox').trim().toLowerCase();
  const mode = rawMode === 'live' ? 'live' : 'sandbox';
  const clientId = (process.env.PAYPAL_CLIENT_ID || '').trim();
  const clientSecret = (process.env.PAYPAL_CLIENT_SECRET || '').trim();
  const baseUrl =
    mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

  const isConfigured = Boolean(
    clientId &&
    clientSecret &&
    clientId !== 'YOUR_PAYPAL_CLIENT_ID' &&
    clientSecret !== 'YOUR_PAYPAL_CLIENT_SECRET' &&
    clientId !== 'YOUR_PAYPAL_SANDBOX_CLIENT_ID' &&
    clientSecret !== 'YOUR_PAYPAL_SANDBOX_CLIENT_SECRET' &&
    !clientId.includes('ضع_هنا') &&
    !clientSecret.includes('ضع_هنا')
  );

  return {
    mode,
    clientId,
    clientSecret,
    baseUrl,
    isConfigured,
  };
}

/**
 * Retrieves OAuth 2.0 Access Token from PayPal REST API (Live or Sandbox)
 */
export async function getPayPalAccessToken(): Promise<string> {
  const config = getPayPalConfig();
  const modeLabel = config.mode === 'live' ? 'Live' : 'Sandbox';
  if (!config.isConfigured) {
    throw new Error(
      `إعدادات PayPal (${modeLabel}) غير مكتملة. يرجى إضافة PAYPAL_CLIENT_ID و PAYPAL_CLIENT_SECRET في ملف .env بالخادم.`
    );
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const res = await fetch(`${config.baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const errorData = await res.text();
    console.error(`PayPal ${modeLabel} OAuth token error:`, errorData);
    throw new Error(
      `فشل التحقق من حساب PayPal (${modeLabel}) عبر OAuth. تأكد من صحة PAYPAL_CLIENT_ID و PAYPAL_CLIENT_SECRET لبيئة ${modeLabel} في ملف .env.`
    );
  }

  const data = (await res.json()) as { access_token: string; token_type: string };
  return data.access_token;
}

/**
 * Creates a real PayPal Order (Intent: CAPTURE) using official Live/Sandbox API
 */
export async function createPayPalOrder(params: {
  pageId: string;
  packageId: string;
  userId: string;
  appBaseUrl: string;
}): Promise<{
  success: boolean;
  orderId: string;
  approvalUrl: string;
  package: PaymentPackage;
  mode: string;
}> {
  const pkg = PAYMENT_PACKAGES[params.packageId];
  if (!pkg) {
    throw new Error('الباقة المحددة غير موجودة أو غير صالحة.');
  }

  const page = getPageById(params.pageId);
  if (!page) {
    throw new Error('الصفحة غير موجودة.');
  }
  if (page.user_id !== params.userId) {
    throw new Error('غير مصرح لك بترقية هذه الصفحة لأنك لست صاحبها.');
  }

  const config = getPayPalConfig();
  const modeLabel = config.mode === 'live' ? 'Live' : 'Sandbox';

  // Strict check: No Mock/Simulated payments allowed
  if (!config.isConfigured) {
    throw new Error(
      `إعدادات PayPal (${modeLabel}) غير مكتملة في الخادم. يرجى إضافة PAYPAL_CLIENT_ID و PAYPAL_CLIENT_SECRET في ملف .env للاتصال بـ PayPal ${modeLabel} الحقيقي.`
    );
  }

  const accessToken = await getPayPalAccessToken();
  const returnUrl = `${params.appBaseUrl}/payment/success?page_id=${params.pageId}&pkg=${pkg.id}`;
  const cancelUrl = `${params.appBaseUrl}/payment/cancel?page_id=${params.pageId}`;

  const orderPayload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        reference_id: params.pageId,
        description: `Baseera AI - ${pkg.nameEn}`,
        custom_id: `${params.pageId}:${pkg.id}:${params.userId}`,
        amount: {
          currency_code: pkg.currency,
          value: pkg.amount,
          breakdown: {
            item_total: {
              currency_code: pkg.currency,
              value: pkg.amount,
            },
          },
        },
        items: [
          {
            name: pkg.nameAr,
            description: `ترقية سعة التعليقات إلى ${pkg.maxComments.toLocaleString()} تعليق`,
            unit_amount: {
              currency_code: pkg.currency,
              value: pkg.amount,
            },
            quantity: '1',
            category: 'DIGITAL_GOODS',
          },
        ],
      },
    ],
    application_context: {
      brand_name: 'Baseera AI',
      landing_page: 'NO_PREFERENCE',
      user_action: 'PAY_NOW',
      return_url: returnUrl,
      cancel_url: cancelUrl,
    },
  };

  const res = await fetch(`${config.baseUrl}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`PayPal ${modeLabel} create order error:`, errText);
    throw new Error(`فشل إنشاء طلب الدفع في PayPal (${modeLabel}). يرجى مراجعة الصلاحيات في PayPal Developer.`);
  }

  const orderData = (await res.json()) as {
    id: string;
    status: string;
    links: Array<{ rel: string; href: string; method: string }>;
  };

  const approveLink = orderData.links.find(link => link.rel === 'approve');
  if (!approveLink || !approveLink.href) {
    throw new Error(`لم يتم استلام رابط الموافقة من PayPal (${modeLabel}).`);
  }

  // Save initial payment record in database
  createPaymentRecord({
    id: 'pay_' + crypto.randomBytes(8).toString('hex'),
    user_id: params.userId,
    page_id: params.pageId,
    package: pkg.id,
    amount: parseFloat(pkg.amount),
    currency: pkg.currency,
    paypal_order_id: orderData.id,
    status: 'CREATED',
  });

  return {
    success: true,
    orderId: orderData.id,
    approvalUrl: approveLink.href,
    package: pkg,
    mode: config.mode,
  };
}

/**
 * Captures a real PayPal Order, enforces idempotency, and upgrades page limit
 */
export async function capturePayPalOrder(params: {
  orderId: string;
  pageId: string;
  userId: string;
}): Promise<{
  success: boolean;
  alreadyProcessed?: boolean;
  captureId: string;
  newMaxComments: number;
  amount: number;
  currency: string;
  package: PaymentPackage;
  pageTitle: string;
}> {
  const existingPayment = getPaymentByOrderId(params.orderId);
  if (!existingPayment) {
    throw new Error('عملية الدفع غير مسجلة في النظام أو انتهت صلاحيتها.');
  }

  const pkg = PAYMENT_PACKAGES[existingPayment.package];
  if (!pkg) {
    throw new Error('باقة الدفع غير صالحة.');
  }

  const page = getPageById(existingPayment.page_id);
  if (!page) {
    throw new Error('الصفحة المستهدفة بالترقية غير موجودة.');
  }

  // Idempotency check: If already completed, prevent double upgrade/capture
  if (existingPayment.status === 'COMPLETED') {
    return {
      success: true,
      alreadyProcessed: true,
      captureId: existingPayment.paypal_capture_id || existingPayment.paypal_order_id,
      newMaxComments: page.max_comments,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
      package: pkg,
      pageTitle: page.question,
    };
  }

  const config = getPayPalConfig();
  const modeLabel = config.mode === 'live' ? 'Live' : 'Sandbox';

  // Strict check: No Mock/Simulated payments allowed
  if (!config.isConfigured) {
    throw new Error(
      `إعدادات PayPal (${modeLabel}) غير مكتملة في الخادم. يرجى إضافة PAYPAL_CLIENT_ID و PAYPAL_CLIENT_SECRET في ملف .env.`
    );
  }

  const accessToken = await getPayPalAccessToken();

  const res = await fetch(`${config.baseUrl}/v2/checkout/orders/${params.orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  const captureData = (await res.json()) as any;

  if (!res.ok) {
    console.error(`PayPal ${modeLabel} capture error response:`, captureData);
    updatePaymentStatus(params.orderId, 'FAILED');
    throw new Error(
      captureData?.message ||
        `فشل تأكيد الدفع من PayPal (${modeLabel}). يرجى التأكد من الموافقة على الدفع.`
    );
  }

  const captureStatus =
    captureData.status ||
    captureData.purchase_units?.[0]?.payments?.captures?.[0]?.status;

  if (captureStatus !== 'COMPLETED') {
    updatePaymentStatus(params.orderId, captureStatus || 'FAILED');
    throw new Error(`حالة الدفع غير مكتملة في PayPal: ${captureStatus}`);
  }

  const captureId =
    captureData.purchase_units?.[0]?.payments?.captures?.[0]?.id ||
    captureData.id ||
    'cap_' + Date.now();

  // 1. Mark payment as COMPLETED in database
  updatePaymentStatus(params.orderId, 'COMPLETED', captureId);

  // 2. Upgrade the maximum comments limit for the page
  updatePageMaxComments(page.id, pkg.maxComments);

  return {
    success: true,
    captureId,
    newMaxComments: pkg.maxComments,
    amount: existingPayment.amount,
    currency: existingPayment.currency,
    package: pkg,
    pageTitle: page.question,
  };
}
