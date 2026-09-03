import { config } from '../config';
import { CustomDomainValidationRecord, DnsInstructionRecord } from '../../src/types';

export interface CloudflareCustomHostnameResult {
  id: string;
  hostname: string;
  status: string; // 'pending', 'active', 'blocked', 'provisioned', etc.
  ssl?: {
    id?: string;
    type?: string;
    method?: string;
    status?: string; // 'initializing', 'pending_validation', 'pending_issuance', 'pending_deployment', 'active', 'deleted'
    validation_records?: Array<{
      status?: string;
      txt_name?: string;
      txt_value?: string;
      http_url?: string;
      http_body?: string;
    }>;
    validation_errors?: any[];
  };
  ownership_verification?: {
    type: string;
    name: string;
    value: string;
  };
  verification_errors?: string[];
  created_at?: string;
}

export class CloudflareSaasService {
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${config.cloudflareApiToken}`,
      'Content-Type': 'application/json'
    };
  }

  public isConfigured(): boolean {
    return Boolean(config.cloudflareApiToken && config.cloudflareZoneId);
  }

  public getSaasTarget(): string {
    return config.cloudflareSaasTarget || 'saas.xhipa.com';
  }

  /**
   * Registers a custom hostname in Cloudflare for SaaS
   */
  async createCustomHostname(hostname: string): Promise<{
    success: boolean;
    data?: CloudflareCustomHostnameResult;
    error?: string;
    isSimulated?: boolean;
  }> {
    if (!this.isConfigured()) {
      // Graceful fallback for local development or preview environments when Cloudflare token is not injected
      const simulatedId = `cf_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return {
        success: true,
        isSimulated: true,
        data: {
          id: simulatedId,
          hostname,
          status: 'pending',
          ssl: {
            status: 'pending_validation',
            method: 'http',
            type: 'dv'
          },
          ownership_verification: {
            type: 'txt',
            name: `_cf-custom-hostname.${hostname}`,
            value: `cf-verify-${Date.now().toString(36)}`
          }
        }
      };
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/zones/${config.cloudflareZoneId}/custom_hostnames`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          hostname,
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              min_tls_version: '1.2',
              http2: 'on'
            }
          }
        })
      });

      const resJson = await response.json() as any;

      if (!response.ok || !resJson.success) {
        const errorMsg = resJson.errors?.[0]?.message || 'Failed to register custom hostname with Cloudflare.';
        // If already exists on Cloudflare, search for it
        if (errorMsg.includes('already exists') || resJson.errors?.[0]?.code === 1406) {
          const existing = await this.findCustomHostnameByHostname(hostname);
          if (existing) {
            return { success: true, data: existing };
          }
        }
        return { success: false, error: errorMsg };
      }

      return {
        success: true,
        data: resJson.result
      };
    } catch (err: any) {
      console.error('[Cloudflare SaaS] Error creating custom hostname:', err);
      return {
        success: false,
        error: err.message || 'Network error communicating with Cloudflare.'
      };
    }
  }

  /**
   * Finds an existing custom hostname by domain string
   */
  async findCustomHostnameByHostname(hostname: string): Promise<CloudflareCustomHostnameResult | null> {
    if (!this.isConfigured()) return null;

    try {
      const url = `https://api.cloudflare.com/client/v4/zones/${config.cloudflareZoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const resJson = await response.json() as any;
      if (response.ok && resJson.success && resJson.result && resJson.result.length > 0) {
        return resJson.result[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Fetches latest status and SSL verification data for a custom hostname
   */
  async getCustomHostname(customHostnameId: string): Promise<{
    success: boolean;
    data?: CloudflareCustomHostnameResult;
    error?: string;
  }> {
    if (!this.isConfigured() || customHostnameId.startsWith('cf_sim_')) {
      return {
        success: true,
        data: {
          id: customHostnameId,
          hostname: '',
          status: 'pending',
          ssl: { status: 'pending_validation' }
        }
      };
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/zones/${config.cloudflareZoneId}/custom_hostnames/${customHostnameId}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders()
      });

      const resJson = await response.json() as any;
      if (!response.ok || !resJson.success) {
        return {
          success: false,
          error: resJson.errors?.[0]?.message || 'Failed to fetch status from Cloudflare.'
        };
      }

      return {
        success: true,
        data: resJson.result
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to query Cloudflare Custom Hostname API.'
      };
    }
  }

