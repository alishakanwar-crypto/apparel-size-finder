import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Scan, AlertCircle, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { api } from '../utils/api';

function ScoreBar({ score, size }) {
  const color = score >= 85 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : score >= 50 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="w-12 text-sm font-bold text-gray-700">{size}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-20 text-right text-sm text-gray-500">{score}%</span>
    </div>
  );
}

export default function AIMeasurePage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [captured, setCaptured] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [calibrated, setCalibrated] = useState(null);
  const [form, setForm] = useState({ name: 'Walk-in Customer', phone: '' });

  useEffect(() => {
    api.getCalibration().then(setCalibrated).catch(() => setCalibrated(null));
  }, []);

  const startCamera = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreaming(true);
      }
    } catch {
      setError('Camera access denied. Please allow camera permissions.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setStreaming(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capture = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCaptured(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => setCaptured(ev.target.result);
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!captured) return;
    setError('');
    setLoading(true);
    try {
      const data = await api.aiMeasure({
        image_data: captured,
        customer_name: form.name || 'Walk-in Customer',
        customer_phone: form.phone || null,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setCaptured(null);
    setResult(null);
    setError('');
    setShowAll(false);
  };

  if (!calibrated) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <Scan className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700 mb-2">Calibration Required</h2>
        <p className="text-gray-500 mb-4">
          Please calibrate the system with a reference dummy before using AI measurements.
        </p>
        <a href="/calibration" className="inline-block px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition no-underline">
          Go to Calibration
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 mb-4">
          <Scan className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">AI Size Detection</h1>
        <p className="text-gray-500 mt-2">
          Capture or upload a customer photo to automatically estimate body measurements and recommend a shirt size.
        </p>
      </div>

      {!result ? (
        <div className="space-y-4">
          {/* Customer info */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Camera / upload area */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            {captured ? (
              <div className="text-center space-y-4">
                <img src={captured} alt="Captured" className="max-h-96 mx-auto rounded-xl border border-gray-100" />
                <div className="flex gap-3 justify-center">
                  <button onClick={reset} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-medium hover:bg-gray-200 transition">
                    <RotateCcw className="w-4 h-4 inline -mt-0.5 mr-1" /> Retake
                  </button>
                  <button
                    onClick={analyze}
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-60"
                  >
                    {loading ? 'Analyzing...' : 'Detect Size'}
                  </button>
                </div>
              </div>
            ) : streaming ? (
              <div className="text-center space-y-4">
                <video ref={videoRef} autoPlay playsInline className="max-h-96 mx-auto rounded-xl border border-gray-100" />
                <button
                  onClick={capture}
                  className="px-8 py-3 bg-red-500 text-white rounded-full font-semibold hover:bg-red-600 transition shadow-lg"
                >
                  <Camera className="w-5 h-5 inline -mt-0.5 mr-1" /> Capture
                </button>
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <p className="text-gray-500 text-sm mb-4">Choose how to provide the customer image:</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition"
                  >
                    <Camera className="w-5 h-5 inline -mt-0.5 mr-1" /> Use Camera
                  </button>
                  <label className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition cursor-pointer">
                    <Scan className="w-5 h-5 inline -mt-0.5 mr-1" /> Upload Photo
                    <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Ensure the customer is standing straight, facing forward, with full body visible.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Annotated image */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
            <img src={result.annotated_image} alt="Pose detection" className="max-h-72 mx-auto rounded-xl" />
            <p className="text-xs text-gray-400 mt-2">Detected body landmarks</p>
          </div>

          {/* Estimated measurements */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Estimated Measurements</h3>
            <div className="grid grid-cols-5 gap-3 text-center">
              {[
                ['Chest', result.estimated_measurements.chest],
                ['Shoulder', result.estimated_measurements.shoulder],
                ['Sleeve', result.estimated_measurements.sleeve_length],
                ['Body', result.estimated_measurements.body_length],
                ['Waist', result.estimated_measurements.waist],
              ].map(([label, val]) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="text-lg font-bold text-gray-800">{val}&quot;</p>
                </div>
              ))}
            </div>
          </div>

          {/* Best fit + comfort fit */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <p className="text-gray-500 text-sm mb-1">Recommended for {form.name}</p>
            <div className="flex items-center justify-center gap-6 my-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Best Fit</p>
                <div className="text-5xl font-black text-indigo-600">{result.best_fit.size}</div>
                <span className={`inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold ${
                  result.best_fit.score >= 85 ? 'bg-green-100 text-green-700'
                  : result.best_fit.score >= 70 ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-orange-100 text-orange-700'
                }`}>
                  {result.best_fit.score}% match
                </span>
              </div>
              {result.comfort_fit && (
                <div className="border-l border-gray-200 pl-6">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Comfort Fit</p>
                  <div className="text-4xl font-bold text-gray-400">{result.comfort_fit.size}</div>
                  <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
                    {result.comfort_fit.score}% match
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-gray-500">{result.confidence_note}</p>
          </div>

          {/* All scores */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <button
              onClick={() => setShowAll(!showAll)}
              className="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
            >
              <span>All Size Scores</span>
              {showAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAll && (
              <div className="mt-3 space-y-1">
                {result.all_scores.map((s) => (
                  <ScoreBar key={s.size} size={s.size} score={s.score} />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={reset}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
          >
            <RotateCcw className="w-4 h-4 inline -mt-0.5 mr-1" /> Measure Another Customer
          </button>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
