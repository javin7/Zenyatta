class FormatHandler {
  constructor(name) {
    this.name = name;
    // Arrays of capability groups: { from: string[], to: string[] }
    this.capabilityGroups = [];
  }

  getCapabilities() {
    const caps = [];
    for (const group of this.capabilityGroups) {
      for (const f of group.from) {
        for (const t of group.to) {
          if (f !== t) {
            caps.push({ from: f, to: t, handlerName: this.name });
          }
        }
      }
    }
    return caps;
  }

  async convert(inputPath, outputPath, fromExt, toExt) {
    throw new Error('convert() is not implemented on base FormatHandler');
  }
}
module.exports = FormatHandler;
