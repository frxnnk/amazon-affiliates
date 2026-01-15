/**
 * Tripo3D API Client
 * 
 * Generates 3D models from images using Tripo3D's API.
 * 
 * Required environment variable:
 * - TRIPO_API_KEY: Your Tripo3D API key (get from https://platform.tripo3d.ai/api-keys/)
 * 
 * Documentation: https://platform.tripo3d.ai/docs/api
 */

const TRIPO_API_BASE = 'https://api.tripo3d.ai/v2/openapi';

interface TripoTaskResponse {
  code: number;
  data: {
    task_id: string;
  };
}

interface TripoTaskStatusResponse {
  code: number;
  data: {
    task_id: string;
    type: string;
    status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown';
    input: Record<string, unknown>;
    output?: {
      model?: string; // URL to the GLB model
      rendered_image?: string;
    };
    progress: number;
    create_time: number;
  };
}

interface TripoUploadResponse {
  code: number;
  data: {
    image_token: string;
  };
}

export interface Generate3DResult {
  success: boolean;
  taskId?: string;
  modelUrl?: string;
  error?: string;
}

export interface TaskStatusResult {
  success: boolean;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'unknown';
  progress: number;
  modelUrl?: string;
  error?: string;
}

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const apiKey = import.meta.env.TRIPO_API_KEY || process.env.TRIPO_API_KEY;
  if (!apiKey) {
    throw new Error('TRIPO_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Upload an image to Tripo3D and get an image token
 */
async function uploadImage(imageUrl: string): Promise<string> {
  const apiKey = getApiKey();
  
  // First, fetch the image
  const imageResponse = await fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }
  
  const imageBlob = await imageResponse.blob();
  const formData = new FormData();
  formData.append('file', imageBlob, 'product.jpg');
  
  const response = await fetch(`${TRIPO_API_BASE}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload image to Tripo3D: ${error}`);
  }
  
  const data: TripoUploadResponse = await response.json();
  
  if (data.code !== 0) {
    throw new Error(`Tripo3D upload error: code ${data.code}`);
  }
  
  return data.data.image_token;
}

/**
 * Create an image-to-3D task
 */
export async function createImageTo3DTask(imageUrl: string): Promise<Generate3DResult> {
  try {
    const apiKey = getApiKey();
    
    // Upload the image first to get a token
    const imageToken = await uploadImage(imageUrl);
    
    // Create the task
    const response = await fetch(`${TRIPO_API_BASE}/task`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'image_to_model',
        file: {
          type: 'image',
          file_token: imageToken,
        },
        // Model settings
        model_version: 'v2.0-20240919', // Latest version
        face_limit: 50000, // Limit polygons for web performance
        texture: true,
        pbr: true, // Physical Based Rendering for better materials
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Failed to create 3D task: ${error}`,
      };
    }
    
    const data: TripoTaskResponse = await response.json();
    
    if (data.code !== 0) {
      return {
        success: false,
        error: `Tripo3D error: code ${data.code}`,
      };
    }
    
    return {
      success: true,
      taskId: data.data.task_id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check the status of a task
 */
export async function getTaskStatus(taskId: string): Promise<TaskStatusResult> {
  try {
    const apiKey = getApiKey();
    
    const response = await fetch(`${TRIPO_API_BASE}/task/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        status: 'unknown',
        progress: 0,
        error: `Failed to get task status: ${error}`,
      };
    }
    
    const data: TripoTaskStatusResponse = await response.json();
    
    if (data.code !== 0) {
      return {
        success: false,
        status: 'unknown',
        progress: 0,
        error: `Tripo3D error: code ${data.code}`,
      };
    }
    
    const result: TaskStatusResult = {
      success: true,
      status: data.data.status,
      progress: data.data.progress,
    };
    
    // If completed, include the model URL
    if (data.data.status === 'success' && data.data.output?.model) {
      result.modelUrl = data.data.output.model;
    }
    
    return result;
  } catch (error) {
    return {
      success: false,
      status: 'unknown',
      progress: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Download a model from Tripo3D and save it locally
 */
export async function downloadModel(modelUrl: string, productId: string): Promise<string> {
  const response = await fetch(modelUrl);
  
  if (!response.ok) {
    throw new Error(`Failed to download model: ${response.statusText}`);
  }
  
  const modelBuffer = await response.arrayBuffer();
  
  // In a server environment, we would write to the filesystem
  // For now, return the URL path where it should be saved
  const localPath = `/models/${productId}.glb`;
  
  // Note: The actual file writing will be done in the API endpoint
  // This function just returns the path and the buffer
  return localPath;
}

/**
 * Wait for a task to complete (polling)
 */
export async function waitForTask(
  taskId: string, 
  onProgress?: (progress: number) => void,
  maxWaitMs: number = 120000, // 2 minutes max
  pollIntervalMs: number = 3000 // Check every 3 seconds
): Promise<TaskStatusResult> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await getTaskStatus(taskId);
    
    if (onProgress && status.success) {
      onProgress(status.progress);
    }
    
    if (status.status === 'success' || status.status === 'failed' || status.status === 'cancelled') {
      return status;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  return {
    success: false,
    status: 'unknown',
    progress: 0,
    error: 'Task timed out',
  };
}
