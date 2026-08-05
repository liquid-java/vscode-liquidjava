//@ts-check

"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import('webpack').Configuration} */
module.exports = {
  target: "node",
  mode: "none",
  entry: "./src/extension.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "extension.js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: {
    vscode: "commonjs vscode",
  },
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "vscode-languageserver-types$": path.resolve(
        __dirname,
        "node_modules/vscode-languageserver-types/lib/esm/main.js"
      ),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [{ loader: "ts-loader" }],
      },
    ],
  },
  plugins: [
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("CopyServerJar", () => {
          const serverDir = path.resolve(__dirname, "dist", "server");
          const jarSource = path.resolve(__dirname, "server", "language-server-liquidjava.jar");
          const jarDest = path.resolve(serverDir, "language-server-liquidjava.jar");
          if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });
          if (fs.existsSync(jarSource)) fs.copyFileSync(jarSource, jarDest);
        });
      },
    },
  ],
};
