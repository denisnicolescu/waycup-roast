const path = require('path');
const FileMergeWebpackPlugin = require('./FileMergeWebpackPlugin');

const mode = process.env.NODE_ENV || 'production';

const generateEntries = () => {
  const entries = {};

  entries["global"] = [
    path.resolve(__dirname, './assets/constants.min.js'),
    path.resolve(__dirname, './assets/pubsub.min.js'),
    path.resolve(__dirname, './assets/global.min.js'),
    path.resolve(__dirname, './assets/details-disclosure.min.js'),
    path.resolve(__dirname, './assets/details-modal.min.js'),
    path.resolve(__dirname, './assets/search-form.min.js'),
    path.resolve(__dirname, './assets/gpmd.global.min.js')
  ]
  entries["product"] = [
    path.resolve(__dirname, './assets/product-info.min.js'),
    path.resolve(__dirname, './assets/product-form.min.js')
  ]
  return entries;
};

module.exports = {
  mode: mode,
  entry: generateEntries(),
  output: {
    path: path.resolve(__dirname, 'node_modules/dist'), // side effect, not used
    filename: path.join('assets', '[name].js'),
  },
  plugins: [
    new FileMergeWebpackPlugin({
      destination: 'assets/global.bundle.min.js',
      files: generateEntries().global.map(file => file)
    }),
    new FileMergeWebpackPlugin({
      destination: 'assets/product.bundle.min.js',
      files: generateEntries().product.map(file => file)
    })
  ]
}
