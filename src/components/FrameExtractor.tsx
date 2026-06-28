import { useCallback, useEffect, useRef, useState } from 'react';
import { createZip, type ZipEntry } from '../lib/zip';

type ExtractMode = 'interval' | 'count';
type ImageFormat = 'image/png' | 'image/jpeg';

interface Frame {
  id: number;
  url: string;
  blob: Blob;
  time: number;
  name: string;
}

function formatTime(t: number): string {
  const mm = Math.floor(t / 60);
  const ss = t % 60;
  return `${String(mm).padStart(2, '0')}:${ss.toFixed(2).padStart(5, '0')}`;
}

function baseName(fileName: string): string {
  return fileName.replace(/\.[^/.]+$/, '') || 'video';
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke a bit later so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Seek the video and resolve once the frame at that time is actually decoded.
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('Errore durante il seek del video'));
    };
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    // Clamp slightly inside the duration to avoid landing past the last frame.
    video.currentTime = Math.min(time, Math.max(0, video.duration - 0.001));
  });
}

export function FrameExtractor() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameId = useRef(0);

  const [fileName, setFileName] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  const [mode, setMode] = useState<ExtractMode>('interval');
  const [intervalSec, setIntervalSec] = useState(1);
  const [count, setCount] = useState(20);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const [format, setFormat] = useState<ImageFormat>('image/png');
  const [quality, setQuality] = useState(0.92);
  const [maxWidth, setMaxWidth] = useState(0); // 0 = risoluzione originale

  const [frames, setFrames] = useState<Frame[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    document.title = 'Estrattore Frame Video — BJG';
  }, []);

  // Revoke object URLs when frames or video are replaced / on unmount.
  useEffect(() => () => frames.forEach((f) => URL.revokeObjectURL(f.url)), [frames]);
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  const ext = format === 'image/png' ? 'png' : 'jpg';

  const loadFile = useCallback((file: File) => {
    if (!file.type.startsWith('video/')) {
      setError('Il file selezionato non è un video.');
      return;
    }
    setError('');
    // Clear previous state.
    setFrames((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url));
      return [];
    });
    setVideoUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setFileName(file.name);
  }, []);

  const onVideoLoaded = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration);
    setDims({ w: v.videoWidth, h: v.videoHeight });
    setStartTime(0);
    setEndTime(v.duration);
  };

  const drawCurrentFrame = useCallback(
    async (time: number): Promise<{ blob: Blob } | null> => {
      const v = videoRef.current;
      const canvas = canvasRef.current;
      if (!v || !canvas) return null;

      const scale = maxWidth > 0 && v.videoWidth > maxWidth ? maxWidth / v.videoWidth : 1;
      canvas.width = Math.round(v.videoWidth * scale);
      canvas.height = Math.round(v.videoHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), format, format === 'image/jpeg' ? quality : undefined)
      );
      if (!blob) return null;
      return { blob };
    },
    [format, quality, maxWidth]
  );

  const addFrame = useCallback(
    (blob: Blob, time: number, index: number) => {
      const id = frameId.current++;
      const name = `${baseName(fileName)}_${String(index).padStart(4, '0')}_${time
        .toFixed(2)
        .replace('.', '-')}s.${ext}`;
      const frame: Frame = { id, url: URL.createObjectURL(blob), blob, time, name };
      setFrames((prev) => [...prev, frame]);
    },
    [fileName, ext]
  );

  const computeTimes = useCallback((): number[] => {
    const a = Math.max(0, Math.min(startTime, endTime));
    const b = Math.min(duration, Math.max(startTime, endTime));
    const span = b - a;
    if (span <= 0) return [];

    const times: number[] = [];
    if (mode === 'interval') {
      const step = Math.max(0.01, intervalSec);
      for (let t = a; t <= b + 1e-6; t += step) times.push(Math.min(t, b));
    } else {
      const n = Math.max(1, Math.floor(count));
      if (n === 1) {
        times.push(a + span / 2);
      } else {
        for (let i = 0; i < n; i++) times.push(a + (span * i) / (n - 1));
      }
    }
    return times;
  }, [startTime, endTime, duration, mode, intervalSec, count]);

  const extract = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    const times = computeTimes();
    if (times.length === 0) {
      setError('Intervallo non valido: controlla inizio/fine.');
      return;
    }
    setError('');
    setExtracting(true);
    setProgress({ done: 0, total: times.length });

    const grab = async (time: number) => {
      const res = await drawCurrentFrame(time);
      if (res) addFrame(res.blob, time, frameId.current + 1);
    };

    // iOS Safari returns the same (initial) frame when grabbing after a
    // programmatic seek on a paused video. Playing the video muted and
    // capturing frames as they are actually presented (via
    // requestVideoFrameCallback) is reliable across browsers including mobile.
    const supportsRVFC =
      typeof HTMLVideoElement !== 'undefined' &&
      'requestVideoFrameCallback' in HTMLVideoElement.prototype;

    try {
      if (supportsRVFC) {
        await new Promise<void>((resolve, reject) => {
          // Non-null, typed local so the nested callbacks keep the narrowing
          // and can call requestVideoFrameCallback.
          const vid = v as HTMLVideoElement & {
            requestVideoFrameCallback: (
              cb: (now: number, meta?: { mediaTime: number }) => void
            ) => void;
          };
          let idx = 0;
          let finished = false;
          const spacing =
            times.length > 1
              ? (times[times.length - 1] - times[0]) / (times.length - 1)
              : 0.5;
          // Faster than realtime, but slow enough that presented frames stay
          // finer than the requested spacing (so no targets get skipped).
          const rate = Math.min(4, Math.max(1, spacing * 6));
          vid.muted = true;

          // `busy` serializes captures: drawing shares one canvas, and the
          // target index is claimed synchronously so a frame can never be
          // captured twice (e.g. by onFrame and onEnded racing at the end).
          let busy = false;

          const pump = () => {
            if (finished) return;
            vid.requestVideoFrameCallback(onFrame);
          };

          const finish = () => {
            if (finished) return;
            finished = true;
            vid.removeEventListener('ended', onEnded);
            vid.pause();
            resolve();
          };

          function onFrame(_now: number, meta?: { mediaTime: number }) {
            if (finished || busy) return;
            if (idx >= times.length) {
              finish();
              return;
            }
            const t = meta ? meta.mediaTime : vid.currentTime;
            if (t + 1e-3 < times[idx]) {
              pump();
              return;
            }
            busy = true;
            const myIdx = idx;
            idx += 1;
            grab(times[myIdx]).then(() => {
              busy = false;
              setProgress({ done: idx, total: times.length });
              if (idx >= times.length) finish();
              else pump();
            });
          }

          // The video can end before a presented frame reaches the last
          // targets (e.g. when they sit at the very end): grab whatever
          // remains from the final frame.
          function onEnded() {
            (async () => {
              while (busy) await new Promise((r) => setTimeout(r, 10));
              while (!finished && idx < times.length) {
                busy = true;
                const myIdx = idx;
                idx += 1;
                await grab(times[myIdx]);
                busy = false;
                setProgress({ done: idx, total: times.length });
              }
              finish();
            })();
          }

          const begin = () => {
            vid.playbackRate = rate;
            vid.requestVideoFrameCallback(onFrame);
            vid.addEventListener('ended', onEnded, { once: true });
            vid.play().catch(reject);
          };

          const startAt = Math.max(0, times[0] - 0.05);
          if (Math.abs(vid.currentTime - startAt) > 0.05) {
            const onSeeked = () => {
              vid.removeEventListener('seeked', onSeeked);
              begin();
            };
            vid.addEventListener('seeked', onSeeked);
            vid.currentTime = startAt;
          } else {
            begin();
          }
        });
      } else {
        v.pause();
        for (let i = 0; i < times.length; i++) {
          await seekTo(v, times[i]);
          await grab(times[i]);
          setProgress({ done: i + 1, total: times.length });
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore durante l’estrazione.');
    } finally {
      v.playbackRate = 1;
      v.pause();
      setExtracting(false);
    }
  }, [videoUrl, computeTimes, drawCurrentFrame, addFrame]);

  const captureCurrent = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    setError('');
    const res = await drawCurrentFrame(v.currentTime);
    if (res) addFrame(res.blob, v.currentTime, frameId.current + 1);
  }, [videoUrl, drawCurrentFrame, addFrame]);

  const removeFrame = (id: number) => {
    setFrames((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.url);
      return prev.filter((x) => x.id !== id);
    });
  };

  const clearFrames = () => {
    setFrames((prev) => {
      prev.forEach((f) => URL.revokeObjectURL(f.url));
      return [];
    });
  };

  const downloadAll = useCallback(async () => {
    if (frames.length === 0) return;
    const entries: ZipEntry[] = [];
    for (const f of frames) {
      const buf = new Uint8Array(await f.blob.arrayBuffer());
      entries.push({ name: f.name, data: buf });
    }
    const zip = createZip(entries);
    triggerDownload(zip, `${baseName(fileName)}_frames.zip`);
  }, [frames, fileName]);

  const estimatedCount = computeTimes().length;

  return (
    <div className="min-h-screen w-screen overflow-auto bg-gray-900 text-gray-100">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div>
          <h1 className="text-xl font-semibold">🎞️ Estrattore Frame Video</h1>
          <p className="text-sm text-gray-400">
            Carica un video, estrai i fotogrammi come immagini. Tutto in locale nel browser.
          </p>
        </div>
        <a href="#/booth" className="text-sm text-gray-400 hover:text-gray-200 underline">
          Configuratore Stand 3D →
        </a>
      </header>

      <main className="p-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Colonna sinistra: video + anteprima frame */}
        <section className="min-w-0 space-y-4">
          {!videoUrl ? (
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) loadFile(file);
              }}
              className={`flex flex-col items-center justify-center gap-3 h-64 rounded-xl border-2 border-dashed cursor-pointer transition ${
                dragOver ? 'border-blue-400 bg-blue-500/10' : 'border-gray-700 hover:border-gray-500'
              }`}
            >
              <span className="text-4xl">📥</span>
              <span className="font-medium">Trascina qui un video o clicca per selezionarlo</span>
              <span className="text-sm text-gray-400">MP4, MOV, WebM, ecc.</span>
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFile(file);
                }}
              />
            </label>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  playsInline
                  preload="auto"
                  onLoadedMetadata={onVideoLoaded}
                  className="w-full max-h-[55vh] mx-auto"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                <span className="truncate max-w-[40%]" title={fileName}>
                  📄 {fileName}
                </span>
                <span>⏱ {formatTime(duration)}</span>
                <span>
                  🖼 {dims.w}×{dims.h}px
                </span>
                <button
                  onClick={captureCurrent}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  📸 Cattura fotogramma corrente
                </button>
                <label className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 cursor-pointer">
                  Cambia video
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) loadFile(file);
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Galleria frame */}
          {frames.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="font-semibold">
                  Fotogrammi estratti <span className="text-gray-400">({frames.length})</span>
                </h2>
                <button
                  onClick={downloadAll}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium"
                >
                  ⬇️ Scarica tutto (.zip)
                </button>
                <button
                  onClick={clearFrames}
                  className="px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600"
                >
                  Svuota
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {frames.map((f) => (
                  <div key={f.id} className="group relative rounded-lg overflow-hidden bg-gray-800">
                    <img src={f.url} alt={f.name} className="w-full aspect-video object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1 text-xs flex items-center justify-between">
                      <span>{formatTime(f.time)}</span>
                      <button
                        onClick={() => triggerDownload(f.blob, f.name)}
                        className="hover:text-blue-300"
                        title="Scarica questo frame"
                      >
                        ⬇️
                      </button>
                    </div>
                    <button
                      onClick={() => removeFrame(f.id)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                      title="Rimuovi"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Colonna destra: impostazioni */}
        <aside className="space-y-5 lg:sticky lg:top-6 self-start bg-gray-800/40 rounded-xl border border-gray-800 p-5 h-fit">
          <h2 className="font-semibold">Impostazioni estrazione</h2>

          <div className="space-y-2">
            <span className="text-sm text-gray-400">Modalità</span>
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => setMode('interval')}
                className={`flex-1 px-3 py-2 text-sm ${
                  mode === 'interval' ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                Ogni N secondi
              </button>
              <button
                onClick={() => setMode('count')}
                className={`flex-1 px-3 py-2 text-sm ${
                  mode === 'count' ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                N frame totali
              </button>
            </div>
          </div>

          {mode === 'interval' ? (
            <label className="block space-y-1">
              <span className="text-sm text-gray-400">Intervallo (secondi)</span>
              <input
                type="number"
                min={0.01}
                step={0.1}
                value={intervalSec}
                onChange={(e) => setIntervalSec(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2"
              />
            </label>
          ) : (
            <label className="block space-y-1">
              <span className="text-sm text-gray-400">Numero di frame</span>
              <input
                type="number"
                min={1}
                step={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2"
              />
            </label>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm text-gray-400">Inizio (s)</span>
              <input
                type="number"
                min={0}
                max={duration}
                step={0.1}
                value={Number(startTime.toFixed(2))}
                onChange={(e) => setStartTime(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-gray-400">Fine (s)</span>
              <input
                type="number"
                min={0}
                max={duration}
                step={0.1}
                value={Number(endTime.toFixed(2))}
                onChange={(e) => setEndTime(Number(e.target.value))}
                className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm text-gray-400">Formato</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as ImageFormat)}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2"
            >
              <option value="image/png">PNG (senza perdita)</option>
              <option value="image/jpeg">JPEG (più leggero)</option>
            </select>
          </label>

          {format === 'image/jpeg' && (
            <label className="block space-y-1">
              <span className="text-sm text-gray-400">Qualità JPEG: {Math.round(quality * 100)}%</span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.01}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full"
              />
            </label>
          )}

          <label className="block space-y-1">
            <span className="text-sm text-gray-400">Larghezza max (px, 0 = originale)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={maxWidth}
              onChange={(e) => setMaxWidth(Number(e.target.value))}
              className="w-full rounded-lg bg-gray-800 border border-gray-700 px-3 py-2"
            />
          </label>

          {videoUrl && (
            <p className="text-xs text-gray-500">
              Verranno estratti circa <span className="text-gray-300">{estimatedCount}</span> fotogrammi.
            </p>
          )}

          <button
            onClick={extract}
            disabled={!videoUrl || extracting}
            className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
          >
            {extracting ? `Estrazione… ${progress.done}/${progress.total}` : '🎬 Estrai fotogrammi'}
          </button>

          {extracting && (
            <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </aside>
      </main>

      {/* Canvas nascosto usato per disegnare i fotogrammi */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
