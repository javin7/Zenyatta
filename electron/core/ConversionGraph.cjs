const crypto = require('crypto');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');

class ConversionGraph {
  constructor() {
    this.handlers = new Map(); // name -> handler instance
    this.graph = new Map(); // fromExt -> [{ toExt, handlerName }]
  }

  /**
   * Registers a handler and its conversion edges in the graph
   */
  registerHandler(handler) {
    this.handlers.set(handler.name, handler);
    const caps = handler.getCapabilities();
    for (const cap of caps) {
      if (!this.graph.has(cap.from)) {
        this.graph.set(cap.from, []);
      }
      this.graph.get(cap.from).push({ to: cap.to, handlerName: cap.handlerName });
    }
  }

  /**
   * Explores the graph using Breadth First Search to find all reachable formats.
   */
  getReachableFormats(startExt) {
    const reachable = new Set();
    const queue = [startExt];
    const visited = new Set([startExt]);

    while (queue.length > 0) {
      const current = queue.shift();
      const edges = this.graph.get(current) || [];
      
      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          reachable.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
    
    return Array.from(reachable);
  }

  /**
   * Finds the shortest path using Breadth First Search.
   */
  findPath(startExt, targetExt) {
    const queue = [{ ext: startExt, path: [] }];
    const visited = new Set([startExt]);

    while (queue.length > 0) {
      const { ext: currentExt, path: currentPath } = queue.shift();

      if (currentExt === targetExt) {
        return currentPath;
      }

      const edges = this.graph.get(currentExt) || [];
      for (const edge of edges) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push({
            ext: edge.to,
            path: [...currentPath, { from: currentExt, to: edge.to, handlerName: edge.handlerName }]
          });
        }
      }
    }

    return null; // No path found
  }

  /**
   * Orchestrates the execution of multiple handlers synchronously.
   * Tracks and cleans up intermediate temporary files automatically.
   */
  async executeConversion(inputPath, targetExt, finalOutputPath) {
    const parsed = path.parse(inputPath);
    const startExt = parsed.ext.toLowerCase().replace('.', '');
    
    if (startExt === targetExt) {
      await fs.copyFile(inputPath, finalOutputPath);
      return;
    }

    const conversionPath = this.findPath(startExt, targetExt);
    if (!conversionPath) {
      throw new Error(`No conversion path found from ${startExt} to ${targetExt}`);
    }

    let currentInput = inputPath;
    const tempFiles = [];

    try {
      for (let i = 0; i < conversionPath.length; i++) {
        const step = conversionPath[i];
        const handler = this.handlers.get(step.handlerName);
        
        let stepOutput;
        if (i === conversionPath.length - 1) {
          stepOutput = finalOutputPath; // Last handler outputs to final destination
        } else {
          // Generate an intermediate temporary file
          const tempId = crypto.randomBytes(8).toString('hex');
          stepOutput = path.join(os.tmpdir(), `zenyatta_tmp_${tempId}.${step.to}`);
          tempFiles.push(stepOutput);
        }

        await handler.convert(currentInput, stepOutput, step.from, step.to);
        currentInput = stepOutput;
      }
    } finally {
      // Cleanup all temporary intermediate objects
      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
        } catch (err) {
          console.error('Failed to cleanup temp file:', file, err);
        }
      }
    }
  }
}

module.exports = ConversionGraph;
