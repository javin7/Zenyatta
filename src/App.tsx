import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileType, CheckCircle, ArrowRight, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    fsAPI: {
      getTargetFormats: (filePath: string, mime: string, ext: string) => Promise<string[]>;
      convertFile: (filePath: string, targetExt: string) => Promise<{ success: boolean; outputPath?: string; error?: string }>;
    };
  }
}

interface FileData {
  path: string;
  name: string;
  type: string;
  size: number;
}

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<FileData | null>(null);
  const [formats, setFormats] = useState<string[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [convertStatus, setConvertStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDragging(false);
      setConvertStatus('idle');

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedFile = e.dataTransfer.files[0];
        const ext = droppedFile.name.split('.').pop() || '';
        const fullPath = (droppedFile as any).path;

        setFile({
          name: droppedFile.name,
          path: fullPath,
          type: droppedFile.type,
          size: droppedFile.size
        });

        if (window.fsAPI) {
           try {
             const targetOptions = await window.fsAPI.getTargetFormats(fullPath, droppedFile.type, ext);
             setFormats(targetOptions || []);
             if (!targetOptions || targetOptions.length === 0) {
               setFile({
                 name: `Zero formats! ext="${ext}", type="${droppedFile.type}"`,
                 path: fullPath, type: droppedFile.type, size: droppedFile.size
               });
             }
           } catch (err: any) {
             setFile({
               name: `IPC Error: ${err.message}`,
               path: fullPath, type: droppedFile.type, size: droppedFile.size
             });
           }
        } else {
           setFormats(['jpg', 'png']);
           setFile({
             name: 'Browser Mode (No window.fsAPI)',
             path: fullPath, type: droppedFile.type, size: droppedFile.size
           });
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleConvert = async (format: string) => {
    if (!file || !window.fsAPI) return;
    
    setIsConverting(true);
    setConvertStatus('idle');
    try {
      const result = await window.fsAPI.convertFile(file.path, format);
      if (result.success) {
        setConvertStatus('success');
      } else {
        setConvertStatus('error');
      }
    } catch (e) {
      setConvertStatus('error');
    }
    setIsConverting(false);
  };

  const clearFile = () => {
    setFile(null);
    setFormats([]);
    setConvertStatus('idle');
  };

  return (
    <div className="flex flex-col h-screen w-full font-sans titlebar-drag-region">
      <div className="h-8 w-full flex-shrink-0" />

      <main className="flex-1 flex flex-col p-6 overflow-hidden no-drag">
        <header className="mb-8 text-center mt-4">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <h1 className="text-4xl font-extrabold text-zinc-100 mb-2">
              OmniConvert
            </h1>
            <p className="text-zinc-500 text-sm font-medium tracking-widest uppercase">Any format. Anywhere. Local.</p>
          </motion.div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {!file ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                ref={dropRef}
                className={`w-full max-w-2xl aspect-video flex flex-col items-center justify-center transition-all duration-300 ${
                  isDragging
                    ? 'scale-105 opacity-80'
                    : ''
                }`}
              >
                <div className="p-4 bg-zinc-800/80 rounded-full mb-4 shadow-lg text-zinc-300">
                  <UploadCloud size={48} />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-zinc-200">
                  {isDragging ? 'Drop it here!' : 'Drag & drop a file'}
                </h2>
                <p className="text-zinc-500 font-medium tracking-wide">
                  Formats auto-detected
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="convertpanel"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="w-full flex-1 flex flex-col h-full overflow-hidden filter grayscale"
              >
                <div className="glass p-6 rounded-[2.5rem] mb-6 flex items-center justify-between shadow-lg relative overflow-hidden group border border-zinc-800">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -z-10 rounded-full transition-all group-hover:scale-150"></div>
                  
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-zinc-800 rounded-full text-zinc-300 shadow-lg">
                      <FileType size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100 truncate max-w-sm" title={file.name}>
                        {file.name}
                      </h3>
                      <p className="text-zinc-500 text-sm font-semibold capitalize flex items-center gap-2">
                        {(file.size / 1024 / 1024).toFixed(2)} MB <span className="text-zinc-700">•</span> {file.name.split('.').pop()?.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={clearFile}
                    className="p-3 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {convertStatus !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-full mb-6 flex justify-center items-center gap-2 font-medium shadow-lg border
                      ${convertStatus === 'success' ? 'bg-zinc-800 text-zinc-200 border-zinc-600' : ''}
                      ${convertStatus === 'error' ? 'bg-zinc-950 text-zinc-400 border-zinc-800' : ''}
                    `}
                  >
                    {convertStatus === 'success' ? <><CheckCircle size={20} /> Successfully Converted & Saved</> : null}
                    {convertStatus === 'error' ? <><X size={20} /> Conversion Failed</> : null}
                  </motion.div>
                )}

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
                  <h4 className="text-zinc-400 font-medium mb-6 flex items-center gap-2 ml-2">
                    <ArrowRight size={16} className="text-zinc-500" /> Convert to...
                  </h4>
                  
                  {formats.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
                      {formats.map((format, idx) => (
                        <motion.button
                          key={format}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          disabled={isConverting}
                          onClick={() => handleConvert(format)}
                          className="group relative flex flex-col items-center justify-center p-6 bg-zinc-900 border border-zinc-800 rounded-[2rem] hover:bg-zinc-800 hover:border-zinc-600 hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer overflow-hidden"
                        >
                          <span className="text-2xl font-bold text-zinc-400 group-hover:text-white transition-all uppercase">
                            .{format}
                          </span>
                          
                          {isConverting && <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                            <Loader2 size={24} className="text-zinc-300 animate-spin" />
                          </div>}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-zinc-500 bg-zinc-900 rounded-[3rem] border border-zinc-800 border-dashed">
                      No conversions available for this exact file type yet.
                    </div>
                  )}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default App;
