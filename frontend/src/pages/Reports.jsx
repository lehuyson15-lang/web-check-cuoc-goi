import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { BarChart3, Download, Users, TrendingUp, Award, Clock, AlertTriangle } from 'lucide-react';

const Reports = () => {
  const [kpiData, setKpiData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchKPI = async () => {
      try {
        const res = await axios.get('/api/reports/kpi');
        setKpiData(res.data);
      } catch (err) {
        console.error('Failed to fetch KPI', err);
        setError('Không thể tải dữ liệu báo cáo. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };
    fetchKPI();
  }, []);

  // Compute summary statistics from kpiData
  const summary = useMemo(() => {
    if (!kpiData || kpiData.length === 0) {
      return { topPerformer: null, teamAvgConversion: 0, teamAvgDuration: 0 };
    }

    // Top performer = highest conversion rate (with at least 1 call)
    const withCalls = kpiData.filter(u => u.totalCalls > 0);
    const topPerformer = withCalls.length > 0
      ? withCalls.reduce((best, u) => u.conversionRate > best.conversionRate ? u : best, withCalls[0])
      : null;

    // Team average conversion rate (only users with calls)
    const teamAvgConversion = withCalls.length > 0
      ? withCalls.reduce((sum, u) => sum + u.conversionRate, 0) / withCalls.length
      : 0;

    // Team average call duration in seconds
    const teamAvgDuration = withCalls.length > 0
      ? withCalls.reduce((sum, u) => sum + u.avgDuration, 0) / withCalls.length
      : 0;

    return { topPerformer, teamAvgConversion, teamAvgDuration };
  }, [kpiData]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-500">
        <AlertTriangle size={48} className="text-amber-500 mb-4" />
        <p className="text-lg font-bold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          Tải lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Báo cáo & KPI Nhân viên</h2>
          <p className="text-slate-500">Thống kê hiệu suất làm việc chi tiết theo từng cá nhân</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Download size={18} />
            BC Excel
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-sm">
            <BarChart3 size={18} />
            Xuất PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Top Performer Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
          <div className="flex items-center gap-3 mb-4 opacity-80">
            <Award size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Top Performer</span>
          </div>
          {loading ? (
            <div className="animate-pulse"><div className="h-8 bg-blue-400/30 rounded w-3/4 mb-2"></div><div className="h-4 bg-blue-400/30 rounded w-1/2"></div></div>
          ) : summary.topPerformer ? (
            <>
              <p className="text-2xl font-bold">{summary.topPerformer.name}</p>
              <p className="text-sm opacity-80 mt-1">{summary.topPerformer.conversionRate.toFixed(1)}% Conversion Rate</p>
            </>
          ) : (
            <p className="text-sm opacity-80">Chưa có dữ liệu</p>
          )}
        </div>

        {/* Team Average Card */}
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <Users size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Team Average</span>
          </div>
          {loading ? (
            <div className="animate-pulse"><div className="h-8 bg-slate-100 rounded w-1/2 mb-2"></div><div className="h-4 bg-slate-100 rounded w-1/3"></div></div>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-900">{summary.teamAvgConversion.toFixed(1)}%</p>
              <p className="text-sm text-slate-500 font-bold mt-1">Tỉ lệ chốt trung bình</p>
            </>
          )}
        </div>

        {/* Avg Duration Card */}
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4 text-slate-500">
            <Clock size={20} />
            <span className="text-sm font-bold uppercase tracking-wider">Thời lượng TB</span>
          </div>
          {loading ? (
            <div className="animate-pulse"><div className="h-8 bg-slate-100 rounded w-1/2 mb-2"></div><div className="h-4 bg-slate-100 rounded w-1/3"></div></div>
          ) : (
            <>
              <p className="text-2xl font-bold text-slate-900">{formatDuration(summary.teamAvgDuration)}</p>
              <p className="text-sm text-slate-500 font-bold mt-1">Phút:Giây trung bình/cuộc gọi</p>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nhân viên</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Tổng cuộc gọi</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Số chốt</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Tỉ lệ chốt</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Trung bình TL</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Missed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-4"><div className="h-10 bg-slate-50 rounded"></div></td>
                </tr>
              ))
            ) : kpiData.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">
                      {item.name.charAt(0)}
                    </div>
                    <span className="text-sm font-bold text-slate-800">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 text-center font-medium">{item.totalCalls}</td>
                <td className="px-6 py-4 text-sm text-emerald-600 text-center font-bold">{item.closedCalls}</td>
                <td className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${item.conversionRate}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{item.conversionRate.toFixed(1)}%</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-600 text-center font-mono">
                  {Math.floor(item.avgDuration / 60)}:{(item.avgDuration % 60).toString().padStart(2, '0')}
                </td>
                <td className="px-6 py-4 text-sm text-rose-500 text-center font-bold">{item.missedCalls}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Reports;

