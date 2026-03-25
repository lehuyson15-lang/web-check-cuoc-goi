import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Plus, Phone, Clock, Tag, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import UploadCallModal from '../components/UploadCallModal';

const Calls = () => {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const navigate = useNavigate();

  const fetchCalls = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/calls?page=${page}&search=${search}`);
      setCalls(res.data.calls);
      setTotalPages(res.data.pages);
    } catch (err) {
      console.error('Failed to fetch calls', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [page, search]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'DONE': return 'bg-emerald-100 text-emerald-700';
      case 'PROCESSING': return 'bg-blue-100 text-blue-700';
      case 'FAILED': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getResultBadge = (result) => {
    switch (result) {
      case 'CLOSED': return <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Chốt đơn</span>;
      case 'CALLBACK': return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Hẹ gọi lại</span>;
      case 'NO_ANSWER': return <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">Không nghe máy</span>;
      default: return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Đang xử lý</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search customer phone, contents..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors">
            <Filter size={18} />
            <span>Filter</span>
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={18} />
            <span>Tải lên cuộc gọi</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Employee</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Result</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">STT Status</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ghi chú</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={8} className="px-6 py-4"><div className="h-10 bg-slate-50 rounded"></div></td>
                </tr>
              ))
            ) : calls.length > 0 ? (
              calls.map((call) => (
                <tr key={call.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => navigate(`/calls/${call.id}`)}>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{call.user?.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-900 font-medium">{call.customerPhone}</span>
                      <span className="text-xs text-slate-500">{call.serviceType}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{new Date(call.calledAt).toLocaleString('vi-VN')}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {Math.floor(call.durationSeconds / 60)}:{(call.durationSeconds % 60).toString().padStart(2, '0')}
                  </td>
                  <td className="px-6 py-4">{getResultBadge(call.result)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${getStatusColor(call.transcriptStatus)}`}>
                      {call.transcriptStatus}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500 max-w-[150px] truncate" title={call.notes}>
                      {call.notes || <span className="text-slate-300 italic">Trống</span>}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                      <ExternalLink size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">No calls found match your search criteria.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing page {page} of {totalPages}</p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-slate-200 rounded-lg hover:bg-white disabled:opacity-50 transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      <UploadCallModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={() => fetchCalls()}
      />
    </div>
  );
};

export default Calls;
