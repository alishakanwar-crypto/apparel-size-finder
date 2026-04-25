import { useState, useEffect, useRef } from 'react';
import { Target, Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '../utils/api';

export default function CalibrationPage() {
  const [calibration, setCalibration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    name: 'Shop Entrance Dummy',
    chest_real: '40',
    shoulder_real: '18',
    torso_real: '18',
    image_data: '',
  });
  const fileRef = useRef(null);

  const loadCalibration = async () => {
    setLoading(true);
    try {
      const data = await api.getCalibration();
      setCalibration(data);
    } catch {
      /* no calibration yet */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCalibration(); }, []);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target.result);
      setForm((prev) => ({ ...prev, image_data: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        chest_real: parseFloat(form.chest_real),
        shoulder_real: parseFloat(form.shoulder_real),
        torso_real: parseFloat(form.torso_real),
        image_data: form.image_data,
      };
      if (!payload.image_data) throw new Error('Please upload a dummy image.');
      await api.createCalibration(payload);
      setSuccess('Calibration successful! The system is ready for AI measurements.');
      setPreview(null);
      setForm({ ...form, image_data: '' });
      await loadCalibration();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!calibration || !confirm('Delete this calibration?')) return;
    try {
      await api.deleteCalibration(calibration.id);
      setCalibration(null);
    } catch {
      await loadCalibration();
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 mb-4">
          <Target className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Dummy Calibration</h1>
        <p className="text-gray-500 mt-2">
          Upload a photo of your reference mannequin with known measurements to calibrate the AI system.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : calibration ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <div>
                <h2 className="font-semibold text-gray-900">Active Calibration: {calibration.name}</h2>
                <p className="text-sm text-gray-400">System is calibrated and ready for AI measurements</p>
              </div>
            </div>
            <button onClick={handleDelete} className="text-gray-300 hover:text-red-500 transition p-2">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 rounded-xl p-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Shoulder</p>
              <p className="text-lg font-bold text-gray-800">{calibration.shoulder_real}&quot;</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Chest</p>
              <p className="text-lg font-bold text-gray-800">{calibration.chest_real}&quot;</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Torso</p>
              <p className="text-lg font-bold text-gray-800">{calibration.torso_real}&quot;</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Scale</p>
              <p className="text-lg font-bold text-primary">{calibration.pixels_per_inch?.toFixed(1)} px/in</p>
            </div>
          </div>

          <p className="text-sm text-gray-400 text-center">
            To recalibrate, delete this calibration and upload a new reference image.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calibration Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
            />
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
              Known Dummy Measurements (inches)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                ['chest_real', 'Chest Circumference'],
                ['shoulder_real', 'Shoulder Width'],
                ['torso_real', 'Torso Length (shoulder to hip)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">
              Reference Dummy Photo
            </h3>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition"
            >
              {preview ? (
                <img src={preview} alt="Dummy preview" className="max-h-64 mx-auto rounded-lg" />
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">Click to upload dummy photo</p>
                  <p className="text-xs text-gray-400 mt-1">Full body, standing straight, facing forward</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg px-4 py-2 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" /> {success}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !form.image_data}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
          >
            {saving ? 'Calibrating...' : 'Calibrate System'}
          </button>
        </form>
      )}
    </div>
  );
}
