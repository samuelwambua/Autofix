import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FileText, Upload, CheckCircle, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import supplierAxios from '../../api/supplierAxios';
import useSupplierStore from '../../store/supplierStore';

const DOCUMENT_TYPES = [
  { value: 'business_license', label: '📋 Business License' },
  { value: 'kra_pin',          label: '🏛️ KRA PIN Certificate' },
  { value: 'national_id',      label: '🪪 National ID' },
  { value: 'other',            label: '📎 Other Document' },
];

const inputClass = 'w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all';

const SupplierDocuments = () => {
  const navigate = useNavigate();
  const { supplier } = useSupplierStore();
  const [docs, setDocs] = useState([
    { document_type: 'business_license', file_name: '', file_url: '', notes: '' },
    { document_type: 'kra_pin',          file_name: '', file_url: '', notes: '' },
    { document_type: 'national_id',      file_name: '', file_url: '', notes: '' },
  ]);

  const uploadMutation = useMutation({
    mutationFn: (data) => supplierAxios.post('/supplier/auth/documents', data).then(r => r.data),
    onSuccess: () => {
      toast.success('Documents submitted for review!');
      navigate('/supplier/status');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Upload failed.'),
  });

  const updateDoc   = (i, field, value) => {
    const updated = [...docs];
    updated[i]    = { ...updated[i], [field]: value };
    setDocs(updated);
  };
  const addDoc    = () => setDocs([...docs, { document_type: 'other', file_name: '', file_url: '', notes: '' }]);
  const removeDoc = (i) => setDocs(docs.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    const invalid = docs.some(d => !d.file_name.trim());
    if (invalid) return toast.error('Please provide a name for all documents.');
    uploadMutation.mutate({ documents: docs });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-orange-950 to-amber-900
      flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500
            flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/30">
            <FileText size={28} className="text-white" />
          </div>
          <h1 className="text-white font-black text-2xl">Upload Documents</h1>
          <p className="text-white/50 text-sm mt-1">Step 2 of 3 — Required for verification</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {['Business Info', 'Documents', 'Pending Review'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                ${i === 1
                  ? 'bg-orange-500/30 text-orange-300 border border-orange-500/40'
                  : i === 0
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-white/5 text-white/30 border border-white/10'
                }`}>
                {i === 0 && <CheckCircle size={11} />}{s}
              </div>
              {i < 2 && <div className="w-4 h-px bg-white/20" />}
            </div>
          ))}
        </div>

        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-2xl">
          <p className="text-white/60 text-sm mb-5">
            Provide the names of your documents. You can optionally add a link (Google Drive, Dropbox)
            where the reviewer can access them.
          </p>

          <div className="space-y-4">
            {docs.map((doc, i) => (
              <div key={i} className="bg-white/5 rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between mb-3">
                  <select value={doc.document_type}
                    onChange={(e) => updateDoc(i, 'document_type', e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-xl px-3 py-2
                      text-white text-sm focus:outline-none flex-1 mr-2">
                    {DOCUMENT_TYPES.map(t => (
                      <option key={t.value} value={t.value} className="bg-slate-800">{t.label}</option>
                    ))}
                  </select>
                  {i >= 3 && (
                    <button onClick={() => removeDoc(i)}
                      className="p-2 text-red-400/50 hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  <input placeholder="Document name / file name *"
                    value={doc.file_name}
                    onChange={(e) => updateDoc(i, 'file_name', e.target.value)}
                    className={inputClass} />
                  <input placeholder="File URL (Google Drive, Dropbox, etc.) — optional"
                    value={doc.file_url}
                    onChange={(e) => updateDoc(i, 'file_url', e.target.value)}
                    className={inputClass} />
                  <input placeholder="Notes (optional)"
                    value={doc.notes}
                    onChange={(e) => updateDoc(i, 'notes', e.target.value)}
                    className={inputClass} />
                </div>
              </div>
            ))}
          </div>

          <button onClick={addDoc}
            className="flex items-center gap-2 text-orange-400 hover:text-orange-300
              text-sm font-medium transition-colors mt-3">
            <Plus size={15} /> Add Another Document
          </button>

          <button onClick={handleSubmit} disabled={uploadMutation.isPending}
            className="w-full flex items-center justify-center gap-2 mt-6
              bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold
              rounded-xl py-3 shadow-lg shadow-orange-500/30 transition-all disabled:opacity-50">
            {uploadMutation.isPending
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Submitting...</>
              : <><Upload size={16} /> Submit for Review</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default SupplierDocuments;