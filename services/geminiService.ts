import { GoogleGenAI, Modality, GenerateContentResponse, GenerateVideosOperation } from "@google/genai";

// 获取 API Key 的函数
const getApiKey = (): string => {
  // 从 localStorage 读取
  const savedApiKey = localStorage.getItem('gemini-api-key');
  if (savedApiKey) {
    return savedApiKey;
  }
  
  throw new Error("API_KEY_NOT_SET");
};

// 创建 AI 实例的函数
const createAI = () => {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
};

// 重试机制配置
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1秒
  maxDelay: 10000, // 10秒
};

// 延迟函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 计算重试延迟（指数退避）
const calculateRetryDelay = (attempt: number): number => {
  const exponentialDelay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // 添加随机抖动
  return Math.min(exponentialDelay + jitter, RETRY_CONFIG.maxDelay);
};

// 判断是否应该重试的错误
const shouldRetry = (error: any): boolean => {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.status;
  
  // 网络错误或临时服务器错误应该重试
  return (
    errorCode === 429 || // 速率限制
    errorCode === 500 || // 服务器内部错误
    errorCode === 502 || // 网关错误
    errorCode === 503 || // 服务不可用
    errorCode === 504 || // 网关超时
    errorMessage.includes('network') ||
    errorMessage.includes('timeout') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('temporary')
  );
};

// 通用重试包装器
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // 如果是最后一次尝试或不应该重试，直接抛出错误
      if (attempt === RETRY_CONFIG.maxRetries || !shouldRetry(error)) {
        throw error;
      }
      
      // 计算延迟并等待
      const retryDelay = calculateRetryDelay(attempt);
      console.warn(`${operationName} failed (attempt ${attempt + 1}/${RETRY_CONFIG.maxRetries + 1}), retrying in ${retryDelay}ms:`, error);
      await delay(retryDelay);
    }
  }
  
  throw lastError;
}

// 流式响应进度回调类型
type ProgressCallback = (message: string, progress?: number) => void;

// 模拟流式响应的进度更新
const simulateStreamingProgress = async (
  operation: () => Promise<any>,
  onProgress: ProgressCallback,
  operationName: string
): Promise<any> => {
  const progressMessages = [
    `正在初始化${operationName}...`,
    `正在处理输入数据...`,
    `正在连接AI服务...`,
    `正在生成内容...`,
    `正在优化结果...`,
    `即将完成...`
  ];
  
  let messageIndex = 0;
  let progress = 0;
  
  // 开始进度更新
  onProgress(progressMessages[messageIndex], progress);
  
  // 创建进度更新定时器
  const progressInterval = setInterval(() => {
    messageIndex = (messageIndex + 1) % progressMessages.length;
    progress = Math.min(progress + Math.random() * 15 + 5, 90); // 随机增加5-20%，最多到90%
    onProgress(progressMessages[messageIndex], progress);
  }, 1500); // 每1.5秒更新一次
  
  try {
    // 执行实际操作
    const result = await operation();
    
    // 清除定时器并完成进度
    clearInterval(progressInterval);
    onProgress(`${operationName}完成！`, 100);
    
    // 短暂延迟让用户看到完成状态
    await delay(500);
    
    return result;
  } catch (error) {
    clearInterval(progressInterval);
    throw error;
  }
};

type ImageInput = {
    href: string;
    mimeType: string;
};

// 图片优化配置
const IMAGE_OPTIMIZATION_CONFIG = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  maxSizeKB: 500, // 最大500KB
};

