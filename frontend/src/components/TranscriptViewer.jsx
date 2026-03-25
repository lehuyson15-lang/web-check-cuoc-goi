import React from 'react';
import { User, Headphones, Clock } from 'lucide-react';

const TranscriptViewer = ({ segments, currentTime, onSeek }) => {
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isCurrent = (start, end) => currentTime >= start && currentTime <= end;

  return (
    <div className="flex flex-col space-y-4 max-h-[600px] overflow-y-auto pr-4 scroll-smooth">
      {segments.map((seg, index) => (
        <div
          key={seg.id || index}
          className={`flex gap-4 p-4 rounded-xl transition-all border ${
            isCurrent(seg.startTime, seg.endTime)
              ? 'bg-blue-50 border-blue-100 shadow-sm ring-1 ring-blue-200'
              : 'bg-white border-transparent hover:bg-slate-50'
          }`}
          onClick={() => onSeek(seg.startTime)}
        >
          <div className="flex-shrink-0 mt-1">
            {seg.speaker === 'agent' ? (
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Headphones size={20} />
              </div>
            ) : (
              <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center">
                <User size={20} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className={`text-xs font-bold uppercase tracking-wider ${
                seg.speaker === 'agent' ? 'text-blue-600' : 'text-slate-500'
              }`}>
                {seg.speaker === 'agent' ? 'Nhân viên' : 'Khách hàng'}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                <Clock size={12} />
                {formatTime(seg.startTime)}
              </span>
            </div>
            <p className={`text-[15px] leading-relaxed transition-colors ${
              isCurrent(seg.startTime, seg.endTime) ? 'text-slate-900 font-medium' : 'text-slate-600'
            }`}>
              {seg.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default TranscriptViewer;
