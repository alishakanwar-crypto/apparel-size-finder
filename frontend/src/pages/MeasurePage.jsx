import { useState } from 'react';
import { Ruler, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../utils/api';

const fields = [
  { key: 'chest', label: 'Chest (inches)', placeholder: 'e.g. 39', help: 'Measure around the fullest part of the chest' },
  { key: 'shoulder', label: 'Shoulder (inches)', placeholder: 'e.g. 17', help: 'Measure across the back from shoulder seam to shoulder seam' },
  { key: 'sleeve_length', label: 'Sleeve Length (inches)', placeholder: 'e.g. 25', help: 'Measure from shoulder seam to wrist' },
  { key: 'body_length', label: 'Body Length (inches)', placeholder: 'e.g. 28', help: 'Measure from shoulder to bottom hem' },
  { key: 'waist', label: 'Waist (inches)', placeholder: 'e.g. 33', help: 'Measure around the natural waistline' },
];

function ScoreBar({ score, label, size }) {
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

export default function MeasurePage() {
  const [form, setForm] = useState({ name: '', phone: '', chest: '', shoulder: '', sleeve_length: '', body_length: '', waist: '' });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone || null,
        chest: parseFloat(form.chest),
        shoulder: parseFloat(form.shoulder),
        sleeve_length: parseFloat(form.sleeve_length),
        body_length: parseFloat(form.body_length),
        waist: parseFloat(form.waist),
      };
      if (Object.values(payload).some((v) => v !== null && isNaN(v))) {
        throw new Error('Please enter valid numbers for all measurements.');
      }
      const data = await api.recommend(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm({ name: '', phone: '', chest: '', shoulder: '', sleeve_length: '', body_length: '', waist: '' });
    setResult(null);
    setError('');
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Ruler className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Find Your Perfect Fit</h1>
        <p className="text-gray-500 mt-2">Enter the customer&apos;s body measurements and we&apos;ll recommend the best shirt size.</p>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Body Measurements</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(({ key, label, placeholder, help }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={form[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                    placeholder={placeholder}
                  />
                  <p className="text-xs text-gray-400 mt-1">{help}</p>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg px-4 py-2 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-xl transition disabled:opacity-60"
          >
            {loading ? 'Analyzing...' : 'Find Best Size'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-1">Recommended Size for {form.name}</p>
            <div className="text-6xl font-black text-primary my-3">{result.recommended_size}</div>
            <span
              className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
                result.fit_score >= 85
                  ? 'bg-green-100 text-green-700'
                  : result.fit_score >= 70
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-orange-100 text-orange-700'
              }`}
            >
              {result.fit_label} — {result.fit_score}%
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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
                  <ScoreBar key={s.size} size={s.size} score={s.score} label={s.label} />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleReset}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition"
          >
            Measure Another Customer
          </button>
        </div>
      )}
    </div>
  );
}
