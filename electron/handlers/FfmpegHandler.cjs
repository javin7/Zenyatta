const FormatHandler = require('../core/FormatHandler.cjs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('@ffmpeg-installer/ffmpeg');
const ffprobeStatic = require('@ffprobe-installer/ffprobe');

// Set ffmpeg paths for packaged app scenarios
ffmpeg.setFfmpegPath(ffmpegStatic.path.replace('app.asar', 'app.asar.unpacked'));
ffmpeg.setFfprobePath(ffprobeStatic.path.replace('app.asar', 'app.asar.unpacked'));

class FfmpegHandler extends FormatHandler {
  constructor() {
    super('FFmpeg');
    
    const videoFormats = ['mp4', 'webm', 'gif', 'avi', 'mov', 'mkv'];
    const audioFormats = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];
    const imageFormats = ['png', 'jpg', 'jpeg']; // For video frame extraction
    
    this.capabilityGroups = [
      { from: videoFormats, to: [...videoFormats, ...audioFormats, ...imageFormats] },
      { from: audioFormats, to: audioFormats }
    ];
  }

  async convert(inputPath, outputPath, fromExt, toExt) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);
      
      const imageFormats = ['png', 'jpg', 'jpeg'];
      if (imageFormats.includes(toExt)) {
         // Extract first frame
         command = command.frames(1).output(outputPath);
      } else {
         command = command.output(outputPath);
      }

      command
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(err.message)))
        .run();
    });
  }
}

module.exports = FfmpegHandler;
