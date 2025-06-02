const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// Performance optimization configuration for Create React App
// This config extends the default CRA webpack config
module.exports = {
  // Optimization settings
  optimization: {
    // Enable production optimizations
    minimize: true,
    minimizer: [
      // Optimize JavaScript
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: process.env.NODE_ENV === 'production',
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
          mangle: true,
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],

    // Split chunks for better caching
    splitChunks: {
      chunks: 'all',
      minSize: 20000,
      maxSize: 244000,
      cacheGroups: {
        // Vendor chunks
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        
        // React vendor chunk
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
          name: 'react-vendor',
          chunks: 'all',
          priority: 20,
        },
        
        // Material-UI vendor chunk
        mui: {
          test: /[\\/]node_modules[\\/]@mui[\\/]/,
          name: 'mui-vendor',
          chunks: 'all',
          priority: 15,
        },
        
        // Common chunks
        common: {
          minChunks: 2,
          chunks: 'all',
          name: 'common',
          priority: 5,
          enforce: true,
        },
      },
    },

    // Runtime chunk for better caching
    runtimeChunk: {
      name: 'runtime',
    },
  },

  // Performance hints
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000, // 500kb
    maxAssetSize: 512000, // 500kb
  },

  // Plugins for optimization
  plugins: [
    // Gzip compression
    new CompressionPlugin({
      filename: '[path][base].gz',
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8,
    }),

    // Brotli compression
    new CompressionPlugin({
      filename: '[path][base].br',
      algorithm: 'brotliCompress',
      test: /\.(js|css|html|svg)$/,
      compressionOptions: {
        level: 11,
      },
      threshold: 8192,
      minRatio: 0.8,
    }),

    // Bundle analyzer (only in analyze mode)
    ...(process.env.ANALYZE_BUNDLE === 'true' ? [
      new BundleAnalyzerPlugin({
        analyzerMode: 'static',
        openAnalyzer: false,
        reportFilename: 'bundle-report.html',
      })
    ] : []),

    // Define environment variables
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ],

  // Resolve optimizations
  resolve: {
    // Faster module resolution
    modules: ['node_modules'],
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    
    // Alias for tree shaking
    alias: {
      // Use ES modules for better tree shaking
      'lodash': 'lodash-es',
    },
    
    // Symlink optimization
    symlinks: false,
  },

  // Module rules for optimization
  module: {
    rules: [
      // Tree shaking for Material-UI
      {
        test: /\.js$/,
        include: /node_modules\/@mui/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { modules: false }]
            ],
            plugins: [
              ['import', {
                libraryName: '@mui/material',
                libraryDirectory: '',
                camel2DashComponentName: false,
              }, 'core'],
              ['import', {
                libraryName: '@mui/icons-material',
                libraryDirectory: '',
                camel2DashComponentName: false,
              }, 'icons'],
            ],
          },
        },
      },
    ],
  },

  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      },
    },
  }),
};

// Export configuration for different environments
module.exports.getOptimizedConfig = (baseConfig) => {
  // Merge with base CRA config
  return {
    ...baseConfig,
    optimization: {
      ...baseConfig.optimization,
      ...module.exports.optimization,
    },
    plugins: [
      ...baseConfig.plugins,
      ...module.exports.plugins,
    ],
    resolve: {
      ...baseConfig.resolve,
      ...module.exports.resolve,
    },
  };
};

// Tree shaking configuration
module.exports.treeShakingRules = [
  // Material-UI tree shaking
  {
    test: /\.js$/,
    include: /node_modules\/@mui/,
    sideEffects: false,
  },
  
  // Lodash tree shaking
  {
    test: /\.js$/,
    include: /node_modules\/lodash/,
    sideEffects: false,
  },
  
  // Date-fns tree shaking
  {
    test: /\.js$/,
    include: /node_modules\/date-fns/,
    sideEffects: false,
  },
];

// Preload configuration
module.exports.preloadConfig = {
  // Critical resources to preload
  preloadResources: [
    '/static/css/main.[hash].css',
    '/static/js/main.[hash].js',
  ],
  
  // Resources to prefetch
  prefetchResources: [
    '/static/js/[id].[hash].chunk.js',
  ],
};

// Service Worker caching strategy
module.exports.cachingStrategy = {
  // Cache static assets
  staticAssets: {
    handler: 'CacheFirst',
    options: {
      cacheName: 'static-assets',
      expiration: {
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
  
  // Cache API responses
  apiResponses: {
    handler: 'NetworkFirst',
    options: {
      cacheName: 'api-cache',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 60 * 60, // 1 hour
      },
    },
  },
  
  // Cache images
  images: {
    handler: 'CacheFirst',
    options: {
      cacheName: 'images',
      expiration: {
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      },
    },
  },
};