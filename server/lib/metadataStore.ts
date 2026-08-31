interface BusinessMetaRecord {
  banner_url?: string;
  [key: string]: any;
}

const memoryMetadataStore = new Map<string, BusinessMetaRecord>();

function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && Boolean(process.versions?.node);
}

function readAllMetadata(): Record<string, BusinessMetaRecord> {
  if (!isNodeEnvironment()) {
    const obj: Record<string, BusinessMetaRecord> = {};
    memoryMetadataStore.forEach((v, k) => { obj[k] = v; });
    return obj;
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const metaFilePath = path.join(process.cwd(), 'data/business_metadata.json');
    if (!fs.existsSync(metaFilePath)) {
      return {};
    }
    const raw = fs.readFileSync(metaFilePath, 'utf-8');
    return JSON.parse(raw) || {};
  } catch (err) {
    const obj: Record<string, BusinessMetaRecord> = {};
    memoryMetadataStore.forEach((v, k) => { obj[k] = v; });
    return obj;
  }
}

function writeAllMetadata(data: Record<string, BusinessMetaRecord>): void {
  Object.entries(data).forEach(([k, v]) => {
    memoryMetadataStore.set(k, v);
  });

  if (!isNodeEnvironment()) {
    return;
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const metaFilePath = path.join(process.cwd(), 'data/business_metadata.json');
    const dirname = path.dirname(metaFilePath);
    if (!fs.existsSync(dirname)) {
      fs.mkdirSync(dirname, { recursive: true });
    }
    fs.writeFileSync(metaFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // ignore
  }
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
