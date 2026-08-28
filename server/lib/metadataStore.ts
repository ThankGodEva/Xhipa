import fs from 'fs';
import path from 'path';

interface BusinessMetaRecord {
  banner_url?: string;
  [key: string]: any;
}

const META_FILE_PATH = path.join(process.cwd(), 'data/business_metadata.json');

function ensureDirectoryExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function readAllMetadata(): Record<string, BusinessMetaRecord> {
  try {
    if (!fs.existsSync(META_FILE_PATH)) {
      return {};
    }
    const raw = fs.readFileSync(META_FILE_PATH, 'utf-8');
    return JSON.parse(raw) || {};
  } catch (err) {
    console.error('Error reading business metadata store:', err);
    return {};
  }
}

function writeAllMetadata(data: Record<string, BusinessMetaRecord>): void {
  try {
    ensureDirectoryExists(META_FILE_PATH);
    fs.writeFileSync(META_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing business metadata store:', err);
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
