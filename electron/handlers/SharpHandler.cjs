const FormatHandler = require('../core/FormatHandler.cjs');
const sharp = require('sharp');

class SharpHandler extends FormatHandler {
  constructor() {
    super('Sharp');
    
    // Defines input and output formats supported by sharp for Zenyatta
    const sharpInputFormats = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff', 'gif'];
    const sharpOutputFormats = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'tiff'];
    
    this.capabilityGroups = [
      { from: sharpInputFormats, to: sharpOutputFormats }
    ];
  }

  async convert(inputPath, outputPath, fromExt, toExt) {
    const format = toExt === 'jpg' ? 'jpeg' : toExt;
    await sharp(inputPath).toFormat(format).toFile(outputPath);
  }
}

module.exports = SharpHandler;
