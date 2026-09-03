import React, { useState, useEffect } from 'react';
import {
  Globe,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { api } from '../../lib/api';
import { validateHostname } from '../../lib/hostname';
import { CustomDomain, CustomDomainDetailsResponse, DnsInstructionRecord } from '../../types';

interface CustomDomainManagerProps {
  businessSlug?: string;
  storeName?: string;
}

export const CustomDomainManager: React.FC<CustomDomainManagerProps> = ({ businessSlug, storeName }) => {
  const [domains, setDomains] = useState<CustomDomainDetailsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [isAdding, setIsAdding] = useState(false);
  const [newHostname, setNewHostname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [hostnameValidation, setHostnameValidation] = useState<{
    isValid: boolean;
    normalized: string;
    error?: string;
    isApex: boolean;
    apexGuidance?: string;
  }>({ isValid: false, normalized: '', isApex: false });

  // Refreshing status state
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedDomainForDns, setSelectedDomainForDns] = useState<CustomDomainDetailsResponse | null>(null);

  // Copy state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchDomains = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getCustomDomains();
      setDomains(data);
    } catch (err: any) {
      console.error('Failed to load custom domains:', err);
      setError(err.message || 'Failed to load custom domains.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleHostnameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewHostname(val);
    setFormError(null);
    if (val.trim()) {
      const validation = validateHostname(val);
      setHostnameValidation(validation);
      if (!validation.isValid) {
        setFormError(validation.error || 'Invalid domain format.');
      }
    } else {
      setHostnameValidation({ isValid: false, normalized: '', isApex: false });
    }
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateHostname(newHostname);
    if (!validation.isValid) {
      setFormError(validation.error || 'Please enter a valid domain name.');
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);
      const created = await api.addCustomDomain(validation.normalized);
      setNewHostname('');
      setIsAdding(false);
      setSuccessMessage(`Custom domain "${validation.normalized}" registered successfully! Configure your DNS records below.`);
      await fetchDomains();
      setSelectedDomainForDns(created);
    } catch (err: any) {
      setFormError(err.message || 'Failed to connect custom domain.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async (domainId: string) => {
    try {
      setRefreshingId(domainId);
      const updated = await api.refreshCustomDomain(domainId);
      setDomains(prev => prev.map(d => (d.domain.id === domainId ? updated : d)));
      if (selectedDomainForDns && selectedDomainForDns.domain.id === domainId) {
        setSelectedDomainForDns(updated);
      }
      if (updated.domain.status === 'active') {
        setSuccessMessage(`Domain "${updated.domain.hostname}" is verified, secured with SSL, and live!`);
      } else {
        setSuccessMessage(`Checked verification for "${updated.domain.hostname}". DNS changes may take a few minutes to propagate.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to check domain status.');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleSetPrimary = async (domainId: string) => {
    try {
      await api.setPrimaryCustomDomain(domainId);
      await fetchDomains();
      setSuccessMessage('Primary store domain updated successfully.');
    } catch (err: any) {
      setError(err.message || 'Failed to set primary domain.');
    }
  };

  const handleDelete = async (domain: CustomDomain) => {
    if (!confirm(`Are you sure you want to disconnect and delete "${domain.hostname}"? Your store will no longer be accessible via this domain.`)) {
      return;
    }

    try {
      setDeletingId(domain.id);
      await api.deleteCustomDomain(domain.id);
      if (selectedDomainForDns?.domain.id === domain.id) {
        setSelectedDomainForDns(null);
      }
      setSuccessMessage(`Domain "${domain.hostname}" disconnected.`);
      await fetchDomains();
    } catch (err: any) {
      setError(err.message || 'Failed to delete domain.');
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const getStatusBadge = (domain: CustomDomain) => {
    if (domain.status === 'active') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Active & Secured
        </span>
      );
    }

    if (domain.status === 'pending' || domain.status === 'pending_validation') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          Pending DNS Verification
        </span>
      );
    }

    if (domain.status === 'suspended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">
          <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
          Suspended
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
        Action Required
      </span>
    );
  };

  return (
    <div className="space-y-6" id="custom-domain-manager-section">
      {/* Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Custom Domain & Branding
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Connect your own branded domain (e.g., <span className="font-mono text-gray-700">shop.yourbrand.com</span> or <span className="font-mono text-gray-700">yourbrand.com</span>) powered by enterprise Cloudflare edge SSL.
          </p>
        </div>

        {!isAdding && (
          <button
            id="add-custom-domain-btn"
            onClick={() => {
              setIsAdding(true);
              setFormError(null);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all hover:shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Connect Custom Domain
          </button>
        )}
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* Add Domain Modal / Form Card */}
      {isAdding && (
        <form
          onSubmit={handleAddDomain}
          id="connect-custom-domain-form"
          className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-white to-gray-50 border border-indigo-100 shadow-sm space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Connect a New Domain
            </h4>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-gray-400 hover:text-gray-600 text-sm font-medium"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Domain Name or Subdomain
            </label>
            <div className="relative">
              <input
                id="custom-domain-input"
                type="text"
                placeholder="e.g. shop.yourbrand.com or yourbrand.com"
                value={newHostname}
                onChange={handleHostnameChange}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                disabled={submitting}
                autoFocus
              />
            </div>

            {/* Live validation feedback */}
            {hostnameValidation.normalized && (
              <p className="text-xs text-gray-500 mt-1.5 font-mono">
                Normalized hostname: <span className="font-semibold text-indigo-600">{hostnameValidation.normalized}</span>
              </p>
            )}

            {hostnameValidation.apexGuidance && (
              <div className="mt-2.5 p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{hostnameValidation.apexGuidance}</span>
              </div>
            )}

            {formError && (
              <p className="text-xs text-rose-600 mt-1.5 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {formError}
              </p>
            )}
          </div>

          <div className="bg-white/80 p-3.5 rounded-xl border border-gray-200/80 text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Automated SSL & Edge Routing
            </p>
            <p>
              Once connected, Xhipa automatically provisions an SSL certificate and provides instant CNAME records to point your DNS provider (Namecheap, GoDaddy, Cloudflare, Route53, etc.).
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              id="submit-connect-domain-btn"
              type="submit"
              disabled={submitting || !newHostname.trim() || !hostnameValidation.isValid}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-all"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Registering Domain...
                </>
              ) : (
                <>
                  Connect Domain
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Connected Domains List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-8 text-center text-gray-500 rounded-2xl border border-gray-200 bg-white">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            <p className="text-sm">Loading custom domains...</p>
          </div>
        ) : domains.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-gray-900">No Custom Domains Connected</h4>
              <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                Your storefront is currently available at your default Xhipa URL. Connect a custom domain to build stronger brand trust.
              </p>
            </div>
            {businessSlug && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-mono text-gray-700">
                Default URL: https://xhipa.com/store/{businessSlug}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {domains.map(item => {
              const { domain, dnsInstructions } = item;
              const isSelectedForDns = selectedDomainForDns?.domain.id === domain.id;
              const isRefreshing = refreshingId === domain.id;
              const isDeleting = deletingId === domain.id;

              return (
                <div
                  key={domain.id}
                  id={`domain-card-${domain.id}`}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all hover:border-gray-300"
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-base font-bold text-gray-900 font-mono">
                          {domain.hostname}
                        </span>
                        {getStatusBadge(domain)}
                        {domain.is_primary && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Primary Store Domain
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>
                          SSL Status: <strong className="text-gray-700 capitalize">{domain.ssl_status || 'Initializing'}</strong>
                        </span>
                        {domain.last_checked_at && (
                          <span>
                            Last checked: {new Date(domain.last_checked_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {domain.status === 'active' && (
                          <a
                            href={`https://${domain.hostname}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            Visit Live Store <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        id={`dns-toggle-btn-${domain.id}`}
                        onClick={() => setSelectedDomainForDns(isSelectedForDns ? null : item)}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                          isSelectedForDns
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        {isSelectedForDns ? 'Hide DNS Setup' : 'DNS Records'}
                      </button>

                      <button
                        id={`refresh-btn-${domain.id}`}
                        onClick={() => handleRefresh(domain.id)}
                        disabled={isRefreshing}
                        className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-gray-200 hover:border-indigo-200"
                        title="Check verification status"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
                      </button>

                      {!domain.is_primary && domain.status === 'active' && (
                        <button
                          id={`set-primary-btn-${domain.id}`}
                          onClick={() => handleSetPrimary(domain.id)}
                          className="px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-700 text-xs font-semibold rounded-xl transition-colors"
                        >
                          Make Primary
                        </button>
                      )}

                      <button
                        id={`delete-domain-btn-${domain.id}`}
                        onClick={() => handleDelete(domain)}
                        disabled={isDeleting}
                        className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Delete custom domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* DNS Instructions Panel */}
                  {isSelectedForDns && (
                    <div className="border-t border-gray-100 bg-gray-50/70 p-5 space-y-4 animate-fadeIn">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="text-sm font-bold text-gray-900">
                            DNS Configuration Instructions
                          </h5>
                          <p className="text-xs text-gray-500 mt-0.5">
                            Log in to your DNS provider (e.g. Cloudflare, Namecheap, GoDaddy, Hostinger) and add the following records:
                          </p>
                        </div>

                        <button
                          onClick={() => handleRefresh(domain.id)}
                          disabled={isRefreshing}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Verify DNS Now
                        </button>
                      </div>

                      {dnsInstructions.isApex && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                          <p className="font-semibold flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 text-amber-600" />
                            Apex Domain Configuration Tip
                          </p>
                          <p>
                            You connected the root domain (<span className="font-mono font-bold">{domain.hostname}</span>). If your DNS provider does not support CNAME records on the root (@), enable <strong>CNAME Flattening</strong> or use an <strong>ALIAS/ANAME</strong> record pointing to <span className="font-mono font-bold">{dnsInstructions.cname.target}</span>.
                          </p>
                        </div>
                      )}

                      {/* DNS Records Table */}
                      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                        <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                          <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Record Type</th>
                              <th className="px-4 py-2.5">Host / Name</th>
                              <th className="px-4 py-2.5">Target / Value</th>
                              <th className="px-4 py-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-mono text-gray-800">
                            {dnsInstructions.records.map((rec: DnsInstructionRecord, idx: number) => {
                              const copyKey = `${rec.type}-${rec.name}-${idx}`;
                              return (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-3 font-bold text-indigo-600">
                                    {rec.type}
                                  </td>
                                  <td className="px-4 py-3 break-all max-w-[180px]">
                                    {rec.name}
                                  </td>
                                  <td className="px-4 py-3 break-all max-w-[240px]">
                                    {rec.value}
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <button
                                      onClick={() => copyToClipboard(rec.value, copyKey)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-sans font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                      {copiedKey === copyKey ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-600" />
                                          Copied
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 text-gray-500" />
                                          Copy Value
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div className="text-xs text-gray-500 flex items-center justify-between">
                        <span>DNS propagation generally takes between 2 to 30 minutes.</span>
                        <span>Proxy status: <strong>DNS only (Gray Cloud)</strong> if using Cloudflare DNS</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
