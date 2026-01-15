/**
 * OpenAI GPT Client
 * 
 * Generates product content (descriptions, pros/cons) using GPT.
 * 
 * Required environment variable:
 * - OPENAI_API_KEY: Your OpenAI API key
 */

const OPENAI_API_BASE = 'https://api.openai.com/v1';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ProductContentInput {
  title?: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  currentDescription?: string;
  lang: 'es' | 'en';
}

export interface GeneratedProductContent {
  title: string;
  shortDescription: string;
  description: string;
  pros: string[];
  cons: string[];
}

export interface GenerateContentResult {
  success: boolean;
  content?: GeneratedProductContent;
  error?: string;
  tokensUsed?: number;
}

/**
 * Get API key from environment
 */
function getApiKey(): string {
  const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return apiKey;
}

/**
 * Generate product content using GPT-5-mini
 */
export async function generateProductContent(
  input: ProductContentInput
): Promise<GenerateContentResult> {
  try {
    const apiKey = getApiKey();
    
    const systemPrompt = input.lang === 'es' 
      ? `Eres un experto en marketing de productos y copywriting para e-commerce.
Tu tarea es generar contenido atractivo y persuasivo para productos de Amazon.
Responde SOLO con un JSON valido, sin markdown ni explicaciones adicionales.`
      : `You are an expert in product marketing and e-commerce copywriting.
Your task is to generate attractive and persuasive content for Amazon products.
Respond ONLY with valid JSON, no markdown or additional explanations.`;

    const userPromptEs = `Genera contenido para este producto:
${input.title ? `- Titulo actual: ${input.title}` : ''}
${input.brand ? `- Marca: ${input.brand}` : ''}
${input.category ? `- Categoria: ${input.category}` : ''}
${input.currentDescription ? `- Descripcion actual: ${input.currentDescription}` : ''}

Responde con este formato JSON exacto:
{
  "title": "Titulo optimizado para SEO (maximo 80 caracteres)",
  "shortDescription": "Descripcion breve y atractiva (maximo 150 caracteres)",
  "description": "Descripcion completa y persuasiva (200-400 palabras)",
  "pros": ["ventaja 1", "ventaja 2", "ventaja 3", "ventaja 4", "ventaja 5"],
  "cons": ["desventaja 1", "desventaja 2", "desventaja 3"]
}`;

    const userPromptEn = `Generate content for this product:
${input.title ? `- Current title: ${input.title}` : ''}
${input.brand ? `- Brand: ${input.brand}` : ''}
${input.category ? `- Category: ${input.category}` : ''}
${input.currentDescription ? `- Current description: ${input.currentDescription}` : ''}

Respond with this exact JSON format:
{
  "title": "SEO-optimized title (max 80 characters)",
  "shortDescription": "Brief and attractive description (max 150 characters)",
  "description": "Complete and persuasive description (200-400 words)",
  "pros": ["advantage 1", "advantage 2", "advantage 3", "advantage 4", "advantage 5"],
  "cons": ["disadvantage 1", "disadvantage 2", "disadvantage 3"]
}`;

    const userPrompt = input.lang === 'es' ? userPromptEs : userPromptEn;

    // Build messages array
    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
    ];

    // If we have an image, use vision capabilities
    if (input.imageUrl) {
      messages.push({
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt + '\n\nAnaliza tambien la imagen del producto para generar contenido mas preciso.',
          },
          {
            type: 'image_url',
            image_url: {
              url: input.imageUrl,
              detail: 'low', // Use low detail to save tokens
            },
          },
        ],
      });
    } else {
      messages.push({
        role: 'user',
        content: userPrompt,
      });
    }

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages,
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `OpenAI API error: ${error}`,
      };
    }

    const data: ChatCompletionResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: 'No response from GPT',
      };
    }

    const content = data.choices[0].message.content;
    
    try {
      const parsed = JSON.parse(content) as GeneratedProductContent;
      
      // Validate the response structure
      if (!parsed.title || !parsed.shortDescription || !parsed.description || !parsed.pros || !parsed.cons) {
        return {
          success: false,
          error: 'Invalid response structure from GPT',
        };
      }

      return {
        success: true,
        content: parsed,
        tokensUsed: data.usage?.total_tokens,
      };
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse GPT response: ${content}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate just a short description for a product
 */
export async function generateShortDescription(
  title: string,
  brand: string,
  lang: 'es' | 'en'
): Promise<{ success: boolean; description?: string; error?: string }> {
  try {
    const apiKey = getApiKey();
    
    const prompt = lang === 'es'
      ? `Genera una descripcion corta y atractiva (maximo 120 caracteres) para: "${title}" de ${brand}. Responde solo con la descripcion, sin comillas.`
      : `Generate a short, attractive description (max 120 characters) for: "${title}" by ${brand}. Respond only with the description, no quotes.`;

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-mini',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `OpenAI API error: ${error}`,
      };
    }

    const data: ChatCompletionResponse = await response.json();
    
    if (!data.choices || data.choices.length === 0) {
      return {
        success: false,
        error: 'No response from GPT',
      };
    }

    return {
      success: true,
      description: data.choices[0].message.content.trim(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate image using DALL-E 3
 */
export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(
  prompt: string,
  size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024',
  style: 'vivid' | 'natural' = 'vivid'
): Promise<ImageGenerationResult> {
  try {
    const apiKey = getApiKey();

    const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size,
        style,
        quality: 'standard',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `DALL-E API error: ${error}`,
      };
    }

    const data = await response.json();
    
    if (!data.data || data.data.length === 0) {
      return {
        success: false,
        error: 'No image generated',
      };
    }

    return {
      success: true,
      imageUrl: data.data[0].url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