// 压缩图片函数
const compressImage = (dataUrl: string, mimeType: string): Promise<{ href: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法创建 Canvas 上下文'));
        return;
      }

      // 计算新的尺寸
      let { width, height } = img;
      const maxWidth = IMAGE_OPTIMIZATION_CONFIG.maxWidth;
      const maxHeight = IMAGE_OPTIMIZATION_CONFIG.maxHeight;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制压缩后的图片
      ctx.drawImage(img, 0, 0, width, height);

      // 转换为压缩后的数据URL
      const outputMimeType = mimeType === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(outputMimeType, IMAGE_OPTIMIZATION_CONFIG.quality);
      
      // 检查压缩后的大小
      const sizeKB = (compressedDataUrl.length * 3) / 4 / 1024; // 估算大小
      
      if (sizeKB > IMAGE_OPTIMIZATION_CONFIG.maxSizeKB) {
        // 如果还是太大，进一步降低质量
        const newQuality = Math.max(0.3, IMAGE_OPTIMIZATION_CONFIG.quality * (IMAGE_OPTIMIZATION_CONFIG.maxSizeKB / sizeKB));
        const furtherCompressed = canvas.toDataURL(outputMimeType, newQuality);
        resolve({ href: furtherCompressed, mimeType: outputMimeType });
      } else {
        resolve({ href: compressedDataUrl, mimeType: outputMimeType });
      }
    };
    
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
};

// 优化图片输入
const optimizeImageInput = async (image: ImageInput): Promise<ImageInput> => {
  try {
    // 检查图片大小
    const sizeKB = (image.href.length * 3) / 4 / 1024;
    
    // 如果图片小于阈值，直接返回
    if (sizeKB <= IMAGE_OPTIMIZATION_CONFIG.maxSizeKB) {
      return image;
    }
    
    console.log(`压缩图片: ${sizeKB.toFixed(1)}KB -> 目标: ${IMAGE_OPTIMIZATION_CONFIG.maxSizeKB}KB`);
    return await compressImage(image.href, image.mimeType);
  } catch (error) {
    console.warn('图片压缩失败，使用原图:', error);
    return image;
  }
};

// 简单的内存缓存
interface CacheEntry {
  result: any;
  timestamp: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxAge = 5 * 60 * 1000; // 5分钟
  private readonly maxSize = 50; // 最多缓存50个结果

  private generateKey(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 32);
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.result;
  }

  set(key: string, result: any): void {
    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      result,
      timestamp: Date.now()
    });
  }

  generateCacheKey(prompt: string, images?: ImageInput[], mask?: ImageInput): string {
    const cacheData = {
      prompt: prompt.trim().toLowerCase(),
      images: images?.map(img => img.href.slice(0, 100)), // 只取前100个字符作为标识
      mask: mask?.href.slice(0, 100)
    };
    return this.generateKey(cacheData);
  }

  clear(): void {
    this.cache.clear();
  }
}

const apiCache = new SimpleCache();

export async function editImage(
  images: ImageInput[], 
  prompt: string,
  mask?: ImageInput
): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null; }> {
  
  // 检查缓存
  const cacheKey = apiCache.generateCacheKey(prompt, images, mask);
  const cachedResult = apiCache.get(cacheKey);
  if (cachedResult) {
    console.log('使用缓存的图片编辑结果');
    return cachedResult;
  }
  
  const result = await withRetry(async () => {
    // 优化输入图片
    const optimizedImages = await Promise.all(images.map(optimizeImageInput));
    const optimizedMask = mask ? await optimizeImageInput(mask) : null;
    
    const imageParts = optimizedImages.map(image => {
      const dataUrlParts = image.href.split(',');
      const base64Data = dataUrlParts.length > 1 ? dataUrlParts[1] : dataUrlParts[0];
      return {
        inlineData: {
          data: base64Data,
          mimeType: image.mimeType,
        },
      };
    });

    const maskPart = optimizedMask ? {
      inlineData: {
        data: optimizedMask.href.split(',')[1],
        mimeType: optimizedMask.mimeType,
      },
    } : null;

    const textPart = { text: prompt };

    // For inpainting with a mask, the API expects a specific order: prompt, then image, then mask.
    // For other edits, the order is less strict. This ensures the mask is applied correctly.
    const parts = maskPart
      ? [textPart, ...imageParts, maskPart]
      : [...imageParts, textPart];

    const ai = createAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: parts,
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    let newImageBase64: string | null = null;
    let newImageMimeType: string | null = null;
    let textResponse: string | null = null;

    if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData) {
          newImageBase64 = part.inlineData.data;
          newImageMimeType = part.inlineData.mimeType;
        } else if (part.text) {
          textResponse = part.text;
        }
      }
    } else {
        textResponse = "The AI response was blocked or did not contain content.";
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].finishReason) {
            textResponse += ` (Reason: ${response.candidates[0].finishReason})`;
        }
    }
    
    if (!newImageBase64) {
        // Fallback or error if no image is generated
        console.warn("API response did not contain an image part.", response);
        textResponse = textResponse || "The AI did not generate a new image. Please try a different prompt.";
    }

    return {
      newImageBase64,
      newImageMimeType,
      textResponse
    };
  }, 'Image editing');
  
  // 将结果保存到缓存
  apiCache.set(cacheKey, result);
  return result;
}

