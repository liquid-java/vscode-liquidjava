//@ts-check

'use strict';

const path = require('path');
const fs = require('fs');

/** @type {() => import('webpack').RuleSetRule} */
const createTsRule = () => ({
  test: /\.ts$/,
  exclude: /node_modules/,
  use: [
    {
      loader: 'ts-loader'
    }
  ]
});

/** @type {import('webpack').Configuration} */
const extensionConfig = {
  target: 'node',
  mode: 'none',
  entry: './src/extension.ts',
  output: {
    // store bundle in dist folder
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [createTsRule()]
  },
  plugins: [
    // Copy server JAR to dist folder after build
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('CopyServerJar', () => {
          const serverDir = path.resolve(__dirname, 'dist', 'server');
          const jarSource = path.resolve(__dirname, 'server', 'language-server-liquidjava.jar');
          const jarDest = path.resolve(serverDir, 'language-server-liquidjava.jar');
          if (!fs.existsSync(serverDir)) {
            fs.mkdirSync(serverDir, { recursive: true });
          }
          if (fs.existsSync(jarSource)) {
            fs.copyFileSync(jarSource, jarDest);
            console.log('Copied language-server-liquidjava.jar to dist/server/');
          } else {
            console.warn('Warning: language-server-liquidjava.jar not found at', jarSource);
            console.warn('Run: cd ../server && mvn clean package');
          }
        });
      }
    }
  ]
};

/** @type {import('webpack').Configuration} */
const webviewConfig = {
  target: 'web',
  mode: 'none',
  entry: './src/webview/main.ts',
  output: {
    path: path.resolve(__dirname, 'media'),
    filename: 'webview.js'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [createTsRule()]
  }
};

module.exports = [extensionConfig, webviewConfig];
