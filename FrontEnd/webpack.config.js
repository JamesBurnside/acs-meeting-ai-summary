// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

const webpackConfig = (env) => {
  const config = {
    entry: './src/index.tsx',
    ...(env.production || !env.development ? {} : { devtool: 'eval-source-map' }),
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
      alias: {
        // reference internal packlets src directly for hot reloading when developing
        '@azure/communication-react': path.resolve(
          __dirname,
          './node_modules/@azure/communication-react/dist/dist-esm/communication-react/src'
        )
      }
    },
    output: {
      path: path.join(__dirname, env.production ? '/dist/build' : 'dist'),
      filename: 'build.js'
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          },
          exclude: /dist/
        },
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.svg/,
          type: 'asset/inline'
        },
        {
          test: /\.mp3$/,
          loader: 'file-loader'
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './public/index.html' }),
      new webpack.DefinePlugin({
        'process.env.PRODUCTION': env.production || !env.development,
        'process.env.NAME': JSON.stringify(require(path.resolve(__dirname, 'package.json')).name),
        'process.env.VERSION': JSON.stringify(require(path.resolve(__dirname, 'package.json')).version),
        __CALLINGVERSION__: JSON.stringify(
          require(path.resolve(__dirname, 'package.json')).dependencies['@azure/communication-calling']
        ),
        __COMMUNICATIONREACTVERSION__: JSON.stringify(
          require(path.resolve(__dirname, 'package.json')).dependencies['@azure/communication-react']
        ),
        __BUILDTIME__: JSON.stringify(new Date().toLocaleString())
      }),
      new CopyPlugin({
        patterns: [
          { from: path.resolve(__dirname, 'public/manifest.json'), to: 'manifest.json' },
          { from: path.resolve(__dirname, 'public/assets'), to: 'assets', noErrorOnMissing: true }
        ]
      })
    ],
    devServer: {
      port: 3000,
      hot: true,
      open: true,
      static: { directory: path.resolve(__dirname, 'public') },
      proxy: [
        {
          path: '/api/*',
          target: 'http://[::1]:8080'
        }
      ]
    }
  };

  return config;
};

module.exports = webpackConfig;