import { useState, useEffect } from 'react';
import { Users, Trash2, RefreshCw } from 'lucide-react';
import { api } from '../utils/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      setCustomers(await api.getCustomers());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer record?')) return;
    await api.deleteCustomer(id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Records</h1>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No customers measured yet.</p>
          <p className="text-gray-400 text-sm mt-1">Go to the Measure page to add the first customer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-left uppercase text-xs tracking-wider">
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Measurements</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Fit</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{c.name}</div>
                      {c.phone && <div className="text-gray-400 text-xs">{c.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      C:{c.chest}&quot; S:{c.shoulder}&quot; SL:{c.sleeve_length}&quot; BL:{c.body_length}&quot; W:{c.waist}&quot;
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-md text-sm">
                        {c.recommended_size}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold ${
                          c.fit_score >= 85 ? 'text-green-600' : c.fit_score >= 70 ? 'text-yellow-600' : 'text-orange-600'
                        }`}
                      >
                        {c.fit_score}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(c.id)} className="text-gray-300 hover:text-red-500 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