export async function generateImageFromText(prompt: string): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null; }> {
  // 检查缓存
  const cacheKey = apiCache.generateCacheKey(prompt);
  const cachedResult = apiCache.get(cacheKey);
  if (cachedResult) {
    console.log('使用缓存的文本生成图片结果');
    return cachedResult;
  }
  
  const result = await withRetry(async () => {
    const ai = createAI();
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-fast-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/png',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const image = response.generatedImages[0];
      return {
        newImageBase64: image.image.imageBytes,
        newImageMimeType: 'image/png',
        textResponse: null
      };
    } else {
      return {
        newImageBase64: null,
        newImageMimeType: null,
        textResponse: "The AI did not generate an image. Please try a different prompt."
      };
    }
  }, 'Text to image generation');
  
  // 将结果保存到缓存
  apiCache.set(cacheKey, result);
  return result;
}

export async function generateVideo(
  prompt: string,
  aspectRatio: '16:9' | '9:16',
  onProgress: (message: string) => void,
  image?: ImageInput
): Promise<{ videoBlob: Blob; mimeType: string }> {
  onProgress('Initializing video generation...');
  
  const ai = createAI();
  const apiKey = getApiKey();
  
  // 优化输入图片（如果有）
  const optimizedImage = image ? await optimizeImageInput(image) : undefined;
  
  const imagePart = optimizedImage ? {
    imageBytes: optimizedImage.href.split(',')[1],
    mimeType: optimizedImage.mimeType,
  } : undefined;

  // 使用重试机制启动视频生成
  let operation: GenerateVideosOperation = await withRetry(async () => {
    return await ai.models.generateVideos({
      model: 'veo-3.0-fast-generate-001',
      prompt: prompt,
      image: imagePart,
      config: {
        numberOfVideos: 1,
        aspectRatio: aspectRatio,
      }
    });
  }, 'Video generation initialization');
  
  const progressMessages = [
      'Rendering frames...',
      'Compositing video...',
      'Applying final touches...',
      'Almost there...',
  ];
  let messageIndex = 0;

  onProgress('Generation started, this may take a few minutes.');

  while (!operation.done) {
    onProgress(progressMessages[messageIndex % progressMessages.length]);
    messageIndex++;
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 为状态检查添加重试机制
    operation = await withRetry(async () => {
      return await ai.operations.getVideosOperation({operation: operation});
    }, 'Video generation status check');
  }

  if (operation.error) {
    throw new Error(`Video generation failed: ${operation.error.message}`);
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) {
    throw new Error("Video generation completed, but no download link was found.");
  }

  // 为视频下载添加重试机制
  const { videoBlob, mimeType } = await withRetry(async () => {
    const response = await fetch(downloadLink, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    const mimeType = response.headers.get('content-type') || 'video/mp4';
    
    return { videoBlob, mimeType };
  }, 'Video download');

  return { videoBlob, mimeType };
}

// 带流式响应的图片编辑函数
export async function editImageWithStreaming(
  images: ImageInput[], 
  prompt: string,
  onProgress: ProgressCallback,
  mask?: ImageInput
): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null; }> {
  
  // 检查缓存
  const cacheKey = apiCache.generateCacheKey(prompt, images, mask);
  const cachedResult = apiCache.get(cacheKey);
  if (cachedResult) {
    console.log('使用缓存的图片编辑结果');
    onProgress('从缓存加载结果...', 100);
    await delay(300); // 短暂延迟模拟加载
    return cachedResult;
  }
  
  return await simulateStreamingProgress(async () => {
    return await withRetry(async () => {
      // 优化输入图片
      const optimizedImages = await Promise.all(images.map(optimizeImageInput));
      const optimizedMask = mask ? await optimizeImageInput(mask) : null;
      
      const imageParts = optimizedImages.map(image => {
        const dataUrlParts = image.href.split(',');
        const base64Data = dataUrlParts.length > 1 ? dataUrlParts[1] : dataUrlParts[0];
        return {
          inlineData: {
            data: base64Data,
            mimeType: image.mimeType,
          },
        };
      });

      const maskPart = optimizedMask ? {
        inlineData: {
          data: optimizedMask.href.split(',')[1],
          mimeType: optimizedMask.mimeType,
        },
      } : null;

      const textPart = { text: prompt };

      // For inpainting with a mask, the API expects a specific order: prompt, then image, then mask.
      // For other edits, the order is less strict. This ensures the mask is applied correctly.
      const parts = maskPart
        ? [textPart, ...imageParts, maskPart]
        : [...imageParts, textPart];

      const ai = createAI();
      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: parts,
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      });

      let newImageBase64: string | null = null;
      let newImageMimeType: string | null = null;
      let textResponse: string | null = null;

      if (response.candidates && response.candidates.length > 0 && response.candidates[0].content) {
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
          if (part.inlineData) {
            newImageBase64 = part.inlineData.data;
            newImageMimeType = part.inlineData.mimeType;
          } else if (part.text) {
            textResponse = part.text;
          }
        }
      } else {
          textResponse = "The AI response was blocked or did not contain content.";
          if (response.candidates && response.candidates.length > 0 && response.candidates[0].finishReason) {
              textResponse += ` (Reason: ${response.candidates[0].finishReason})`;
          }
      }
      
      if (!newImageBase64) {
          // Fallback or error if no image is generated
          console.warn("API response did not contain an image part.", response);
          textResponse = textResponse || "The AI did not generate a new image. Please try a different prompt.";
      }

      const result = {
        newImageBase64,
        newImageMimeType,
        textResponse
      };
      
      // 将结果保存到缓存
      apiCache.set(cacheKey, result);
      return result;
    }, 'Image editing');
  }, onProgress, '图片编辑');
}

