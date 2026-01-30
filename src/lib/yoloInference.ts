import { Detection, ModelConfig, InferenceResult } from '@/types/detection';

// Default configuration - update classNames when you add your model
const DEFAULT_CONFIG: ModelConfig = {
  modelPath: '/models/best.onnx',
  inputSize: 640,
  confidenceThreshold: 0.4,
  iouThreshold: 0.45,
  // Update these class names to match your trained model
  classNames: ['CRACK', 'RUSTY_SCREW', 'MISSING_SCREW', 'SEALANT'],
};

// ONNX Runtime loaded from CDN
declare global {
  interface Window {
    ort: typeof import('onnxruntime-web');
  }
}

// Load ONNX Runtime from CDN
async function loadOnnxRuntime(): Promise<typeof import('onnxruntime-web')> {
  if (typeof window !== 'undefined' && window.ort) {
    return window.ort;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/ort.min.js';
    script.async = true;
    script.onload = () => {
      if (window.ort) {
        resolve(window.ort);
      } else {
        reject(new Error('ONNX Runtime failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load ONNX Runtime from CDN'));
    document.head.appendChild(script);
  });
}

export class YOLOInference {
  private session: any = null;
  private ort: typeof import('onnxruntime-web') | null = null;
  private config: ModelConfig;
  private isLoading = false;

  constructor(config: Partial<ModelConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async loadModel(): Promise<void> {
    if (this.session || this.isLoading) return;

    this.isLoading = true;
    try {
      // Load ONNX Runtime from CDN
      this.ort = await loadOnnxRuntime();

      // Configure ONNX Runtime for WebGL/WASM execution
      this.ort.env.wasm.numThreads = 1; // Use single thread for better compatibility
      this.ort.env.wasm.simd = true;

      this.session = await this.ort.InferenceSession.create(this.config.modelPath, {
        executionProviders: ['webgl', 'wasm'],
        graphOptimizationLevel: 'all',
      });

      console.log('YOLO model loaded successfully');
    } catch (error) {
      console.error('Failed to load YOLO model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  async detect(imageData: ImageData): Promise<InferenceResult> {
    if (!this.session || !this.ort) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    const startTime = performance.now();

    // Preprocess image
    const input = this.preprocess(imageData);

    // Run inference
    const feeds: Record<string, any> = {
      images: input, // Adjust input name if your model uses different name
    };

    const results = await this.session.run(feeds);

    // Get output tensor (adjust output name based on your model)
    const output = results[Object.keys(results)[0]];

    // Postprocess results
    const detections = this.postprocess(
      output.data as Float32Array,
      output.dims,
      imageData.width,
      imageData.height
    );

    const inferenceTime = performance.now() - startTime;

    return { detections, inferenceTime };
  }

  private preprocess(imageData: ImageData): any {
    if (!this.ort) throw new Error('ONNX Runtime not loaded');

    const { inputSize } = this.config;
    const { data, width, height } = imageData;

    // Create a canvas to resize the image
    const canvas = document.createElement('canvas');
    canvas.width = inputSize;
    canvas.height = inputSize;
    const ctx = canvas.getContext('2d')!;

    // Create temporary canvas with original image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d')!;
    const tempImageData = tempCtx.createImageData(width, height);
    tempImageData.data.set(data);
    tempCtx.putImageData(tempImageData, 0, 0);

    // Draw resized image
    ctx.drawImage(tempCanvas, 0, 0, inputSize, inputSize);

    // Get resized image data
    const resizedData = ctx.getImageData(0, 0, inputSize, inputSize).data;

    // Convert to float32 and normalize (RGB, CHW format)
    const float32Data = new Float32Array(3 * inputSize * inputSize);

    for (let i = 0; i < inputSize * inputSize; i++) {
      const pixelIndex = i * 4;
      // Normalize to 0-1 range and arrange in CHW format
      float32Data[i] = resizedData[pixelIndex] / 255.0; // R
      float32Data[inputSize * inputSize + i] = resizedData[pixelIndex + 1] / 255.0; // G
      float32Data[2 * inputSize * inputSize + i] = resizedData[pixelIndex + 2] / 255.0; // B
    }

    return new this.ort.Tensor('float32', float32Data, [1, 3, inputSize, inputSize]);
  }

  private postprocess(
    outputData: Float32Array,
    dims: readonly number[],
    originalWidth: number,
    originalHeight: number
  ): Detection[] {
    const { inputSize, confidenceThreshold, iouThreshold, classNames } = this.config;
    const detections: Detection[] = [];

    // YOLOv8 output format: [1, num_classes + 4, num_detections]
    // Where first 4 values are: x_center, y_center, width, height
    const numClasses = classNames.length;
    const numDetections = dims[2];

    // Scale factors for converting back to original image size
    const scaleX = originalWidth / inputSize;
    const scaleY = originalHeight / inputSize;

    for (let i = 0; i < numDetections; i++) {
      // Get box coordinates (YOLO format: center x, center y, width, height)
      const cx = outputData[i];
      const cy = outputData[numDetections + i];
      const w = outputData[2 * numDetections + i];
      const h = outputData[3 * numDetections + i];

      // Find best class
      let maxScore = 0;
      let maxClassId = 0;

      for (let c = 0; c < numClasses; c++) {
        const score = outputData[(4 + c) * numDetections + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }

      // Filter by confidence
      if (maxScore >= confidenceThreshold) {
        // Convert to top-left corner format and scale to original size
        const x = (cx - w / 2) * scaleX;
        const y = (cy - h / 2) * scaleY;
        const width = w * scaleX;
        const height = h * scaleY;

        detections.push({
          x: Math.max(0, x),
          y: Math.max(0, y),
          width: Math.min(width, originalWidth - x),
          height: Math.min(height, originalHeight - y),
          label: classNames[maxClassId],
          confidence: maxScore,
          classId: maxClassId,
        });
      }
    }

    // Apply Non-Maximum Suppression
    return this.nms(detections, iouThreshold);
  }

  private nms(detections: Detection[], iouThreshold: number): Detection[] {
    // Sort by confidence (descending)
    const sorted = [...detections].sort((a, b) => b.confidence - a.confidence);
    const result: Detection[] = [];

    while (sorted.length > 0) {
      const best = sorted.shift()!;
      result.push(best);

      // Remove overlapping detections
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].classId === best.classId) {
          const iou = this.calculateIoU(best, sorted[i]);
          if (iou > iouThreshold) {
            sorted.splice(i, 1);
          }
        }
      }
    }

    return result;
  }

  private calculateIoU(a: Detection, b: Detection): number {
    const x1 = Math.max(a.x, b.x);
    const y1 = Math.max(a.y, b.y);
    const x2 = Math.min(a.x + a.width, b.x + b.width);
    const y2 = Math.min(a.y + a.height, b.y + b.height);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    const union = areaA + areaB - intersection;

    return intersection / union;
  }

  updateConfig(config: Partial<ModelConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ModelConfig {
    return { ...this.config };
  }

  isModelLoaded(): boolean {
    return this.session !== null;
  }
}
