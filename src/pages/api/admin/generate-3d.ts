/**
 * API Endpoint: Generate 3D Model
 * 
 * POST /api/admin/generate-3d
 * 
 * Creates a 3D model from a product image using Tripo3D API.
 * The model is saved to /public/models/{productId}.glb
 */

import type { APIRoute } from 'astro';
import { createImageTo3DTask, getTaskStatus, waitForTask } from '@lib/tripo3d';
import fs from 'fs/promises';
import path from 'path';

export const prerender = false;

interface GenerateRequest {
  productId: string;
  imageUrl: string;
  waitForCompletion?: boolean; // If true, wait for task to complete (default: false)
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body: GenerateRequest = await request.json();
    
    if (!body.productId || !body.imageUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: productId and imageUrl' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { productId, imageUrl, waitForCompletion = false } = body;

    // Create the 3D generation task
    const taskResult = await createImageTo3DTask(imageUrl);
    
    if (!taskResult.success || !taskResult.taskId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: taskResult.error || 'Failed to create 3D task' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const taskId = taskResult.taskId;

    // If not waiting, return immediately with task ID
    if (!waitForCompletion) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId,
          message: 'Task created. Use /api/admin/generate-3d/status to check progress.',
        }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Wait for the task to complete
    const finalStatus = await waitForTask(taskId);
    
    if (finalStatus.status !== 'success' || !finalStatus.modelUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: finalStatus.error || 'Task failed or timed out',
          status: finalStatus.status,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Download the model and save it locally
    try {
      const modelResponse = await fetch(finalStatus.modelUrl);
      if (!modelResponse.ok) {
        throw new Error('Failed to download model from Tripo3D');
      }
      
      const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());
      const modelsDir = path.join(process.cwd(), 'public', 'models');
      
      // Ensure directory exists
      await fs.mkdir(modelsDir, { recursive: true });
      
      const localPath = path.join(modelsDir, `${productId}.glb`);
      await fs.writeFile(localPath, modelBuffer);
      
      const publicUrl = `/models/${productId}.glb`;
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          taskId,
          modelUrl: publicUrl,
          message: '3D model generated and saved successfully',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } catch (downloadError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: downloadError instanceof Error ? downloadError.message : 'Failed to save model',
          tripoModelUrl: finalStatus.modelUrl, // Return the Tripo URL so user can retry download
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Generate 3D error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * GET /api/admin/generate-3d?taskId=xxx
 * 
 * Check the status of a 3D generation task
 */
export const GET: APIRoute = async ({ url }) => {
  try {
    const taskId = url.searchParams.get('taskId');
    const productId = url.searchParams.get('productId');
    
    if (!taskId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing taskId parameter' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const status = await getTaskStatus(taskId);
    
    // If task is complete and we have a productId, save the model
    if (status.status === 'success' && status.modelUrl && productId) {
      try {
        const modelResponse = await fetch(status.modelUrl);
        if (modelResponse.ok) {
          const modelBuffer = Buffer.from(await modelResponse.arrayBuffer());
          const modelsDir = path.join(process.cwd(), 'public', 'models');
          await fs.mkdir(modelsDir, { recursive: true });
          
          const localPath = path.join(modelsDir, `${productId}.glb`);
          await fs.writeFile(localPath, modelBuffer);
          
          return new Response(
            JSON.stringify({ 
              ...status,
              localModelUrl: `/models/${productId}.glb`,
              message: 'Model downloaded and saved',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (downloadError) {
        // Return status anyway, download can be retried
        console.error('Failed to save model:', downloadError);
      }
    }
    
    return new Response(
      JSON.stringify(status),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Get task status error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
