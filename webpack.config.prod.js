const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: {
    main: './src/renderer/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: '[name].[contenthash].js',
    publicPath: './',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src/renderer'),
    },
  },
  // Exclude native modules from webpack bundling
  externals: {
    'agora-electron-sdk': 'commonjs2 agora-electron-sdk',
    koffi: 'commonjs2 koffi',
    'ref-napi': 'commonjs2 ref-napi',
    electron: 'commonjs2 electron',
    'electron-store': 'commonjs2 electron-store',
    'electron-updater': 'commonjs2 electron-updater',
    '@electron/remote': 'commonjs2 @electron/remote',
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        use: {
          loader: 'node-loader',
          options: { name: '[name].[ext]' },
        },
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'node 18' }],
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'node 18' }],
              '@babel/preset-react',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource',
        parser: {
          dataUrlCondition: {
            maxSize: 4 * 1024, // 4KB
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.ENV': JSON.stringify(process.env.ENV || 'production'),
      'process.env.STAGE_URL': JSON.stringify(
        process.env.STAGE_URL || 'https://console.allen-stage.in/'
      ),
      'process.env.PROD_URL': JSON.stringify(
        process.env.PROD_URL || 'https://astra.allen.in/'
      ),
      'process.env.CUSTOM_URL': JSON.stringify(
        process.env.CUSTOM_URL || 'https://console.allen-stage.in/'
      ),
      'process.env.DEV_URL': JSON.stringify(
        process.env.DEV_URL || 'http://localhost:3000/'
      ),
      'process.env.ASTRA_ELECTRON_SENTRY_DSN': JSON.stringify(
        process.env.ASTRA_ELECTRON_SENTRY_DSN || ''
      ),
      'process.env.ASTRA_ELECTRON_SENTRY_ENDPOINT': JSON.stringify(
        process.env.ASTRA_ELECTRON_SENTRY_ENDPOINT || ''
      ),
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      inject: true,
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true,
      },
      chunks: ['main'],
    }),
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug'],
          },
          mangle: true,
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
          priority: 10,
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          priority: 5,
        },
      },
    },
  },
  performance: {
    hints: 'warning',
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  target: 'electron-renderer',
};
