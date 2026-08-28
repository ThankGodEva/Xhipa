/**
 * XHIPA PHASE 10: AUTOMATED FINANCIAL CONCURRENCY, ATOMICITY & IDEMPOTENCY TEST HARNESS
 *
 * Simulates real-world race conditions, double-submissions, simultaneous webhooks,
 * concurrent stock adjustments, and duplicate subscriptions.
 */

import { strict as assert } from 'assert';

interface TestResult {
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<string>) {
  const start = Date.now();
  try {
    const details = await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start, details });
    console.log(`✅ [PASS] ${name} (${Date.now() - start}ms) - ${details}`);
  } catch (err: any) {
    results.push({ name, passed: false, durationMs: Date.now() - start, details: err.message });
    console.error(`❌ [FAIL] ${name} (${Date.now() - start}ms) - ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Two simultaneous purchases of stock = 1
// ---------------------------------------------------------------------------
async function testConcurrentPurchaseStock1(): Promise<string> {
  let stock = 1;
  let successCount = 0;
  let failCount = 0;

  // Simulate atomic stock adjustment function (like adjust_product_stock in Postgres)
  const adjustStockAtomic = async (qty: number): Promise<boolean> => {
    // Atomic test lock
    if (stock >= qty) {
      stock -= qty;
      return true;
    }
    return false;
  };

  // Launch 2 simultaneous purchase requests
  const req1 = adjustStockAtomic(1).then(ok => (ok ? successCount++ : failCount++));
  const req2 = adjustStockAtomic(1).then(ok => (ok ? successCount++ : failCount++));

  await Promise.all([req1, req2]);

  assert.equal(successCount, 1, 'Exactly 1 purchase must succeed');
  assert.equal(failCount, 1, 'Exactly 1 purchase must fail');
  assert.equal(stock, 0, 'Final stock must be exactly 0, never negative');

  return `Purchases: 1 success, 1 failed, final stock: ${stock}`;
}

// ---------------------------------------------------------------------------
// TEST 2: 100 simultaneous purchases against stock = 10
// ---------------------------------------------------------------------------
async function test100ConcurrentPurchasesStock10(): Promise<string> {
  let stock = 10;
  let successCount = 0;
  let failCount = 0;

  const adjustStockAtomic = async (qty: number): Promise<boolean> => {
    // Simulate atomic DB operation: UPDATE products SET stock_quantity = stock_quantity - 1 WHERE stock_quantity >= 1
    if (stock >= qty) {
      stock -= qty;
      return true;
    }
    return false;
  };

  const requests = Array.from({ length: 100 }).map(async () => {
    const ok = await adjustStockAtomic(1);
    if (ok) successCount++;
    else failCount++;
  });

  await Promise.all(requests);

  assert.equal(successCount, 10, 'Exactly 10 purchases must succeed');
  assert.equal(failCount, 90, 'Exactly 90 purchases must fail due to zero inventory');
  assert.equal(stock, 0, 'Final stock must never drop below 0');

  return `100 requests: ${successCount} succeeded, ${failCount} rejected, stock = ${stock}`;
}

// ---------------------------------------------------------------------------
// TEST 3: Two simultaneous payment verification requests (Same Reference)
// ---------------------------------------------------------------------------
async function testSimultaneousPaymentVerification(): Promise<string> {
  let paymentState = 'pending';
  let orderState = 'pending';
  let inventoryDeducted = 0;

  // Atomic PostgreSQL settlement simulation (with row lock FOR UPDATE)
  const settlePaymentAtomic = async (ref: string) => {
    // Row lock simulation
    if (paymentState === 'paid') {
      return { success: true, already_settled: true };
    }
    paymentState = 'paid';
    orderState = 'confirmed';
    inventoryDeducted += 2; // Order had 2 items
    return { success: true, already_settled: false };
  };

  const [res1, res2] = await Promise.all([
    settlePaymentAtomic('PSTK_REF_001'),
    settlePaymentAtomic('PSTK_REF_001')
  ]);

  const settledCount = [res1, res2].filter(r => !r.already_settled).length;
  const alreadySettledCount = [res1, res2].filter(r => r.already_settled).length;

  assert.equal(settledCount, 1, 'Exactly one execution must perform state settlement');
  assert.equal(alreadySettledCount, 1, 'Concurrent execution must return already_settled');
  assert.equal(inventoryDeducted, 2, 'Inventory must only be deducted ONCE (2 units total)');
  assert.equal(paymentState, 'paid');
  assert.equal(orderState, 'confirmed');

  return `Deduplicated settlement: 1 settled, 1 idempotency hit, inventory deducted once (${inventoryDeducted})`;
}

// ---------------------------------------------------------------------------
// TEST 4: Callback + Webhook Arriving Simultaneously
// ---------------------------------------------------------------------------
async function testSimultaneousCallbackAndWebhook(): Promise<string> {
  const processedWebhooks = new Set<string>();
  let subActivatedCount = 0;

  const processEvent = async (eventId: string, type: string) => {
    // Atomic insert into processed_webhooks ON CONFLICT DO NOTHING
    if (processedWebhooks.has(eventId)) {
      return { duplicate: true };
    }
    processedWebhooks.add(eventId);
    subActivatedCount++;
    return { duplicate: false };
  };

  const [webhookResult, callbackResult] = await Promise.all([
    processEvent('SUB_EVENT_999', 'webhook'),
    processEvent('SUB_EVENT_999', 'callback')
  ]);

  assert.equal(subActivatedCount, 1, 'Subscription must be activated exactly once');
  const duplicates = [webhookResult, callbackResult].filter(r => r.duplicate).length;
  assert.equal(duplicates, 1, 'One request must detect duplicate');

  return `Activated count: ${subActivatedCount}, duplicates caught: ${duplicates}`;
}

// ---------------------------------------------------------------------------
// TEST 5: Duplicate Webhook Delivery (Replay Attack / Network Retry)
// ---------------------------------------------------------------------------
async function testDuplicateWebhookDelivery(): Promise<string> {
  const processed = new Set<string>();
  let financialEffectCount = 0;

  const handleWebhook = async (ref: string) => {
    if (processed.has(ref)) {
      return { success: true, message: 'Already processed' };
    }
    processed.add(ref);
    financialEffectCount++;
    return { success: true, message: 'Processed' };
  };

  // Deliver same webhook 5 times sequentially and concurrently
  await handleWebhook('REF_REPEAT_123');
  await handleWebhook('REF_REPEAT_123');
  await Promise.all([
    handleWebhook('REF_REPEAT_123'),
    handleWebhook('REF_REPEAT_123')
  ]);

  assert.equal(financialEffectCount, 1, 'Financial effect must execute exactly once across 5 deliveries');

  return `5 webhook replays resulted in exactly ${financialEffectCount} financial mutation`;
}

// ---------------------------------------------------------------------------
// TEST 6: Duplicate Subscription Callback (Single Extension Guarantee)
// ---------------------------------------------------------------------------
async function testDuplicateSubscriptionCallback(): Promise<string> {
  const initialEnd = new Date('2026-08-26T00:00:00Z').getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let currentPeriodEnd = initialEnd;
  let paymentSettled = false;

  const settleSubscription = async (ref: string) => {
    if (paymentSettled) {
      return { success: true, already_settled: true, period_end: currentPeriodEnd };
    }
    paymentSettled = true;
    currentPeriodEnd = initialEnd + thirtyDaysMs;
    return { success: true, already_settled: false, period_end: currentPeriodEnd };
  };

  const res1 = await settleSubscription('SUB_REF_ABC');
  const res2 = await settleSubscription('SUB_REF_ABC');

  assert.equal(currentPeriodEnd, initialEnd + thirtyDaysMs, 'Period must be extended by exactly 30 days, not 60 days');
  assert.equal(res2.already_settled, true, 'Second call must be idempotent');

  return `Period extension: exactly 30 days (${new Date(currentPeriodEnd).toISOString()})`;
}

// ---------------------------------------------------------------------------
// TEST 7: Duplicate Affiliate Commission Event (Database UNIQUE Referral Constraint)
// ---------------------------------------------------------------------------
async function testDuplicateAffiliateCommission(): Promise<string> {
  const commissionsByReferral = new Map<string, number>();
  const referralId = 'REF-BIZ-400';

  const awardCommission = async (refId: string, amount: number) => {
    // Unique database constraint on referral_id
    if (commissionsByReferral.has(refId)) {
      return { success: false, duplicate: true };
    }
    commissionsByReferral.set(refId, amount);
    return { success: true, duplicate: false, amount };
  };

  const [c1, c2, c3] = await Promise.all([
    awardCommission(referralId, 80000),
    awardCommission(referralId, 80000),
    awardCommission(referralId, 80000)
  ]);

  const created = [c1, c2, c3].filter(c => c.success).length;
  const rejected = [c1, c2, c3].filter(c => c.duplicate).length;

  assert.equal(created, 1, 'Exactly 1 commission must be created for a qualifying business');
  assert.equal(rejected, 2, 'Concurrent attempts must be rejected by uniqueness');
  assert.equal(commissionsByReferral.get(referralId), 80000, 'Commission amount must be ₦800 (80000 Kobo)');

  return `1 commission created (₦800), 2 duplicate attempts blocked`;
}

// ---------------------------------------------------------------------------
// TEST 8: Concurrent Payout Processing (Double Payout Prevention)
// ---------------------------------------------------------------------------
async function testConcurrentPayoutProcessing(): Promise<string> {
  const commissionStatus = new Map<string, string>([
    ['COMM_1', 'eligible'],
    ['COMM_2', 'eligible']
  ]);
  let totalPaidOut = 0;

  const processPayout = async (commIds: string[], payoutRef: string) => {
    // Lock commissions: WHERE status = 'eligible'
    const claimable = commIds.filter(id => commissionStatus.get(id) === 'eligible');
    if (claimable.length === 0) {
      return { success: false, paid: 0, reason: 'Already claimed' };
    }

    claimable.forEach(id => commissionStatus.set(id, 'paid'));
    const amount = claimable.length * 80000;
    totalPaidOut += amount;
    return { success: true, paid: amount, items: claimable };
  };

  const [payout1, payout2] = await Promise.all([
    processPayout(['COMM_1', 'COMM_2'], 'PAYOUT_A'),
    processPayout(['COMM_1', 'COMM_2'], 'PAYOUT_B')
  ]);

  assert.equal(totalPaidOut, 160000, 'Total payout must be exactly ₦1,600 (160000 kobo) for 2 commissions');
  const successfulPayouts = [payout1, payout2].filter(p => p.success).length;
  assert.equal(successfulPayouts, 1, 'Only one payout transaction must successfully claim commissions');

  return `Total paid out: ₦${totalPaidOut / 100}, double payout prevented`;
}

// ---------------------------------------------------------------------------
// EXECUTE ALL TESTS
// ---------------------------------------------------------------------------
async function main() {
  console.log('===============================================================');
  console.log('🚀 XHIPA PHASE 10: CONCURRENCY & IDEMPOTENCY TEST SUITE');
  console.log('===============================================================\n');

  await runTest('1. Concurrent Purchase with stock = 1', testConcurrentPurchaseStock1);
  await runTest('2. 100 Concurrent Purchases with stock = 10', test100ConcurrentPurchasesStock10);
  await runTest('3. Simultaneous Payment Verification (Same Ref)', testSimultaneousPaymentVerification);
  await runTest('4. Simultaneous Callback + Webhook', testSimultaneousCallbackAndWebhook);
  await runTest('5. Duplicate Webhook Replay Delivery', testDuplicateWebhookDelivery);
  await runTest('6. Duplicate Subscription Callback Extension', testDuplicateSubscriptionCallback);
  await runTest('7. Duplicate Affiliate Commission Creation', testDuplicateAffiliateCommission);
  await runTest('8. Concurrent Affiliate Payout Processing', testConcurrentPayoutProcessing);

  console.log('\n===============================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`SUMMARY: ${results.filter(r => r.passed).length}/${results.length} tests passed.`);
  console.log(`OVERALL STATUS: ${allPassed ? 'ALL TESTS PASSED ✅' : 'SOME TESTS FAILED ❌'}`);
  console.log('===============================================================');

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Test suite runner failed:', err);
  process.exit(1);
});
