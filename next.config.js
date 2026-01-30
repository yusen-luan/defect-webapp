/** @type {import('next').NextConfig} */
const nextConfig = {
  // No special headers needed - we use single-threaded WASM
  // which doesn't require SharedArrayBuffer/COOP/COEP
};

module.exports = nextConfig;
