/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for ONNX Runtime Web to work properly
  webpack: (config, { isServer }) => {
    // Fix for onnxruntime-web
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Exclude node-specific onnxruntime files from browser bundle
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
      };

      // Ignore node-specific .node files
      config.module.rules.push({
        test: /\.node$/,
        use: 'ignore-loader',
      });
    }

    // Handle .mjs files properly
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules/,
      type: 'javascript/auto',
    });

    // Mark onnxruntime-web as external for server builds
    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-web'];
    }

    return config;
  },

  // Transpile onnxruntime-web
  transpilePackages: ['onnxruntime-web'],

  // Disable server-side rendering for the main page (client-only app)
  experimental: {
    serverComponentsExternalPackages: ['onnxruntime-web'],
  },

  // Allow loading ONNX model files
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