// 带流式响应的文本生成图片函数
export async function generateImageFromTextWithStreaming(
  prompt: string,
  onProgress: ProgressCallback
): Promise<{ newImageBase64: string | null; newImageMimeType: string | null; textResponse: string | null; }> {
  // 检查缓存
  const cacheKey = apiCache.generateCacheKey(prompt);
  const cachedResult = apiCache.get(cacheKey);
  if (cachedResult) {
    console.log('使用缓存的文本生成图片结果');
    onProgress('从缓存加载结果...', 100);
    await delay(300); // 短暂延迟模拟加载
    return cachedResult;
  }
  
  return await simulateStreamingProgress(async () => {
    return await withRetry(async () => {
      const ai = createAI();
      const response = await ai.models.generateImages({
          model: 'imagen-4.0-fast-generate-001',
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
          },
      });

      if (response.generatedImages && response.generatedImages.length > 0) {
        const image = response.generatedImages[0];
        const result = {
          newImageBase64: image.image.imageBytes,
          newImageMimeType: 'image/png',
          textResponse: null
        };
        
        // 将结果保存到缓存
        apiCache.set(cacheKey, result);
        return result;
      } else {
        const result = {
          newImageBase64: null,
          newImageMimeType: null,
          textResponse: "The AI did not generate an image. Please try a different prompt."
        };
        
        // 将结果保存到缓存
        apiCache.set(cacheKey, result);
        return result;
      }
    }, 'Text to image generation');
  }, onProgress, '图片生成');
}
