import { useState, useEffect } from 'react';
import { Settings, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { api } from '../utils/api';

const emptySize = { name: '', chest_min: '', chest_max: '', shoulder: '', sleeve_length: '', body_length: '', waist_min: '', waist_max: '' };

function SizeForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || emptySize);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {};
    for (const [k, v] of Object.entries(form)) {
      payload[k] = k === 'name' ? v : parseFloat(v);
    }
    onSave(payload);
  };

  const numFields = [
    ['chest_min', 'Chest Min'], ['chest_max', 'Chest Max'],
    ['shoulder', 'Shoulder'], ['sleeve_length', 'Sleeve Length'],
    ['body_length', 'Body Length'],
    ['waist_min', 'Waist Min'], ['waist_max', 'Waist Max'],
  ];

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Size Name</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            placeholder="e.g. M"
          />
        </div>
        {numFields.map(([key, label]) => (
          <div key={key}>
            <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
            <input
              type="number"
              step="0.5"
              required
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-200 rounded-lg transition">
          <X className="w-4 h-4 inline -mt-0.5" /> Cancel
        </button>
        <button type="submit" disabled={saving} className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark transition disabled:opacity-60">
          <Check className="w-4 h-4 inline -mt-0.5" /> Save
        </button>
      </div>
    </form>
  );
}

export default function SizeChartPage() {
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setSizes(await api.getSizes());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data) => {
    setSaving(true);
    setError('');
    try {
      await api.createSize(data);
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (data) => {
    setSaving(true);
    setError('');
    try {
      await api.updateSize(editingId, data);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this size?')) return;
    try {
      await api.deleteSize(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Size Chart</h1>
            <p className="text-sm text-gray-400">Manage shirt sizes and their measurements (in inches)</p>
          </div>
        </div>
        {!showAdd && (
          <button
            onClick={() => { setShowAdd(true); setEditingId(null); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark transition"
          >
            <Plus className="w-4 h-4" /> Add Size
          </button>
        )}
      </div>

      {error && <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">{error}</div>}

      {showAdd && (
        <div className="mb-4">
          <SizeForm onSave={handleAdd} onCancel={() => setShowAdd(false)} saving={saving} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : sizes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sizes configured yet.</p>
          <p className="text-gray-400 text-sm mt-1">Click &quot;Add Size&quot; to create your first entry.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wider">
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Chest</th>
                  <th className="px-4 py-3">Shoulder</th>
                  <th className="px-4 py-3">Sleeve</th>
                  <th className="px-4 py-3">Body</th>
                  <th className="px-4 py-3">Waist</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sizes.map((s) =>
                  editingId === s.id ? (
                    <tr key={s.id}>
                      <td colSpan={7} className="p-2">
                        <SizeForm initial={s} onSave={handleUpdate} onCancel={() => setEditingId(null)} saving={saving} />
                      </td>
                    </tr>
                  ) : (
                    <tr key={s.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 font-bold text-primary">{s.name}</td>
                      <td className="px-4 py-3 text-gray-600">{s.chest_min}&quot; – {s.chest_max}&quot;</td>
                      <td className="px-4 py-3 text-gray-600">{s.shoulder}&quot;</td>
                      <td className="px-4 py-3 text-gray-600">{s.sleeve_length}&quot;</td>
                      <td className="px-4 py-3 text-gray-600">{s.body_length}&quot;</td>
                      <td className="px-4 py-3 text-gray-600">{s.waist_min}&quot; – {s.waist_max}&quot;</td>
                      <td className="px-4 py-3 flex gap-1">
                        <button onClick={() => { setEditingId(s.id); setShowAdd(false); }} className="text-gray-300 hover:text-primary transition p-1">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="text-gray-300 hover:text-red-500 transition p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
