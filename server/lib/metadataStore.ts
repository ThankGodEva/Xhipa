interface BusinessMetaRecord {
  banner_url?: string;
  [key: string]: any;
}

const memoryMetadataStore = new Map<string, BusinessMetaRecord>();

function readAllMetadata(): Record<string, BusinessMetaRecord> {
  const obj: Record<string, BusinessMetaRecord> = {};
  memoryMetadataStore.forEach((v, k) => { obj[k] = v; });
  return obj;
}

function writeAllMetadata(data: Record<string, BusinessMetaRecord>): void {
  Object.entries(data).forEach(([k, v]) => {
    memoryMetadataStore.set(k, v);
  });
}

export function getBusinessMetadata(businessId: string): BusinessMetaRecord {
  if (!businessId) return {};
  const all = readAllMetadata();
  return all[businessId] || {};
}

export function setBusinessMetadata(businessId: string, meta: Partial<BusinessMetaRecord>): BusinessMetaRecord {
  if (!businessId) return {};
  const all = readAllMetadata();
  const existing = all[businessId] || {};
  const updated = { ...existing, ...meta };
  all[businessId] = updated;
  writeAllMetadata(all);
  return updated;
}

export function getBusinessBanner(businessId: string): string {
  const meta = getBusinessMetadata(businessId);
  return meta.banner_url || '';
}

export function setBusinessBanner(businessId: string, bannerUrl: string): void {
  setBusinessMetadata(businessId, { banner_url: bannerUrl });
}
