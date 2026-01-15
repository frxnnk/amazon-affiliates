/**
 * Debug endpoint for YouTube API diagnostics
 * GET /api/debug/youtube
 * GET /api/debug/youtube?test=AirPods
 */

import type { APIRoute } from 'astro';
import { isYouTubeConfigured, searchProductVideo } from '@lib/youtube-api';
import { getQuotaStatus, getCacheStats, getProductVideo, resetQuota } from '@lib/video-cache';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const testProduct = url.searchParams.get('test') || 'AirPods Pro';
  const shouldReset = url.searchParams.get('reset') === 'true';

  try {
    // Reset quota if requested
    if (shouldReset) {
      await resetQuota();
      console.log('[YouTube Debug] Quota reset requested');
    }
    // 1. Check configuration
    const configured = isYouTubeConfigured();
    const apiKeyPrefix = import.meta.env.YOUTUBE_API_KEY
      ? `${import.meta.env.YOUTUBE_API_KEY.substring(0, 8)}...`
      : 'NOT SET';

    // 2. Get quota status
    const quotaStatus = await getQuotaStatus();

    // 3. Get cache stats
    const cacheStats = await getCacheStats();

    // 4. Test search if configured and has quota
    let testResult = null;
    if (configured && quotaStatus.remaining > 100) {
      console.log(`[YouTube Debug] Testing search for: "${testProduct}"`);
      const searchResult = await searchProductVideo(testProduct, 'es', 1);
      testResult = {
        success: searchResult.success,
        video: searchResult.video ? {
          videoId: searchResult.video.videoId,
          title: searchResult.video.title,
          channelTitle: searchResult.video.channelTitle,
          isShort: searchResult.video.isShort,
        } : null,
        error: searchResult.error,
        quotaUsed: searchResult.quotaUsed,
      };
    } else {
      testResult = {
        skipped: true,
        reason: !configured
          ? 'YouTube API not configured'
          : 'Insufficient quota remaining',
      };
    }

    // Build diagnostics report
    const diagnostics = {
      timestamp: new Date().toISOString(),
      quotaWasReset: shouldReset,
      configuration: {
        isConfigured: configured,
        apiKeyPrefix,
        envVarName: 'YOUTUBE_API_KEY',
      },
      quota: {
        used: quotaStatus.used,
        remaining: quotaStatus.remaining,
        limit: quotaStatus.limit,
        percentUsed: quotaStatus.percentUsed,
        date: quotaStatus.date,
      },
      cache: {
        totalEntries: cacheStats.cache.totalEntries,
        withVideo: cacheStats.cache.withVideo,
        withoutVideo: cacheStats.cache.withoutVideo,
        expired: cacheStats.cache.expired,
        hitRate: `${cacheStats.cache.hitRate}%`,
      },
      testSearch: {
        query: testProduct,
        ...testResult,
      },
      troubleshooting: {
        issues: [],
        recommendations: [],
      },
    };

    // Add troubleshooting tips
    if (!configured) {
      diagnostics.troubleshooting.issues.push('YOUTUBE_API_KEY environment variable is not set');
      diagnostics.troubleshooting.recommendations.push(
        'Add YOUTUBE_API_KEY to your .env file',
        'Get a key from https://console.cloud.google.com/apis/credentials',
        'Enable YouTube Data API v3 for the project'
      );
    }

    if (quotaStatus.remaining <= 0) {
      diagnostics.troubleshooting.issues.push('Daily quota exhausted');
      diagnostics.troubleshooting.recommendations.push(
        'Wait until tomorrow for quota reset',
        'Or increase quota limit in Google Cloud Console'
      );
    }

    if (cacheStats.cache.withVideo === 0 && cacheStats.cache.totalEntries > 0) {
      diagnostics.troubleshooting.issues.push('Cache has entries but no videos found');
      diagnostics.troubleshooting.recommendations.push(
        'Check if search queries are too generic',
        'Review youtube-api.ts search strategies',
        'Clear cache to retry: DELETE FROM VideoCache'
      );
    }

    if (testResult && testResult.error) {
      diagnostics.troubleshooting.issues.push(`API Error: ${testResult.error}`);
      if (testResult.error.includes('forbidden') || testResult.error.includes('403')) {
        diagnostics.troubleshooting.recommendations.push(
          'YouTube Data API v3 may not be enabled for this project',
          'Go to Google Cloud Console > APIs & Services > Enable APIs',
          'Enable "YouTube Data API v3"'
        );
      }
      if (testResult.error.includes('invalid') || testResult.error.includes('API key')) {
        diagnostics.troubleshooting.recommendations.push(
          'The API key may be invalid or restricted',
          'Check API key restrictions in Google Cloud Console',
          'Ensure key is not restricted to specific domains/IPs'
        );
      }
    }

    if (diagnostics.troubleshooting.issues.length === 0) {
      diagnostics.troubleshooting.issues.push('No obvious issues detected');
      if (!testResult?.video) {
        diagnostics.troubleshooting.recommendations.push(
          'Try a more specific product name',
          'Check if videos exist on YouTube for this product',
          'Lower the score threshold in youtube-api.ts if needed'
        );
      }
    }

    return new Response(JSON.stringify(diagnostics, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('[YouTube Debug] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
