const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: {
    main: './src/renderer/index.tsx'
  },
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: '[name].bundle.js',
    publicPath: './'
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src/renderer')
    }
  },
  // Exclude native modules from webpack bundling
  externals: {
    'agora-electron-sdk': 'commonjs2 agora-electron-sdk',
    'koffi': 'commonjs2 koffi',
    'ref-napi': 'commonjs2 ref-napi',
    'electron': 'commonjs2 electron',
    'electron-store': 'commonjs2 electron-store',
    'electron-updater': 'commonjs2 electron-updater',
    '@electron/remote': 'commonjs2 @electron/remote',
    '@sentry/electron': 'commonjs2 @sentry/electron',
    '@sentry/node': 'commonjs2 @sentry/node',
    '@sentry/tracing': 'commonjs2 @sentry/tracing'
  },
  module: {
    rules: [
      {
        test: /\.node$/,
        use: {
          loader: 'node-loader',
          options: { name: '[name].[ext]' }
        }
      },
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript'
            ]
          }
        }
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react'
            ]
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/resource'
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': process.env.NODE_ENV || 'development',
      'process.env.STAGE_URL': process.env.STAGE_URL || 'https://console.allen-stage.in/',
      'process.env.PROD_URL': process.env.PROD_URL || 'https://astra.allen.in/',
      'process.env.CUSTOM_URL': process.env.CUSTOM_URL,
      'process.env.DEV_URL': process.env.DEV_URL || 'http://localhost:3000/',
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      inject: true,
      minify: process.env.NODE_ENV === 'production' ? {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      } : false,
      chunks: ['main']
    })
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist/renderer')
    },
    compress: true,
    port: 3000,
    hot: true
  },
  target: 'electron-renderer',
  optimization: {
    minimize: process.env.NODE_ENV === 'production',
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
  performance: {
    hints: process.env.NODE_ENV === 'production' ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  }
};
