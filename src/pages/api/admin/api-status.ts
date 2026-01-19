/**
 * API Endpoint: Check API Status
 *
 * GET /api/admin/api-status
 *
 * Returns the status of all configured APIs and tests connectivity.
 */

import type { APIRoute } from 'astro';
import { getAdapterStatus, getProduct } from '@lib/amazon-api-adapter';
import { isCreatorsConfigured } from '@lib/amazon-creators';
import { isRainforestConfigured } from '@lib/rainforest-api';

export const prerender = false;

// Test ASIN (Echo Dot - common product)
const TEST_ASIN = 'B09V3KXJPB';

export const GET: APIRoute = async ({ url }) => {
  const runTest = url.searchParams.get('test') === 'true';

  const status = {
    configuration: {
      creatorsApi: isCreatorsConfigured(),
      rapidApi: isRainforestConfigured(),
      adapterStatus: getAdapterStatus(),
    },
    environment: {
      AMAZON_CREATORS_CREDENTIAL_ID: import.meta.env.AMAZON_CREATORS_CREDENTIAL_ID ? 'Set' : 'Missing',
      AMAZON_CREATORS_CREDENTIAL_SECRET: import.meta.env.AMAZON_CREATORS_CREDENTIAL_SECRET ? 'Set' : 'Missing',
      RAPIDAPI_KEY: import.meta.env.RAPIDAPI_KEY ? 'Set' : 'Missing',
      AMAZON_PA_API_PARTNER_TAG: import.meta.env.AMAZON_PA_API_PARTNER_TAG || 'Not set (using default)',
    },
    testResult: null as null | {
      success: boolean;
      dataSource: string;
      asin: string;
      title?: string;
      price?: number | null;
      error?: string;
      timeMs: number;
    },
  };

  if (runTest) {
    const startTime = Date.now();
    try {
      const result = await getProduct(TEST_ASIN, 'com');
      status.testResult = {
        success: result.success,
        dataSource: result.dataSource,
        asin: TEST_ASIN,
        title: result.data?.title?.substring(0, 60),
        price: result.data?.price,
        error: result.error,
        timeMs: Date.now() - startTime,
      };
    } catch (error) {
      status.testResult = {
        success: false,
        dataSource: 'none',
        asin: TEST_ASIN,
        error: error instanceof Error ? error.message : 'Unknown error',
        timeMs: Date.now() - startTime,
      };
    }
  }

  return new Response(JSON.stringify(status, null, 2), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
