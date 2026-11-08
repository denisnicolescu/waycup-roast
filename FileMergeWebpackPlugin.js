const fs = require('fs');
class FileMergeWebpackPlugin {
  constructor({ files, destination }) {
    this.files = files;
    this.destination = destination;
  }
  apply(compiler) {
    compiler.hooks.afterEmit.tap('FileMergeWebpackPlugin', () => {
      const fileBuffers = this.files
        .filter(file => fs.existsSync(file))
        .map(file => fs.readFileSync(file));

      fs.writeFileSync(this.destination, Buffer.concat(fileBuffers), { encoding: 'utf-8' });
    });
  }
}

module.exports = FileMergeWebpackPlugin;
