const configuredMenuBaseUrl = process.env.NEXT_PUBLIC_MENU_BASE_URL;

export const DEFAULT_MENU_BASE_URL =
  configuredMenuBaseUrl && !configuredMenuBaseUrl.includes('api-ops.sagansa.id')
    ? configuredMenuBaseUrl
    : 'https://menu.sagansa.id';

type BuildMenuOrderUrlParams = {
  baseUrl: string;
  tenantId: string;
  storeId: string;
  tableCode?: string;
  orderType?: 'dine-in' | 'takeaway';
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeBaseUrl = (value: string) => {
  const trimmed = trimTrailingSlash(value.trim() || DEFAULT_MENU_BASE_URL);
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

export const buildMenuOrderUrl = ({
  baseUrl,
  tenantId,
  storeId,
  tableCode,
  orderType,
}: BuildMenuOrderUrlParams) => {
  const url = new URL(normalizeBaseUrl(baseUrl));
  const normalizedTableCode = tableCode === 'STORE' ? 'TAKEAWAY' : tableCode;
  const normalizedOrderType = orderType || (tableCode === 'STORE' ? 'takeaway' : undefined);

  url.searchParams.set('tenantId', tenantId);
  url.searchParams.set('storeId', storeId);

  if (normalizedTableCode) {
    url.searchParams.set('tableCode', normalizedTableCode);
  }

  if (normalizedOrderType) {
    url.searchParams.set('orderType', normalizedOrderType);
  }

  return url.toString();
};

export const buildQrCodeImageUrl = (data: string, size = 360) => {
  const encodedData = encodeURIComponent(data);

  return `https://api.qrserver.com/v1/create-qr-code/?format=svg&margin=14&size=${size}x${size}&data=${encodedData}`;
};
