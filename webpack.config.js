const path = require('path');
const webpack = require('webpack');


const config = {
  entry: './src/index.js',
  target: 'node',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        include: __dirname,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  node: {
    fs: 'empty',
    net: 'empty',
    tls: 'empty',
  },
  plugins: [
    new webpack.IgnorePlugin(/pg-native/, /\/pg\//),
    new webpack.IgnorePlugin(/^electron$/)
  ],
  resolve: {
    alias: {
      hiredis: path.join(__dirname, 'aliases/hiredis.js'),
      'scrypt.js': path.resolve(__dirname, './node_modules/scrypt.js/js.js'),
    },
  },
};

module.exports = config;
