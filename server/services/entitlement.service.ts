import { subscriptionRepository } from '../repositories/subscription.repository';
import { productRepository } from '../repositories/product.repository';
import { SubscriptionPlan } from '../../src/types';

export class EntitlementService {
  async getBusinessPlanAsync(businessId: string): Promise<SubscriptionPlan> {
    const sub = await subscriptionRepository.getSubscriptionByBusinessId(businessId);
    const planId = sub?.plan_id || 'free';
    const plan = await subscriptionRepository.getPlanById(planId);
    if (!plan) {
      const freePlan = await subscriptionRepository.getPlanById('free');
      if (freePlan) return freePlan;
      return {
        id: 'free',
        name: 'Free Starter',
        description: 'Perfect for new sellers testing online orders.',
        price_monthly: 0,
        currency: 'NGN',
        max_products: 5,
        can_checkout: false,
        remove_branding: false,
        custom_domain: false,
        advanced_analytics: false,
        is_active: true,
        features: ['5 Products', 'WhatsApp Ordering', 'Mobile Storefront']
      };
    }
    return plan;
  }

  async canAsync(
    businessId: string,
    feature: 'can_checkout' | 'remove_branding' | 'custom_domain' | 'advanced_analytics'
  ): Promise<boolean> {
    const plan = await this.getBusinessPlanAsync(businessId);
    return Boolean(plan[feature]);
  }

  async getProductLimitAsync(businessId: string): Promise<number> {
    const plan = await this.getBusinessPlanAsync(businessId);
    return plan.max_products; // -1 means unlimited
  }

  async canAddProductAsync(businessId: string): Promise<{
    allowed: boolean;
    currentCount: number;
    maxAllowed: number;
    message?: string;
  }> {
    const [maxAllowed, currentCount, plan] = await Promise.all([
      this.getProductLimitAsync(businessId),
      productRepository.countProducts(businessId),
      this.getBusinessPlanAsync(businessId)
    ]);

    if (maxAllowed === -1) {
      return { allowed: true, currentCount, maxAllowed };
    }

    if (currentCount >= maxAllowed) {
      return {
        allowed: false,
        currentCount,
        maxAllowed,
        message: `Your current ${plan.name} allows a maximum of ${maxAllowed} products (currently ${currentCount}). Please upgrade your plan to add more products.`
      };
    }

    return { allowed: true, currentCount, maxAllowed };
  }
}

export const entitlementService = new EntitlementService();
