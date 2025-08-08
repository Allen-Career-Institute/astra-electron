const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    main: './src/renderer/index.tsx',
    'second-window': './src/renderer/second-window.tsx',
    'third-window': './src/renderer/third-window.tsx'
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
  module: {
    rules: [
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
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
      filename: 'index.html',
      inject: true,
      minify: false,
      chunks: ['main']
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/second-window.html',
      filename: 'second-window.html',
      inject: true,
      minify: false,
      chunks: ['second-window']
    }),
    new HtmlWebpackPlugin({
      template: './src/renderer/third-window.html',
      filename: 'third-window.html',
      inject: true,
      minify: false,
      chunks: ['third-window']
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
  target: 'electron-renderer'
};
