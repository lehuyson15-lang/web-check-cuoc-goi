import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Phone, Clock, Target, PhoneMissed, TrendingUp } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
    <div className="flex items-center justify-between mb-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="text-white" size={24} />
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    <p className="text-xs text-slate-400 mt-2">{subtext}</p>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalCalls: 0,
    missedCalls: 0,
    closedCalls: 0,
    avgDuration: 0,
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('/api/reports/stats');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const chartData = [
    { name: 'Mon', calls: 12, closed: 8 },
    { name: 'Tue', calls: 19, closed: 12 },
    { name: 'Wed', calls: 15, closed: 10 },
    { name: 'Thu', calls: 22, closed: 15 },
    { name: 'Fri', calls: 30, closed: 22 },
    { name: 'Sat', calls: 25, closed: 18 },
    { name: 'Sun', calls: 10, closed: 5 },
  ];

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Calls" 
          value={stats.totalCalls} 
          subtext="+12% from last week" 
          icon={Phone} 
          color="bg-blue-600" 
        />
        <StatCard 
          title="Success Rate" 
          value={`${stats.conversionRate.toFixed(1)}%`} 
          subtext="Target: 80%" 
          icon={Target} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Avg. Duration" 
          value={`${Math.floor(stats.avgDuration / 60)}m ${stats.avgDuration % 60}s`} 
          subtext="Standard: 5-10m" 
          icon={Clock} 
          color="bg-amber-500" 
        />
        <StatCard 
          title="Missed Calls" 
          value={stats.missedCalls} 
          subtext="Critical: Response needed" 
          icon={PhoneMissed} 
          color="bg-rose-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold text-slate-800">Call Distribution</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-3 h-3 bg-blue-600 rounded-full"></span> Total Calls
              <span className="w-3 h-3 bg-emerald-500 rounded-full ml-2"></span> Success
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="calls" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="closed" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-8">Success Trend</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="closed" stroke="#2563eb" strokeWidth={3} dot={{r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff'}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