  /**
   * Removes a custom hostname from Cloudflare for SaaS
   */
  async deleteCustomHostname(customHostnameId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConfigured() || customHostnameId.startsWith('cf_sim_')) {
      return { success: true };
    }

    try {
      const url = `https://api.cloudflare.com/client/v4/zones/${config.cloudflareZoneId}/custom_hostnames/${customHostnameId}`;
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders()
      });

      const resJson = await response.json() as any;
      if (!response.ok && !resJson.success) {
        // If not found, it's already deleted
        if (response.status === 404) {
          return { success: true };
        }
        return {
          success: false,
          error: resJson.errors?.[0]?.message || 'Failed to delete custom hostname on Cloudflare.'
        };
      }

      return { success: true };
    } catch (err: any) {
      console.warn('[Cloudflare SaaS] Delete hostname warning:', err);
      return { success: true }; // Best effort delete
    }
  }

  /**
   * Generates complete, user-friendly DNS configuration instructions for a merchant
   */
  generateDnsInstructions(
    hostname: string,
    isApex: boolean,
    cfData?: CloudflareCustomHostnameResult | null
  ): {
    cname: {
      type: string;
      name: string;
      target: string;
      description: string;
    };
    txtVerification?: {
      type: string;
      name: string;
      value: string;
      description: string;
    };
    records: DnsInstructionRecord[];
    isApex: boolean;
    apexGuidance?: string;
  } {
    const saasTarget = this.getSaasTarget();
    const records: DnsInstructionRecord[] = [];

    // 1. Primary routing record (CNAME or ALIAS for apex)
    const hostParts = hostname.split('.');
    const hostPrefix = isApex ? '@' : hostParts[0];

    records.push({
      type: 'CNAME',
      name: hostPrefix,
      value: saasTarget,
      target: saasTarget,
      description: isApex 
        ? `Point your root domain (@) to ${saasTarget} via CNAME or ALIAS/ANAME record.` 
        : `Point your subdomain (${hostPrefix}) to ${saasTarget} via CNAME record.`,
      status: cfData?.status === 'active' ? 'active' : 'pending'
    });

    let txtVerification: { type: string; name: string; value: string; description: string } | undefined;

    // 2. Ownership verification TXT record if provided by Cloudflare
    if (cfData?.ownership_verification?.name && cfData?.ownership_verification?.value) {
      txtVerification = {
        type: 'TXT',
        name: cfData.ownership_verification.name,
        value: cfData.ownership_verification.value,
        description: 'Cloudflare domain ownership verification record.'
      };
      records.push({
        type: 'TXT',
        name: cfData.ownership_verification.name,
        value: cfData.ownership_verification.value,
        description: 'Cloudflare domain ownership verification record.',
        status: cfData.status === 'active' ? 'verified' : 'pending'
      });
    }

    // 3. SSL DCV (Domain Control Validation) TXT records if SSL method requires TXT
    const sslValidationRecords = cfData?.ssl?.validation_records || [];
    for (const vr of sslValidationRecords) {
      if (vr.txt_name && vr.txt_value) {
        records.push({
          type: 'TXT',
          name: vr.txt_name,
          value: vr.txt_value,
          description: 'SSL Certificate Validation Record',
          status: vr.status || 'pending'
        });
      }
    }

    let apexGuidance: string | undefined;
    if (isApex) {
      apexGuidance = `Note: Connecting an apex domain (${hostname}) requires your DNS provider to support CNAME flattening or ALIAS records. Alternatively, we recommend connecting a subdomain like shop.${hostname} or store.${hostname}.`;
    }

    return {
      cname: {
        type: 'CNAME',
        name: hostPrefix,
        target: saasTarget,
        description: `Direct domain traffic to Xhipa edge infrastructure`
      },
      txtVerification,
      records,
      isApex,
      apexGuidance
    };
  }
}

export const cloudflareSaasService = new CloudflareSaasService();
