/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const path = require('path');
const glob = require('glob-all');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const PurifyCSSPlugin = require('purifycss-webpack');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlCriticalPlugin = require('html-critical-webpack-plugin');
const {InjectManifest} = require('workbox-webpack-plugin');

module.exports = (env, argv) => {
  const devMode = argv.mode !== 'production';

  return {
    entry: {
      app: './src/app.js',
      sw: './src/firebase-messaging-sw.js',
    },
    output: {
      path: path.resolve(__dirname, 'public'),
      publicPath: '/',
      chunkFilename: 'js/chunk.[id].[hash].js',
      filename: (entrypoint) => {
        if (entrypoint.chunk.name === 'app') {
          return 'js/bundle.[hash].js';
        } else if (entrypoint.chunk.name === 'sw') {
          return 'firebase-messaging-sw.js';
        }
      },
    },
    devtool: devMode ? 'cheap-module-source-map' : 'source-map',
    context: __dirname,
    target: 'web',
    stats: 'normal', // lets you precisely control what bundle information gets displayed
    devServer: {
      contentBase: path.join(__dirname, 'public'), // boolean | string | array, static file location
      filename: /js\/bundle\..*\.js$/,
      compress: true, // enable gzip compression
      historyApiFallback: true, // true for index.html upon 404, object for multiple paths
      inline: true,
      port: 5000,
      hot: false, // hot module replacement. Depends on HotModuleReplacementPlugin
      https: false, // true for self-signed, object for cert authority
      noInfo: true, // only errors & warns on hot reload
    },
    module: {
      rules: [
        {
          test: /\.html$/,
          use: 'html-loader',
        },
        {
          test: /\.(sa|sc|c)ss$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            'sass-loader',
          ],
        },
        {
          test: /\.(eot|svg|ttf|woff|woff2)$/,
          use: [
            {
              loader: 'file-loader',
              options: {
                name: '[name].[ext]',
                publicPath: '/fonts',
                outputPath: 'fonts',
              },
            },
          ],
        },
        {
          test: /\.(jpe?g|png|svg)$/,
          use: {
            loader: 'base64-inline-loader',
          },
        },
        {
          test: /firebaseui\.css$/,
          loader: 'string-replace-loader',
          include: path.resolve('node_modules/firebaseui/dist/'),
          query: {
            search: '@import url(https://fonts.googleapis.com/css?family=Roboto:400,500,700);',
            replace: '',
          },
        },
        {
          test: /material\-icons\.css$/,
          loader: 'string-replace-loader',
          include: path.resolve('node_modules/material-design-icons/iconfont/'),
          query: {
            search: '@font-face {',
            replace: '@font-face {font-display: fallback;',
          },
        },
      ],
    },
    optimization: {
      minimizer: devMode ? [] : [
        new UglifyJsPlugin({
          cache: true,
          parallel: true,
          sourceMap: true,
        }),
        new OptimizeCssAssetsPlugin({
          cssProcessor: require('cssnano'),
          cssProcessorOptions: {preset: 'default'},
          canPrint: true,
          sourceMap: true,
        }),
        new PurifyCSSPlugin({
          // Give paths to all assets that generate DOM content.
          paths: glob.sync([
            path.join(__dirname, 'src/*.js'),
            path.join(__dirname, 'node_modules/firebaseui/dist/firebaseui.js'),
            path.join(__dirname, 'node_modules/material-design-lite/material.js'),
            path.join(__dirname, 'src/index.html'),
          ]),
        }),
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/index.html',
        chunks: ['app'],
      }),
      new MiniCssExtractPlugin({
        filename: 'css/styles.[hash].css',
      }),
      devMode ? () => {} : new HtmlCriticalPlugin({
        base: path.resolve(__dirname, 'public'),
        src: 'index.html',
        dest: 'index.html',
        inline: true,
        minify: true,
        extract: false,
        width: 411,
        height: 731,
        penthouse: {
          blockJSRequests: false,
        },
      }),
      new InjectManifest({
        swSrc: 'src/workbox-sw.js',
        importWorkboxFrom: 'local',
        importsDirectory: 'workbox',
      }),
    ],
  };
};
