import { customDomainRepository } from '../repositories/customDomain.repository';
import { merchantRepository } from '../repositories/merchant.repository';
import { cloudflareSaasService } from './cloudflareSaas.service';
import { storeService } from './store.service';
import { normalizeHostname, validateHostname, isPlatformHostname } from '../lib/hostnameValidator';
import {
  CustomDomain,
  CustomDomainDetailsResponse,
  CustomDomainStatus,
  CustomDomainValidationRecord,
  HostnameResolutionResult,
  PublicStorefrontBundle
} from '../../src/types';

export class CustomDomainService {
  /**
   * Helper: Resolves and authorizes business access for a user
   */
  private async authorizeMerchantBusiness(userId: string, targetBusinessId?: string): Promise<{
    businessId: string;
    role: string;
  }> {
    if (!userId) {
      throw new Error('Unauthorized: Missing user authentication.');
    }

    const membership = await merchantRepository.getMembershipByUserId(userId);
    if (!membership) {
      throw new Error('Unauthorized: No business associated with this merchant account.');
    }

    if (targetBusinessId && membership.business_id !== targetBusinessId) {
      throw new Error('Forbidden: Access denied to the requested business.');
    }

    return {
      businessId: membership.business_id,
      role: membership.role
    };
  }

  /**
   * List all custom domains for a merchant's business
   */
  async listDomains(userId: string, businessId?: string): Promise<CustomDomainDetailsResponse[]> {
    const auth = await this.authorizeMerchantBusiness(userId, businessId);
    const domains = await customDomainRepository.getDomainsByBusinessId(auth.businessId);

    return domains.map(domain => {
      const val = validateHostname(domain.hostname);
      const dnsInstructions = cloudflareSaasService.generateDnsInstructions(
        domain.hostname,
        val.isApex,
        {
          id: domain.cloudflare_hostname_id || '',
          hostname: domain.hostname,
          status: domain.cloudflare_status || domain.status,
          ssl: {
            status: domain.cloudflare_ssl_status || domain.ssl_status,
            validation_records: domain.validation_records
          }
        }
      );

      return {
        domain,
        dnsInstructions
      };
    });
  }

  /**
   * Register and connect a new custom domain
   */
  async createDomain(
    userId: string,
    rawHostname: string,
    businessId?: string
  ): Promise<CustomDomainDetailsResponse> {
    const auth = await this.authorizeMerchantBusiness(userId, businessId);

    // Only owner or admin can configure domains
    if (auth.role !== 'owner' && auth.role !== 'admin') {
      throw new Error('Permission denied: Only store owners and administrators can manage custom domains.');
    }

    // 1. Strict validation & normalization
    const validation = validateHostname(rawHostname);
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid domain name.');
    }

    const normalized = validation.normalized;

    // 2. Check if domain already registered in platform
    const existing = await customDomainRepository.getDomainByNormalizedHostname(normalized);
    if (existing) {
      if (existing.business_id === auth.businessId) {
        throw new Error(`The domain "${normalized}" is already attached to your store.`);
      } else {
        throw new Error(`The domain "${normalized}" is already registered by another merchant.`);
      }
    }

    // 3. Check existing domains count for primary flag calculation
    const existingCount = await customDomainRepository.countDomainsByBusinessId(auth.businessId);
    const isPrimary = existingCount === 0;

    // 4. Register custom hostname with Cloudflare for SaaS
    const cfResult = await cloudflareSaasService.createCustomHostname(normalized);
    let cloudflareHostnameId: string | undefined;
    let cloudflareStatus: string = 'pending';
    let cloudflareSslStatus: string = 'pending_validation';
    let validationRecords: any = [];
    let initialStatus: CustomDomainStatus = 'pending_validation';
    let lastError: string | undefined;

    if (cfResult.success && cfResult.data) {
      cloudflareHostnameId = cfResult.data.id;
      cloudflareStatus = cfResult.data.status || 'pending';
      cloudflareSslStatus = cfResult.data.ssl?.status || 'pending_validation';
      validationRecords = cfResult.data.ssl?.validation_records || [];

      if (cloudflareStatus === 'active' && cloudflareSslStatus === 'active') {
        initialStatus = 'active';
      }
    } else if (cfResult.error) {
      lastError = cfResult.error;
    }

