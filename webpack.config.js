const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

const commonjsConfig = {
  plugins: [],
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

  externals: {
    'koffi': 'commonjs2 koffi',
    'ref-napi': 'commonjs2 ref-napi',
  },
}
module.exports = [
  // Main Process Configuration
  {
    mode: process.env.ENV === 'production' ? 'production' : 'development',
    entry: './src/main.ts',
    target: 'electron-main',
    output: {
      path: path.resolve(__dirname, 'dist'),
      libraryTarget: 'commonjs2',
      filename: 'main.js',
      chunkFilename: 'chunk-[name].js',
    },
    resolve: {
      extensions: ['.ts', '.js', '.json', '.node'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'agora_node_ext': path.resolve(__dirname, 'node_modules/agora-electron-sdk/build/Release/agora_node_ext.node')
      }
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
          test: /agora_node_ext(\.node)?$/,
          use: {
            loader: 'node-loader',
            options: { name: '[name].[ext]' }
          }
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    node: '16'
                  }
                }],
                '@babel/preset-typescript'
              ]
            }
          }
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    node: '16'
                  }
                }]
              ]
            }
          }
        },
        {
          test: /\.json$/,
          type: 'json'
        }
      ]
    },
    plugins: [
      ...commonjsConfig.plugins,
      new webpack.BannerPlugin({
        banner: '#!/usr/bin/env node',
        raw: true,
        entryOnly: true,
        include: /main\.js$/
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
      splitChunks: false,
    },
    performance: {
      hints: 'warning',
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
   externals: {
     ...commonjsConfig.externals,
     'agora-electron-sdk': 'commonjs2 agora-electron-sdk',
   },
  },

  // Preload Scripts Configuration
  {
    mode: process.env.ENV === 'production' ? 'production' : 'development',
    entry: {
      preload: './src/preload.ts',
      'stream-preload': './src/stream-preload.ts',
      'whiteboard-preload': './src/whiteboard-preload.ts',
      'screen-share-preload': './src/screen-share-preload.ts',
      'profile-selection-preload': './src/profile-selection-preload.ts'
    },
    target: 'electron-renderer',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      publicPath: './',
    },
    resolve: {
      extensions: ['.ts', '.js', '.json', '.node'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
        'agora_node_ext': path.resolve(__dirname, 'node_modules/agora-electron-sdk/build/Release/agora_node_ext.node'),
        '../../../build/Release/agora_node_ext': path.resolve(__dirname, 'node_modules/agora-electron-sdk/build/Release/agora_node_ext.node')
      }
    },
  
    module: {
      rules: [
        {
          test: /agora_node_ext(\.node)?$/,
          use: {
            loader: 'node-loader',
            options: { name: '[name].[ext]' }
          }
        },
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    node: '16'
                  }
                }],
                '@babel/preset-typescript'
              ]
            }
          }
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    node: '16'
                  }
                }]
              ]
            }
          }
        },
        {
          test: /\.json$/,
          type: 'json'
        }
      ]
    },
    plugins: [
      ...commonjsConfig.plugins,
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
      splitChunks: false,
    },
    performance: {
      hints: 'warning',
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    externals: {
      ...commonjsConfig.externals,
      'agora-electron-sdk': 'commonjs2 agora-electron-sdk',
    },
  },

  // Renderer Process Configuration
  {
    mode: process.env.ENV === 'production' ? 'production' : 'development',
    entry: {
      main: './src/renderer/index.tsx',
      'screen-share': './src/renderer/screen-share.tsx',
      'profile-selection': './src/renderer/profile-selection.tsx'
    },
    target: 'electron-renderer',
    output: {
      path: path.resolve(__dirname, 'dist/renderer'),
      filename: '[name].bundle.js',
      publicPath: './'
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx', '.node'],
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
        'agora_node_ext': path.resolve(__dirname, 'node_modules/agora-electron-sdk/build/Release/agora_node_ext.node'),
        '../../../build/Release/agora_node_ext': path.resolve(__dirname, 'node_modules/agora-electron-sdk/build/Release/agora_node_ext.node')
      },
      fallback: {
        global: false,
        fs: false,
        path: false,
        crypto: false,
      }
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
          test: /agora_node_ext(\.node)?$/,
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
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist/renderer')
      },
      compress: true,
      port: 3000,
      hot: true
    },
    plugins: [
      ...commonjsConfig.plugins,
      new webpack.DefinePlugin({
        global: 'globalThis',
      }),
      new webpack.ProvidePlugin({
        global: 'globalThis',
      }),
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        filename: 'index.html',
        inject: 'body',
        scriptLoading: 'defer',
        minify: process.env.ENV === 'production' ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          removeAttributeQuotes: true,
          removeEmptyAttributes: true,
          removeOptionalTags: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          removeTagWhitespace: true,  
          minifyCSS: true,
          minifyJS: true,
          minifyURLs: true,
        } : false,
        chunks: ['main'],
      }),
      new HtmlWebpackPlugin({
        template: './src/renderer/screen-share.html',
        filename: 'screen-share.html',
        inject: 'body',
        scriptLoading: 'defer',
        minify: process.env.ENV === 'production' ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          removeAttributeQuotes: true,
          removeEmptyAttributes: true,
          removeOptionalTags: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          removeTagWhitespace: true,  
          minifyCSS: true,
          minifyJS: true,
          minifyURLs: true,
        } : false,
        chunks: ['screen-share'],
      }),
      new HtmlWebpackPlugin({
        template: './src/renderer/profile-selection.html',
        filename: 'profile-selection.html',
        inject: 'body',
        scriptLoading: 'defer',
        minify: process.env.ENV === 'production' ? {
          collapseWhitespace: true,
          removeComments: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          useShortDoctype: true,
          removeAttributeQuotes: true,
          removeEmptyAttributes: true,
          removeOptionalTags: true,
          removeRedundantAttributes: true,
          removeScriptTypeAttributes: true,
          removeStyleLinkTypeAttributes: true,
          removeTagWhitespace: true,  
          minifyCSS: true,
          minifyJS: true,
          minifyURLs: true,
        } : false,
        chunks: ['profile-selection'],
      })
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
            name: 'renderer-vendors',
            chunks: 'all',
            priority: 10,
          },
        },
      },
    },
    performance: {
      hints: 'warning',
      maxEntrypointSize: 512000,
      maxAssetSize: 512000,
    },
    externals: {
      'koffi': 'commonjs2 koffi',
      'ref-napi': 'commonjs2 ref-napi',
      'agora-electron-sdk': 'commonjs2 agora-electron-sdk',
    }
  },

  // Cleanup Task Script Configuration
  {
    mode: process.env.ENV === 'production' ? 'production' : 'development',
    entry: './src/scripts/cleanup-task.ts',
    target: 'node',
    output: {
      path: path.resolve(__dirname, 'dist/scripts'),
      filename: 'cleanup-task.js',
      libraryTarget: 'commonjs2',
    },
    resolve: {
      extensions: ['.ts', '.js', '.json'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    node: '16'
                  }
                }],
                '@babel/preset-typescript'
              ]
            }
          }
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  targets: {
                    node: '16'
                  }
                }]
              ]
            }
          }
        }
      ]
    },
    plugins: [
      new webpack.BannerPlugin({
        banner: '#!/usr/bin/env node',
        raw: true,
        entryOnly: true,
      }),
    ],
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: false, // Keep console for logging in cleanup task
              drop_debugger: true,
            },
            mangle: false, // Don't mangle for easier debugging
          },
        }),
      ],
    },
    performance: {
      hints: false,
    },
  }
];
