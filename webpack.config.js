const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const glob = require('glob');
const Dotenv = require('dotenv-webpack');

const mode = process.env.NODE_ENV || 'production';

const generateEntries = () => {
  const entries = {};

  const assetJsFiles = glob.sync('./assets/*.js')
    .filter(file => !file.endsWith('.min.js'));

  assetJsFiles.forEach(file => {
    const fileName = path.basename(file, path.extname(file));
    entries[fileName] = path.resolve(__dirname, file);
  });

  // in case you have multiple scripts in a folder
  const ScriptFiles = glob.sync('./scripts/**/{main,index}.js');
  ScriptFiles.forEach(file => {
    const folderName = path.basename(path.dirname(file));
    entries[folderName] = path.resolve(__dirname, file);
  });

  return entries;
};

module.exports = {
  mode: mode,
  entry: generateEntries(),
  output: {
    iife: false,
    filename: '[name].min.js', // Output file naming convention for JS
    path: path.resolve(__dirname, 'assets'), // Output path
    clean: false,
  },
  plugins: [
    new Dotenv(), // Load environment variables
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          ecma: 2020, // Specify ECMAScript version
          compress: {
            drop_console: true,
            unused: false,
            dead_code: true,
            toplevel: false
          },
          mangle: {
            toplevel: false,
          },
          output: {
            comments: false,
            beautify: false
          }
        },
        extractComments: false
      })
    ]
  }
};
