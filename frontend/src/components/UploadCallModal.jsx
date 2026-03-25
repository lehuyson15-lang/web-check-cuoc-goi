import React, { useState, useRef } from 'react';
import axios from 'axios';
import { X, Upload, Mic, Phone, Calendar, FileText, CheckCircle, Loader2 } from 'lucide-react';

const UploadCallModal = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    customerPhone: '',
    direction: 'OUTBOUND',
    serviceType: '',
    result: 'PENDING',
    calledAt: new Date().toISOString().slice(0, 16),
    notes: '',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Vui lòng chọn file ghi âm');
      return;
    }
    if (!form.customerPhone) {
      setError('Vui lòng nhập số điện thoại khách hàng');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('audio', file);
      formData.append('customerPhone', form.customerPhone);
      formData.append('direction', form.direction);
      formData.append('serviceType', form.serviceType);
      formData.append('result', form.result);
      formData.append('calledAt', form.calledAt);
      formData.append('notes', form.notes);

      await axios.post('/api/calls/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSuccess(false);
        setForm({
          customerPhone: '',
          direction: 'OUTBOUND',
          serviceType: '',
          result: 'PENDING',
          calledAt: new Date().toISOString().slice(0, 16),
          notes: '',
        });
        setFile(null);
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload thất bại. Vui lòng thử lại.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Upload size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Tải lên cuộc gọi</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-12 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center animate-bounce">
              <CheckCircle size={32} />
            </div>
            <p className="text-lg font-bold text-slate-900">Upload thành công!</p>
            <p className="text-sm text-slate-500">Hệ thống đang xử lý chuyển đổi giọng nói...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Mic size={14} className="inline mr-1" />
                File ghi âm *
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  file ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                }`}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                      <Mic size={20} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm text-slate-600">Click để chọn file ghi âm</p>
                    <p className="text-xs text-slate-400 mt-1">MP3, WAV, M4A, OGG (tối đa 25MB)</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Phone size={14} className="inline mr-1" />
                Số điện thoại khách hàng *
              </label>
              <input
                type="text"
                name="customerPhone"
                value={form.customerPhone}
                onChange={handleChange}
                placeholder="0901234567"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Direction & Result Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Chiều cuộc gọi</label>
                <select
                  name="direction"
                  value={form.direction}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="OUTBOUND">Gọi đi</option>
                  <option value="INBOUND">Gọi đến</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Kết quả</label>
                <select
                  name="result"
                  value={form.result}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="PENDING">Đang xử lý</option>
                  <option value="CLOSED">Chốt đơn</option>
                  <option value="CALLBACK">Hẹn gọi lại</option>
                  <option value="NO_ANSWER">Không nghe máy</option>
                </select>
              </div>
            </div>

            {/* Service Type & Called At Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Dịch vụ</label>
                <input
                  type="text"
                  name="serviceType"
                  value={form.serviceType}
                  onChange={handleChange}
                  placeholder="VD: Tư vấn, Hỗ trợ..."
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Calendar size={14} className="inline mr-1" />
                  Thời điểm gọi
                </label>
                <input
                  type="datetime-local"
                  name="calledAt"
                  value={form.calledAt}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <FileText size={14} className="inline mr-1" />
                Ghi chú
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Nhập ghi chú về cuộc gọi..."
                rows={3}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-medium border border-rose-100">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={uploading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang tải lên & xử lý STT...
                </>
              ) : (
                <>
                  <Upload size={18} />
                  Tải lên & Chuyển đổi giọng nói
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default UploadCallModal;
