export interface Detection {
  /** Bounding box x coordinate (top-left) */
  x: number;
  /** Bounding box y coordinate (top-left) */
  y: number;
  /** Bounding box width */
  width: number;
  /** Bounding box height */
  height: number;
  /** Class label */
  label: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Class index */
  classId: number;
}

export interface ModelConfig {
  /** Path to the ONNX model file */
  modelPath: string;
  /** Input image size (width and height, typically 640 for YOLOv8) */
  inputSize: number;
  /** Confidence threshold for detections */
  confidenceThreshold: number;
  /** IoU threshold for NMS */
  iouThreshold: number;
  /** Class names array */
  classNames: string[];
}

export interface InferenceResult {
  /** Array of detections */
  detections: Detection[];
  /** Inference time in milliseconds */
  inferenceTime: number;
}
