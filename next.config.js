/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent Node.js-specific ONNX runtime files from being bundled
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
      };

      // Ignore node-specific files
      config.module.rules.push({
        test: /ort\.node\.min\.mjs$/,
        use: 'null-loader',
      });

      // Fallbacks for Node.js built-ins
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        module: false,
      };
    }

    return config;
  },

  // Allow loading ONNX model files with required headers for SharedArrayBuffer
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