    // 5. Store record in database
    const createdDomain = await customDomainRepository.createCustomDomain({
      business_id: auth.businessId,
      hostname: normalized,
      normalized_hostname: normalized,
      status: initialStatus,
      verification_status: 'pending',
      ssl_status: cloudflareSslStatus,
      cloudflare_hostname_id: cloudflareHostnameId,
      cloudflare_status: cloudflareStatus,
      cloudflare_ssl_status: cloudflareSslStatus,
      validation_records: validationRecords,
      is_primary: isPrimary,
      last_error: lastError
    });

    const dnsInstructions = cloudflareSaasService.generateDnsInstructions(
      normalized,
      validation.isApex,
      cfResult.data
    );

    return {
      domain: createdDomain,
      dnsInstructions
    };
  }

  /**
   * Get single domain details and DNS instructions
   */
  async getDomainDetails(userId: string, domainId: string): Promise<CustomDomainDetailsResponse> {
    const auth = await this.authorizeMerchantBusiness(userId);
    const domain = await customDomainRepository.getDomainById(domainId);

    if (!domain || domain.business_id !== auth.businessId) {
      throw new Error('Custom domain not found or access denied.');
    }

    const val = validateHostname(domain.hostname);
    const dnsInstructions = cloudflareSaasService.generateDnsInstructions(
      domain.hostname,
      val.isApex,
      {
        id: domain.cloudflare_hostname_id || '',
        hostname: domain.hostname,
        status: domain.cloudflare_status || domain.status,
        ssl: {
          status: domain.cloudflare_ssl_status || domain.ssl_status,
          validation_records: domain.validation_records
        }
      }
    );

    return {
      domain,
      dnsInstructions
    };
  }

  /**
   * Check verification & refresh status from Cloudflare
   */
  async refreshDomainStatus(userId: string, domainId: string): Promise<CustomDomainDetailsResponse> {
    const auth = await this.authorizeMerchantBusiness(userId);
    const domain = await customDomainRepository.getDomainById(domainId);

    if (!domain || domain.business_id !== auth.businessId) {
      throw new Error('Custom domain not found or access denied.');
    }

    let updatedDomain = domain;

    if (domain.cloudflare_hostname_id) {
      const cfRes = await cloudflareSaasService.getCustomHostname(domain.cloudflare_hostname_id);

      if (cfRes.success && cfRes.data) {
        const cfData = cfRes.data;
        const cfStatus = cfData.status || domain.cloudflare_status || 'pending';
        const cfSslStatus = cfData.ssl?.status || domain.cloudflare_ssl_status || 'pending_validation';
        const rawValRecords = cfData.ssl?.validation_records || [];
        const valRecords: CustomDomainValidationRecord[] = rawValRecords.length > 0
          ? rawValRecords.map((rec: any) => ({
              type: rec.type || 'TXT',
              name: rec.txt_name || rec.name || '_cf-custom-hostname',
              value: rec.txt_value || rec.value || '',
              status: rec.status,
              txt_name: rec.txt_name,
              txt_value: rec.txt_value
            }))
          : (domain.validation_records || []);

        let newStatus: CustomDomainStatus = domain.status;
        let verifiedAt = domain.verified_at;

        if (cfStatus === 'active' && (cfSslStatus === 'active' || cfSslStatus === 'provisioned')) {
          newStatus = 'active';
          if (!verifiedAt) verifiedAt = new Date().toISOString();
        } else if (cfStatus === 'blocked' || cfSslStatus === 'deleted') {
          newStatus = 'failed';
        }

        updatedDomain = await customDomainRepository.updateDomain(domain.id, {
          status: newStatus,
          verification_status: cfStatus === 'active' ? 'verified' : 'pending',
          ssl_status: cfSslStatus,
          cloudflare_status: cfStatus,
          cloudflare_ssl_status: cfSslStatus,
          validation_records: valRecords,
          verified_at: verifiedAt,
          last_checked_at: new Date().toISOString(),
          last_error: cfRes.error || undefined
        });
      }
    }

    const val = validateHostname(updatedDomain.hostname);
    const dnsInstructions = cloudflareSaasService.generateDnsInstructions(
      updatedDomain.hostname,
      val.isApex,
      {
        id: updatedDomain.cloudflare_hostname_id || '',
        hostname: updatedDomain.hostname,
        status: updatedDomain.cloudflare_status || updatedDomain.status,
        ssl: {
          status: updatedDomain.cloudflare_ssl_status || updatedDomain.ssl_status,
          validation_records: updatedDomain.validation_records
        }
      }
    );

    return {
      domain: updatedDomain,
      dnsInstructions
    };
  }

  /**
   * Set domain as primary for a business
   */
  async setPrimaryDomain(userId: string, domainId: string): Promise<CustomDomain> {
    const auth = await this.authorizeMerchantBusiness(userId);
    const domain = await customDomainRepository.getDomainById(domainId);

    if (!domain || domain.business_id !== auth.businessId) {
      throw new Error('Custom domain not found or access denied.');
    }

    return await customDomainRepository.setPrimaryDomain(auth.businessId, domainId);
  }

  /**
   * Delete custom domain
   */
  async deleteDomain(userId: string, domainId: string): Promise<{ success: boolean }> {
    const auth = await this.authorizeMerchantBusiness(userId);

    if (auth.role !== 'owner' && auth.role !== 'admin') {
      throw new Error('Permission denied: Only store owners and administrators can delete custom domains.');
    }

    const domain = await customDomainRepository.getDomainById(domainId);
    if (!domain || domain.business_id !== auth.businessId) {
      throw new Error('Custom domain not found or access denied.');
    }

    // 1. Delete from Cloudflare
    if (domain.cloudflare_hostname_id) {
      await cloudflareSaasService.deleteCustomHostname(domain.cloudflare_hostname_id);
    }

    // 2. Delete from database
    await customDomainRepository.deleteDomain(domain.id);

    // 3. If the deleted domain was primary, promote another domain if available
    if (domain.is_primary) {
      const remaining = await customDomainRepository.getDomainsByBusinessId(auth.businessId);
      if (remaining.length > 0) {
        await customDomainRepository.setPrimaryDomain(auth.businessId, remaining[0].id);
      }
    }

    return { success: true };
  }

  /**
   * Resolves incoming request hostname to a public storefront bundle
   */
  async resolveStorefrontByHostname(rawHostname: string): Promise<HostnameResolutionResult> {
    const normalized = normalizeHostname(rawHostname);

    if (!normalized || isPlatformHostname(normalized)) {
      return {
        resolved: false,
        status: 'not_found',
        hostname: normalized,
        message: 'Platform or localhost domain.'
      };
    }

    // Query authoritative database for domain association
    const domain = await customDomainRepository.getDomainByNormalizedHostname(normalized);

    if (!domain) {
      return {
        resolved: false,
        status: 'not_found',
        hostname: normalized,
        message: 'This domain is not connected to an active Xhipa store.'
      };
    }

    // Check status
    if (domain.status === 'suspended') {
      return {
        resolved: false,
        status: 'suspended',
        hostname: normalized,
        message: 'This custom domain is currently suspended.'
      };
    }

    if (domain.status === 'pending' || domain.status === 'pending_validation') {
      return {
        resolved: false,
        status: 'pending',
        hostname: normalized,
        message: 'Domain configuration is pending DNS verification.'
      };
    }

    // Domain is active! Resolve the store bundle by business_id
    const business = await merchantRepository.getBusinessById(domain.business_id);
    if (!business || (business.status && business.status === 'suspended')) {
      return {
        resolved: false,
        status: 'not_found',
        hostname: normalized,
        message: 'The store associated with this domain is currently unavailable.'
      };
    }

    const bundle = await storeService.getPublicStorefront(business.slug);
    if (!bundle) {
      return {
        resolved: false,
        status: 'not_found',
        hostname: normalized,
        message: 'Storefront details could not be loaded.'
      };
    }

    return {
      resolved: true,
      status: 'active',
      hostname: normalized,
      business: bundle.business,
      store: bundle.store,
      settings: bundle.settings,
      categories: bundle.categories,
      products: bundle.products,
      stories: bundle.stories,
      storefront: bundle
    };
  }
}

export const customDomainService = new CustomDomainService();
