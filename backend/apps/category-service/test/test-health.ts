/**
 * Quick test script for Health Service
 * Run with: ts-node test-health.ts
 * 
 * NOTE: Carousel removed per Christopher's feedback
 * All blocks are now grid-only
 */

import { HealthService } from './health.service';

async function test() {
  console.log('Testing Health Service...\n');

  const healthService = new HealthService();

  // Show config
  console.log('Configuration:');
  console.log(healthService.getConfig());
  console.log('\n');

  // Test 1: PASS - Enough content
  console.log('Test 1: Sufficient content (should PASS)');
  const result1 = await healthService.assess({
    blocks: [
      {
        type: 'grid',
        entity: 'projects',
        items: Array(40).fill({}), // 40 items = 10 rows × 4 cards
      },
      {
        type: 'grid',
        entity: 'services',
        items: Array(16).fill({}), // 16 items = 4 rows × 4 cards
      },
    ],
  });
  console.log('Result:', JSON.stringify(result1, null, 2));
  console.log('\n');

  // Test 2: FAIL - Not enough content
  console.log('Test 2: Insufficient content (should FAIL)');
  const result2 = await healthService.assess({
    blocks: [
      {
        type: 'grid',
        entity: 'projects',
        items: Array(4).fill({}), // Only 4 items (needs 8)
      },
      {
        type: 'grid',
        entity: 'talent',
        items: Array(6).fill({}), // Only 6 items (needs 8)
      },
    ],
  });
  console.log('Result:', JSON.stringify(result2, null, 2));
  console.log('\n');

  // Test 3: Mixed - Some pass, some fail
  console.log('Test 3: Mixed results');
  const result3 = await healthService.assess({
    blocks: [
      {
        type: 'grid',
        entity: 'projects',
        items: Array(8).fill({}), // Exactly minimum (8 items) -> PASS
      },
      {
        type: 'grid',
        entity: 'services',
        items: Array(4).fill({}), // Too few (needs 8) -> FAIL
      },
    ],
  });
  console.log('Result:', JSON.stringify(result3, null, 2));
  console.log('\n');

  // Test 4: Edge case - Exactly minimum
  console.log('Test 4: Exactly at minimum threshold');
  const result4 = await healthService.assess({
    blocks: [
      {
        type: 'grid',
        entity: 'talent',
        items: Array(8).fill({}), // Exactly 8 items (2 rows × 4 cards)
      },
    ],
  });
  console.log('Result:', JSON.stringify(result4, null, 2));
  console.log('\n');

  // Test 5: No blocks (edge case)
  console.log('Test 5: No blocks (edge case)');
  const result5 = await healthService.assess({
    blocks: [],
  });
  console.log('Result:', JSON.stringify(result5, null, 2));
  console.log('\n');

  console.log('All tests complete!');
}

test().catch(console.error);