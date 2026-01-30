# Defect Detection Web App

A mobile-first web application for real-time object detection using YOLO. Access through your phone's browser to use the rear camera for live inference.

## Features

- Mobile-optimized full-screen camera view
- Real-time YOLO inference using ONNX Runtime Web
- Bounding box visualization with labels and confidence scores
- Works on iOS and Android browsers
- Deployable to Vercel

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Add Your YOLO Model

Export your trained YOLO model to ONNX format:

```python
from ultralytics import YOLO

# Load your trained model
model = YOLO('path/to/your/trained_model.pt')

# Export to ONNX
model.export(format='onnx', imgsz=640, simplify=True)
```

Copy the generated `.onnx` file to:

```
public/models/model.onnx
```

### 3. Configure Class Names

Edit `src/lib/yoloInference.ts` and update the `classNames` array to match your model:

```typescript
const DEFAULT_CONFIG: ModelConfig = {
  modelPath: '/models/model.onnx',
  inputSize: 640,
  confidenceThreshold: 0.5,
  iouThreshold: 0.45,
  classNames: ['your', 'class', 'names', 'here'],
};
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Test on Mobile

For local mobile testing, you'll need HTTPS. Use ngrok or similar:

```bash
npx ngrok http 3000
```

Then open the ngrok URL on your phone.

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push this repository to GitHub
2. Import in Vercel dashboard
3. Deploy automatically

**Important:** Make sure your `model.onnx` file is in `public/models/` before deploying.

## Project Structure

```
├── public/
│   └── models/
│       └── model.onnx          # Your YOLO ONNX model (add manually)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout with mobile meta tags
│   │   ├── page.tsx            # Main page
│   │   └── globals.css         # Global styles
│   ├── components/
│   │   ├── CameraView.tsx      # Camera + inference component
│   │   └── BoundingBoxOverlay.tsx  # Detection visualization
│   ├── lib/
│   │   └── yoloInference.ts    # YOLO inference engine
│   └── types/
│       └── detection.ts        # TypeScript types
├── package.json
├── next.config.js
└── README.md
```

## Configuration Options

You can customize detection behavior in `src/lib/yoloInference.ts`:

| Option | Default | Description |
|--------|---------|-------------|
| `inputSize` | 640 | Model input size (must match export) |
| `confidenceThreshold` | 0.5 | Minimum confidence for detections |
| `iouThreshold` | 0.45 | IoU threshold for NMS |
| `classNames` | ['defect'] | Class labels for your model |

## Browser Compatibility

- **iOS Safari**: 14.5+
- **Chrome Mobile**: 88+
- **Firefox Mobile**: 85+
- **Samsung Internet**: 13+

## Troubleshooting

### Camera not working
- Ensure HTTPS is enabled (required for camera access)
- Check browser permissions for camera access
- Verify the device has a rear camera

### Model not loading
- Verify `model.onnx` exists in `public/models/`
- Check browser console for loading errors
- Ensure the model was exported with `simplify=True`

### Poor performance
- Reduce `inputSize` to 320 or 416
- Increase `confidenceThreshold` to reduce detections
- Use a smaller YOLO model variant (YOLOv8n vs YOLOv8m)

## License

MIT
