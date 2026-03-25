import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronLeft, Info, Calendar, Phone, Clock, FileText, Tag as TagIcon, MoreVertical, MessageSquare } from 'lucide-react';
import AudioPlayer from '../components/AudioPlayer';
import TranscriptViewer from '../components/TranscriptViewer';

const CallDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCall = async () => {
      try {
        const res = await axios.get(`/api/calls/${id}`);
        setCall(res.data);
        setNotes(res.data.notes || '');
      } catch (err) {
        console.error('Failed to fetch call', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCall();
  }, [id]);

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/calls/${id}`, { notes });
      alert('Đã lưu ghi chú thành công!');
    } catch (err) {
      console.error('Failed to save notes', err);
      alert('Lỗi khi lưu ghi chú: ' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading call details...</div>;
  if (!call) return <div>Call not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/calls')}
        className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors bg-white px-4 py-2 rounded-lg border border-slate-100 shadow-sm"
      >
        <ChevronLeft size={20} />
        <span className="font-medium">Quay lại danh sách</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Player & Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">
                  {call.customerPhone.slice(-2)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{call.customerPhone}</h2>
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Calendar size={14} /> {new Date(call.calledAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                  call.transcriptStatus === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {call.transcriptStatus === 'DONE' ? 'Đã có Transcript' : 'Đang xử lý'}
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
                  {call.source}
                </span>
              </div>
            </div>

            <AudioPlayer 
              src={`/${call.audioUrl}`} 
              onTimeUpdate={(t) => setCurrentTime(t)} 
            />

            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2 text-slate-800 font-bold">
                <FileText size={20} className="text-blue-600" />
                <h3>Nội dung cuộc gọi</h3>
              </div>
              <TranscriptViewer 
                segments={call.segments} 
                currentTime={currentTime}
                onSeek={(t) => { /* Audio player seek logic */ }}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Metadata & Notes */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Info size={18} className="text-blue-600" />
              Thông tin chi tiết
            </h3>
            <div className="space-y-6">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Nhân viên tư vấn</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xs text-slate-600">
                    {call.user?.name ? call.user.name.charAt(0) : '?'}
                  </div>
                  <span className="text-sm font-medium text-slate-900">{call.user?.name}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Thời lượng</p>
                  <p className="text-sm font-semibold text-slate-700">
                    {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Dịch vụ</p>
                  <p className="text-sm font-semibold text-slate-700">{call.serviceType || 'Chưa cập nhật'}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Phân loại kết quả</p>
                <div className="flex gap-2 flex-wrap">
                  {call.result === 'CLOSED' ? (
                    <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200">Chốt thành công</span>
                  ) : call.result === 'CALLBACK' ? (
                    <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold border border-amber-200">Hẹn gọi lại</span>
                  ) : (
                    <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">Chưa xử lý</span>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">Tags tự động</p>
                <div className="flex gap-2 flex-wrap">
                  {call.tags.length > 0 ? call.tags.map(tag => (
                    <span key={tag.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                      <TagIcon size={12} />
                      {tag.tagValue}
                    </span>
                  )) : (
                    <span className="text-xs text-slate-400 italic">Chưa có tag nào</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-600" />
              Ghi chú
            </h3>
            <textarea
              className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              placeholder="Nhập ghi chú quan trọng về khách hàng..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <button 
              onClick={handleSaveNotes}
              disabled={saving}
              className="w-full mt-4 bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallDetail;
