import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API_BASE = "/api";
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use(config => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNTS & ROLES
// ─────────────────────────────────────────────────────────────────────────────
const INIT_ACCOUNTS = [
  { id:"acc_admin", username:"admin",  password:"admin123", role:"admin",   name:"Anh Cả",         avatar:"AC", empId:null },
  { id:"acc_mgr",   username:"quanly", password:"mgr123",   role:"manager", name:"Trưởng Nhóm",    avatar:"TN", empId:null },
  { id:"acc_nv001", username:"lan",    password:"nv001",    role:"employee",name:"Nguyễn Thị Lan", avatar:"L",  empId:"nv001" },
  { id:"acc_nv002", username:"hung",   password:"nv002",    role:"employee",name:"Trần Minh Hùng", avatar:"H",  empId:"nv002" },
  { id:"acc_nv003", username:"mai",    password:"nv003",    role:"employee",name:"Lê Thị Mai",     avatar:"M",  empId:"nv003" },
  { id:"acc_nv004", username:"duc",    password:"nv004",    role:"employee",name:"Phạm Văn Đức",   avatar:"Đ",  empId:"nv004" },
  { id:"acc_nv005", username:"thu",    password:"nv005",    role:"employee",name:"Hoàng Thị Thu",  avatar:"T",  empId:"nv005" },
];
const INIT_EMPLOYEES = [
  { id:"nv001", name:"Nguyễn Thị Lan", avatar:"L", dept:"CSKH",   phone:"0901234567", status:"online",  joinDate:"01/03/2024", note:"" },
  { id:"nv002", name:"Trần Minh Hùng", avatar:"H", dept:"CSKH",   phone:"0912345678", status:"busy",    joinDate:"15/02/2024", note:"" },
  { id:"nv003", name:"Lê Thị Mai",     avatar:"M", dept:"Tư vấn", phone:"0923456789", status:"offline", joinDate:"10/01/2024", note:"" },
  { id:"nv004", name:"Phạm Văn Đức",   avatar:"Đ", dept:"Tư vấn", phone:"0934567890", status:"online",  joinDate:"05/03/2024", note:"" },
  { id:"nv005", name:"Hoàng Thị Thu",  avatar:"T", dept:"CSKH",   phone:"0945678901", status:"online",  joinDate:"20/01/2024", note:"" },
];

const ROLE_LABEL = { admin:"Admin", manager:"Quản lý", employee:"Nhân viên" };
const ROLE_COLOR = { admin:"#a78bfa", manager:"#0ea5e9", employee:"#22d3a0" };
const ROLE_ICON  = { admin:"👑", manager:"🧑💼", employee:"👤" };
const STATUS_COLOR = { online:"#22d3a0", busy:"#f59e0b", offline:"#6b7280", pending:"#f87171" };
const STATUS_LABEL = { online:"Trực tuyến", busy:"Đang bận", offline:"Offline", pending:"Chờ duyệt" };
const SOURCES = ["Facebook Ads","Zalo OA","Website","Fanpage BSHL","Fanpage DrBody","Referral"];
const DEFAULT_LIMIT = 15;

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS MATRIX
// ─────────────────────────────────────────────────────────────────────────────
const INIT_CAN = {
  viewDashboard:    ["admin", "manager"],
  viewAllEmployees: ["admin", "manager"],
  viewAllCalls:     ["admin", "manager"],
  viewReports:      ["admin", "manager"],
  dispatchPhone:    ["admin", "manager"],
  manageAccounts:   ["admin"],
  editCustomer:     ["admin", "manager", "employee"],
  deleteCustomer:   ["admin"]
};

const CAN_LABELS = {
  viewDashboard:    "Xem Dashboard",
  viewAllEmployees: "Xem NV toàn đội",
  viewAllCalls:     "Xem tất cả cuộc gọi",
  viewReports:      "Xem báo cáo quản trị",
  dispatchPhone:    "Điều phối cuộc gọi",
  manageAccounts:   "Quản lý tài khoản & Phân quyền",
  editCustomer:     "Chỉnh sửa hồ sơ KH",
  deleteCustomer:   "Xoá hồ sơ KH (Chỉ Admin)"
};

// ─────────────────────────────────────────────────────────────────────────────
// MOCK CALLS
// ─────────────────────────────────────────────────────────────────────────────
const seededRand = s => { let x=s; return ()=>{ x=(x*1664525+1013904223)&0xffffffff; return Math.abs(x)/0xffffffff; }; };
const parseDate  = str => { const[d,m,y]=str.split("/"); return new Date(`${y}-${m}-${d}`); };

const INIT_CALLS = (() => {
  const phones=["0987654321","0976543210","0965432109","0954321098","0943210987","0932109876","0921098765","0910987654"];
  const dates=["21/03/2025","20/03/2025","19/03/2025","18/03/2025","17/03/2025","16/03/2025","15/03/2025","14/03/2025"];
  const times=["08:05","08:32","09:12","09:48","10:20","10:55","11:30","13:05","13:44","14:22","15:10","15:50"];
  const calls=[];
  INIT_EMPLOYEES.forEach(emp=>{
    const r=seededRand(emp.id.charCodeAt(4)*37);
    for(let i=0;i<14;i++){
      const ds=dates[i%dates.length]; const mins=Math.floor(r()*7)+1; const secs=Math.floor(r()*60);
      const missed=r()<0.12; const hasTr=!missed&&r()<0.55;
      calls.push({ id:`call_${emp.id}_${i}`, empId:emp.id, phone:phones[i%phones.length], date:ds,
        dateObj:parseDate(ds), time:times[i%times.length],
        duration:missed?"0:00":`${mins}:${String(secs).padStart(2,"0")}`,
        durationSec:missed?0:mins*60+secs, status:missed?"missed":"completed", hasTr, note:"" });
    }
  });
  return calls;
})();

const INIT_ASSIGNMENTS = [
  { id:"as_1", phone:"0912345678", empId:"nv001", status:"pending", assignedAt:new Date("2025-03-21T08:00:00").toISOString(), source:"Facebook Ads", note:"" },
  { id:"as_2", phone:"0923456789", empId:"nv002", status:"overdue", assignedAt:new Date("2025-03-21T07:30:00").toISOString(), source:"Zalo OA", note:"" },
  { id:"as_3", phone:"0934567890", empId:"nv001", status:"called", assignedAt:new Date("2025-03-21T09:00:00").toISOString(), source:"Website", note:"" },
  { id:"as_4", phone:"0945678901", empId:"nv003", status:"reminder", assignedAt:new Date("2025-03-21T08:15:00").toISOString(), source:"Referral", note:"Cần gọi lại sau 2h" },
];

const MOCK_TRANSCRIPTS = {
  "call_nv001_0":`[00:00] Nhân viên: Xin chào KTTHĐN, tôi có thể giúp gì?\n\n[00:05] Khách hàng: Chào em, chị hỏi về hút mỡ bụng.\n\n[00:11] Nhân viên: Bên em có Vaser Lipo. Chị quan tâm vùng nào ạ?\n\n[00:20] Khách hàng: Bụng dưới và eo. Bao nhiêu tiền?\n\n[00:28] Nhân viên: Tùy vùng. Em đặt lịch tư vấn bác sĩ cho chị nhé?\n\n[01:06] Nhân viên: Em xin số điện thoại xác nhận lịch hẹn.`,
  "call_nv001_1":`[00:00] Nhân viên: KTTHĐN xin nghe.\n\n[00:04] Khách hàng: Hỏi về giảm mỡ không phẫu thuật.\n\n[00:10] Nhân viên: Bên em có Coolsculpting và RF Body, không xâm lấn.\n\n[00:28] Nhân viên: Sau 1-2 buổi thấy rõ, tối ưu 4-6 buổi. Em gửi ảnh before-after nhé?`,
};

const computeKPI = (empId, calls) => {
  const my=calls.filter(c=>c.empId===empId); const comp=my.filter(c=>c.status==="completed");
  const miss=my.filter(c=>c.status==="missed"); const tSec=comp.reduce((s,c)=>s+c.durationSec,0);
  const avg=comp.length?Math.round(tSec/comp.length):0; const conv=comp.filter(c=>c.durationSec>180).length;
  return { total:my.length, completed:comp.length, missed:miss.length,
    missRate:my.length?((miss.length/my.length)*100).toFixed(1):"0.0",
    avgDur:`${Math.floor(avg/60)}:${String(avg%60).padStart(2,"0")}`, avgDurSec:avg,
    converted:conv, convRate:comp.length?((conv/comp.length)*100).toFixed(1):"0.0" };
};

const fmtTime = ts => { const d=new Date(ts); return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}:${String(d.getSeconds()).padStart(2,"0")}`; };
const fmtCountdown = ms => { if(ms<=0)return"00:00"; const s=Math.floor(ms/1000); return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`; };


// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  :root{
    --bg:#0f172a;--bg2:#1e293b;--bg3:#334155;--surface:#1e293b;--surface2:#334155;
    --border:#334155;--accent:#d4af37;--accent2:#facc15;--danger:#f87171;
    --warn:#fbbf24;--purple:#a78bfa;
    --text:#f8fafc;--text2:#cbd5e1;--text3:#94a3b8;
    --font:'Be Vietnam Pro',sans-serif;--mono:'JetBrains Mono',monospace;--r:16px;--rs:10px
  }
  body{background:var(--bg);color:var(--text);font-family:var(--font);font-size:14px;line-height:1.6;min-height:100vh;overflow-x:hidden}
  ::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:var(--border);border-radius:99px}
  ::-webkit-scrollbar-thumb:hover{background:var(--accent)}
  .app{display:flex;min-height:100vh}

  /* LOGIN */
  .lpage{min-height:100vh;display:flex;background:var(--bg);position:relative;overflow:hidden}
  .login-hero{flex:1;background:url('/login_bg.png') center/cover no-repeat;position:relative;display:none}
  .login-hero::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg, transparent, var(--bg) 100%)}
  .lorb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.16;pointer-events:none}
  .login-right{flex:1;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;z-index:1;max-width:100%;}
  @media(min-width:1024px){.login-hero{display:block}.login-right{max-width:550px}}
  .lbox{width:100%;max-width:440px}
  .llogoic{width:64px;height:64px;background:var(--bg2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:30px;margin-bottom:14px;box-shadow:0 12px 32px rgba(212,175,55,.3); border: 1px solid var(--accent)}
  .lcard{background:rgba(30,41,59,.8);backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.06);border-radius:24px;padding:36px 32px;box-shadow:0 32px 80px rgba(0,0,0,.6)}
  .linp{width:100%;padding:11px 13px;background:var(--surface);border:1.5px solid var(--border);border-radius:var(--rs);color:var(--text);font-family:var(--font);font-size:14px;outline:none;transition:all .3s ease}
  .linp:focus{border-color:var(--accent);box-shadow:0 0 0 2px rgba(212,175,55,0.2)}
  .linp::placeholder{color:var(--text3)}
  .lbtn{width:100%;padding:14px;background:linear-gradient(135deg,var(--accent),var(--accent2));border:none;border-radius:var(--rs);color:#0f172a;font-family:var(--font);font-size:14px;font-weight:800;cursor:pointer;transition:all .2s;margin-top:6px;box-shadow:0 4px 12px rgba(212,175,55,.2)}
  .lbtn:hover{opacity:.9;box-shadow:0 8px 20px rgba(212,175,55,.4);transform:translateY(-2px)}
  .lbtn:disabled{opacity:.38;cursor:default;transform:none}
  .lerr{background:rgba(248,113,113,.09);border:1px solid rgba(248,113,113,.3);border-radius:var(--rs);padding:9px 13px;font-size:13px;color:var(--danger);margin-bottom:14px}
  .demo-item{display:flex;align-items:center;gap:9px;padding:8px 11px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);cursor:pointer;transition:all .2s;margin-bottom:5px}
  .demo-item:hover{border-color:var(--accent2);background:var(--surface2)}

  /* SIDEBAR */
  .sb{width:228px;min-height:100vh;background:rgba(30,41,59,.85);backdrop-filter:blur(16px);border-right:1px solid rgba(255,255,255,0.05);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;flex-shrink:0;z-index:30}
  .sblogo{padding:18px 16px 14px;border-bottom:1px solid rgba(255,255,255,0.05)}
  .sblogow{display:flex;align-items:center;gap:9px}
  .sblogoic{width:34px;height:34px;background:none;display:flex;align-items:center;justify-content:center}
  .sblogoic img{width:100%;height:100%;object-fit:contain}
  .sbnav{padding:11px 9px;flex:1}
  .sbnlbl{font-size:10px;text-transform:uppercase;letter-spacing:1.3px;color:var(--text3);padding:0 8px;margin:12px 0 4px}
  .sbnitem{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--rs);cursor:pointer;color:var(--text2);font-size:13px;font-weight:500;transition:all .2s;margin-bottom:1px}
  .sbnitem:hover{background:var(--surface);color:var(--text);transform:translateX(2px)}
  .sbnitem.act{background:linear-gradient(90deg,rgba(212,175,55,.15),transparent);color:var(--accent);border-left:2px solid var(--accent)}
  .sic{font-size:14px;width:17px;text-align:center}
  .nbadge{margin-left:auto;background:var(--danger);color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:99px;min-width:17px;text-align:center}
  .nbadge.warn{background:var(--warn);color:#0a0d14}
  .sbfoot{padding:11px 15px;border-top:1px solid rgba(255,255,255,0.05)}
  .sbuav{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800}
  .sblogout{background:none;border:1px solid rgba(255,255,255,0.1);color:var(--text3);padding:4px 9px;border-radius:var(--rs);font-size:11px;cursor:pointer;font-family:var(--font);transition:all .2s}
  .sblogout:hover{background:rgba(248,113,113,.1);color:var(--danger);border-color:rgba(248,113,113,.3)}

  /* TOPBAR */
  .main{flex:1;overflow-y:auto;min-width:0}
  .topbar{position:sticky;top:0;z-index:20;background:rgba(15,23,42,.85);backdrop-filter:blur(24px);border-bottom:1px solid rgba(255,255,255,0.05);padding:11px 21px;display:flex;align-items:center;gap:10px}
  .ptitle{font-size:17px;font-weight:800;flex:1}.psub{font-size:11px;color:var(--text2);margin-top:1px}
  .btn{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:var(--rs);border:none;font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;white-space:nowrap}
  .btnp{background:var(--accent);color:#0a0d14}.btnp:hover{background:#1bbf92}.btnp:disabled{opacity:.4;cursor:default}
  .btng{background:var(--surface);color:var(--text2);border:1px solid var(--border)}.btng:hover{background:var(--surface2);color:var(--text)}
  .btnd{background:rgba(248,113,113,.1);color:var(--danger);border:1px solid rgba(248,113,113,.25)}.btnd:hover{background:rgba(248,113,113,.2)}
  .btne{background:rgba(14,165,233,.1);color:var(--accent2);border:1px solid rgba(14,165,233,.25)}.btne:hover{background:rgba(14,165,233,.2)}
  .btnw{background:rgba(251,191,36,.1);color:var(--warn);border:1px solid rgba(251,191,36,.25)}.btnw:hover{background:rgba(251,191,36,.2)}
  .content{padding:24px 28px}
  .fab{position:fixed;bottom:30px;right:30px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));color:#0a0d14;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 24px rgba(212,175,55,.4);cursor:pointer;transition:all .3s cubic-bezier(.4,0,.2,1);z-index:100;border:none}
  .fab:hover{transform:translateY(-8px) scale(1.05);box-shadow:0 14px 32px rgba(212,175,55,.6)}
  .bellbtn{position:relative;width:33px;height:33px;background:var(--surface);border:1px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;transition:all .2s;flex-shrink:0}
  .bellbtn:hover{border-color:var(--accent)}
  .bellbadge{position:absolute;top:-3px;right:-3px;background:var(--danger);color:#fff;font-size:9px;font-weight:800;min-width:14px;height:14px;border-radius:99px;display:flex;align-items:center;justify-content:center;border:2px solid var(--bg)}

  /* TOAST */
  .toast-wrap{position:fixed;top:66px;right:16px;z-index:999;display:flex;flex-direction:column;gap:7px;pointer-events:none}
  .toast{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;min-width:300px;max-width:360px;pointer-events:all;display:flex;gap:10px;align-items:flex-start;box-shadow:0 8px 32px rgba(0,0,0,.5);animation:tslide .28s cubic-bezier(.4,0,.2,1)}
  @keyframes tslide{from{opacity:0;transform:translateX(26px)}to{opacity:1;transform:translateX(0)}}
  .toast.out{animation:tsout .22s ease forwards}@keyframes tsout{to{opacity:0;transform:translateX(26px)}}
  .toast.assigned{border-left:3px solid var(--accent2)}.toast.reminder{border-left:3px solid var(--warn)}.toast.overdue{border-left:3px solid var(--danger)}.toast.called{border-left:3px solid var(--accent)}
  .tcls{background:none;border:none;color:var(--text3);cursor:pointer;font-size:15px;padding:0;flex-shrink:0}.tcls:hover{color:var(--text)}

  /* NOTIF PANEL */
  .notif-panel{position:fixed;top:60px;right:11px;z-index:200;width:340px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);box-shadow:0 12px 40px rgba(0,0,0,.6);animation:nslide .2s ease;overflow:hidden}
  @keyframes nslide{from{opacity:0;transform:translateY(-7px)}to{opacity:1;transform:translateY(0)}}
  .notif-head{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:7px}
  .notif-list{max-height:360px;overflow-y:auto}
  .notif-item{padding:11px 16px;border-bottom:1px solid var(--border);display:flex;gap:9px;align-items:flex-start;transition:background .15s;cursor:pointer}
  .notif-item:last-child{border-bottom:none}.notif-item:hover{background:var(--surface)}.notif-item.unread{background:rgba(34,211,160,.04)}
  .ndot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:6px}

  /* STAT CARDS */
  .sgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:18px}
  .scard{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:15px;position:relative;overflow:hidden}
  .scard::before{content:'';position:absolute;top:0;left:0;right:0;height:2px}
  .scard.cg::before{background:var(--accent)}.scard.cb::before{background:var(--accent2)}.scard.cy::before{background:var(--warn)}.scard.cr::before{background:var(--danger)}.scard.cp::before{background:var(--purple)}
  .sic{font-size:19px;margin-bottom:7px}.sval{font-size:22px;font-weight:800;font-family:var(--mono)}.slbl{font-size:12px;color:var(--text2);margin-top:2px}

  /* ROLE CHIP */
  .rchip{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:99px;font-size:11px;font-weight:700;border:1px solid}

  /* CONFIRM MODAL */
  .conf-ov{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:300;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fi .18s ease}
  @keyframes fi{from{opacity:0}to{opacity:1}}
  .conf-box{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);width:100%;max-width:400px;padding:28px;margin:20px;animation:su .25s ease;text-align:center}
  @keyframes su{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
  .conf-icon{font-size:40px;margin-bottom:14px}
  .conf-title{font-size:18px;font-weight:800;margin-bottom:8px}
  .conf-msg{font-size:13px;color:var(--text2);line-height:1.65;margin-bottom:22px}
  .conf-btns{display:flex;gap:9px;justify-content:center}

  /* EDIT MODAL */
  .mov{position:fixed;inset:0;background:rgba(10,13,20,.8);z-index:300;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);padding:18px;animation:fi .2s ease}
  .modal{background:rgba(30,41,59,.95);border:1px solid rgba(255,255,255,.08);backdrop-filter:blur(24px);border-radius:16px;width:100%;display:flex;flex-direction:column;overflow:hidden;animation:su .28s ease;box-shadow:0 24px 60px rgba(0,0,0,.5)}
  .modal.sm{max-width:460px}.modal.md{max-width:620px}.modal.lg{max-width:900px;max-height:90vh}
  .mhead{padding:18px 22px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:11px}
  .mav{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:800;color:#0a0d14;flex-shrink:0}
  .mcls{margin-left:auto;background:var(--surface);border:1px solid var(--border);color:var(--text2);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;transition:all .2s}
  .mcls:hover{background:var(--danger);color:#fff;border-color:var(--danger)}
  .mbody{flex:1;overflow-y:auto;padding:18px 22px}
  .mtabs{display:flex;padding:0 22px;border-bottom:1px solid var(--border)}
  .mtab{padding:10px 14px;font-size:13px;font-weight:700;color:var(--text3);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s}
  .mtab.on{color:var(--accent);border-bottom-color:var(--accent)}
  .mfooter{padding:14px 22px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px}

  /* FORM FIELDS */
  .fg{margin-bottom:16px}
  .flbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:6px;display:block}
  .finp{width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text);font-family:var(--font);font-size:13px;outline:none;transition:border-color .2s}
  .finp:focus{border-color:var(--accent)}.finp::placeholder{color:var(--text3)}
  .fsel{width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text2);font-family:var(--font);font-size:13px;outline:none;cursor:pointer}
  .frow2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .ftextarea{width:100%;padding:9px 12px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text);font-family:var(--font);font-size:13px;outline:none;resize:vertical;min-height:72px}
  .ftextarea:focus{border-color:var(--accent)}

  /* DISPATCH */
  .disp-layout{display:grid;grid-template-columns:1fr 1.55fr;gap:15px;align-items:start}
  .panel{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
  .panel-head{padding:13px 17px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
  .panel-title{font-size:13px;font-weight:700;flex:1}
  .pfg{padding:14px 17px;border-bottom:1px solid var(--border)}.pfg:last-child{border-bottom:none}
  .pflbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);margin-bottom:6px;display:block}
  .emp-opt{display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);cursor:pointer;transition:all .2s;margin-bottom:4px}
  .emp-opt:hover{border-color:var(--accent2)}.emp-opt.sel{border-color:var(--accent);background:rgba(34,211,160,.07)}.emp-opt.off{opacity:.42;cursor:not-allowed}.emp-opt.off:hover{border-color:var(--border)}
  .tpbtns{display:flex;gap:4px}
  .tpb{padding:5px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;font-family:var(--mono)}
  .tpb:hover,.tpb.on{background:rgba(34,211,160,.1);color:var(--accent);border-color:rgba(34,211,160,.32)}
  .tnum{width:58px;padding:6px 8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text);font-family:var(--mono);font-size:13px;font-weight:700;outline:none;text-align:center}
  .tnum:focus{border-color:var(--accent)}
  .aitem{padding:12px 17px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;transition:background .15s}
  .aitem:last-child{border-bottom:none}.aitem:hover{background:var(--surface)}
  .aitem.overdue{background:rgba(248,113,113,.04);border-left:3px solid var(--danger)}.aitem.called{opacity:.6}.aitem.cancelled{opacity:.35}
  .countdown{font-family:var(--mono);font-size:13px;font-weight:800;min-width:48px;text-align:center;padding:4px 8px;border-radius:var(--rs);line-height:1.2}
  .cok{background:rgba(34,211,160,.09);color:var(--accent)}.cwarn{background:rgba(251,191,36,.1);color:var(--warn)}.cdanger{background:rgba(248,113,113,.12);color:var(--danger);animation:blink 1s infinite}.cdone{background:var(--surface);color:var(--text3);font-size:11px}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
  .abadge{padding:2px 7px;border-radius:99px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:3px;white-space:nowrap}
  .abadge.pending{background:rgba(14,165,233,.1);color:var(--accent2)}.abadge.overdue{background:rgba(248,113,113,.12);color:var(--danger)}.abadge.called{background:rgba(34,211,160,.1);color:var(--accent)}.abadge.cancelled{background:var(--surface);color:var(--text3)}.abadge.reminder{background:rgba(251,191,36,.1);color:var(--warn)}
  .tpbar{height:4px;background:var(--surface);border-radius:99px;overflow:hidden;margin-top:3px}
  .tpfill{height:100%;border-radius:99px;transition:width .9s linear,background .5s}

  /* TABLE */
  .tcard{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
  .thead{padding:11px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
  .ttitle{font-size:14px;font-weight:700;flex:1}.tcnt{font-size:12px;color:var(--text3);background:var(--surface);padding:2px 8px;border-radius:99px}
  table{width:100%;border-collapse:separate;border-spacing:0}
  thead th{padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text);background:rgba(51,65,85,.95);backdrop-filter:blur(8px);border-bottom:1px solid rgba(255,255,255,.08);font-weight:800;white-space:nowrap;position:sticky;top:0;z-index:10;box-shadow:0 1px 0 rgba(255,255,255,0.05)}
  tbody tr{border-bottom:1px solid var(--border);transition:background .15s}
  tbody tr:last-child{border-bottom:none}tbody tr:hover{background:var(--surface)}
  tbody td{padding:10px 12px;font-size:13px;vertical-align:middle}
  .ecell{display:flex;align-items:center;gap:8px}
  .av{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#0a0d14;flex-shrink:0}
  .rbadge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:11px;font-weight:700}
  .rbc{background:rgba(14,165,233,.12);color:var(--accent2)}.rbt{background:rgba(34,211,160,.10);color:var(--accent)}
  .sdot{display:flex;align-items:center;gap:5px}
  .dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}.dot.pl{animation:pulse 2s infinite}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.4)}}
  .mono{font-family:var(--mono);font-size:12px;color:var(--text2)}
  .action-group{display:flex;gap:5px;flex-wrap:wrap}

  /* FILTER */
  .fbar{display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:11px 16px;margin-bottom:14px;flex-wrap:wrap}
  .fbar label{font-size:11px;color:var(--text3);font-weight:700;text-transform:uppercase;letter-spacing:.8px;white-space:nowrap}
  .dinp{padding:6px 9px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text);font-family:var(--mono);font-size:12px;outline:none}
  .dinp:focus{border-color:var(--accent)}
  .qbtns{display:flex;gap:4px;margin-left:auto}
  .qb{padding:4px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;transition:all .2s;font-family:var(--font)}
  .qb:hover,.qb.on{background:rgba(34,211,160,.1);color:var(--accent);border-color:rgba(34,211,160,.3)}
  .fcnt{font-size:12px;color:var(--accent);font-weight:700;font-family:var(--mono);background:rgba(34,211,160,.07);padding:2px 8px;border-radius:99px;border:1px solid rgba(34,211,160,.18)}
  .sel2{padding:6px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text2);font-family:var(--font);font-size:13px;outline:none;cursor:pointer}
  .srow{display:flex;gap:7px;margin-bottom:12px;align-items:center;flex-wrap:wrap}
  .swrap{position:relative;flex:1;min-width:140px;max-width:270px}
  .swrap input{width:100%;padding:7px 10px 7px 29px;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);color:var(--text);font-family:var(--font);font-size:13px;outline:none}
  .swrap input:focus{border-color:var(--accent)}.swrap input::placeholder{color:var(--text3)}
  .sic2{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--text3);font-size:12px}

  /* PROFILE / MODAL DETAIL */
  .prow{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
  .pbox{background:var(--bg3);border:1px solid var(--border);border-radius:var(--rs);padding:11px;text-align:center}
  .pnum{font-size:19px;font-weight:800;font-family:var(--mono)}.plbl{font-size:11px;color:var(--text2);margin-top:2px}
  .icard{background:var(--bg3);border:1px solid var(--border);border-radius:var(--rs);padding:12px;margin-bottom:10px}
  .ictitle{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:var(--text3);margin-bottom:7px;font-weight:700}
  .irow{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)}
  .irow:last-child{border-bottom:none}.ik{font-size:12px;color:var(--text2)}.iv{font-size:13px;font-weight:700}
  .p2col{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .cbar{display:flex;gap:6px;margin-bottom:10px;flex-wrap:wrap;align-items:center}
  .ccnt{font-size:12px;color:var(--accent);font-weight:700;font-family:var(--mono);background:rgba(34,211,160,.07);padding:2px 8px;border-radius:99px;margin-left:auto}
  .clist{display:flex;flex-direction:column;gap:4px}
  .citem{background:var(--bg3);border:1px solid var(--border);border-radius:var(--rs);padding:9px 11px;display:flex;align-items:center;gap:8px;transition:all .2s}
  .citem:hover{border-color:var(--accent2)}
  .cph{font-family:var(--mono);font-size:13px;font-weight:700}
  .trb{display:inline-flex;align-items:center;gap:3px;padding:4px 8px;background:rgba(34,211,160,.06);border:1px solid rgba(34,211,160,.18);border-radius:var(--rs);color:var(--accent);font-size:11px;font-weight:700;cursor:pointer;transition:all .2s;font-family:var(--font)}
  .trb:hover{background:rgba(34,211,160,.13)}.trb:disabled{opacity:.28;cursor:default}.trb.op{background:rgba(34,211,160,.16);border-color:var(--accent)}
  .trpanel{margin-top:4px;background:var(--bg);border:1px solid var(--border);border-radius:var(--rs);padding:10px;font-family:var(--mono);font-size:12px;line-height:1.9;color:var(--text2);max-height:220px;overflow-y:auto;white-space:pre-wrap;animation:fi .28s ease}
  .tt{color:var(--accent)}.tnv{color:var(--accent2)}.tkh{color:var(--warn)}

  /* CHARTS */
  .charts2{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
  .bcwrap{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:15px}
  .bctitle{font-size:13px;font-weight:700;margin-bottom:11px;color:var(--text2)}
  .bc{display:flex;gap:4px;align-items:flex-end;height:100px}
  .bcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px}
  .brect{width:100%;border-radius:4px 4px 0 0;min-height:3px}
  .blbl{font-size:10px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;text-align:center}
  .bval{font-family:var(--mono);font-size:10px;font-weight:700}
  .rtable{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:16px}
  .rrow{display:grid;grid-template-columns:32px 1.2fr 80px 56px 66px 74px 80px 88px;align-items:center;padding:9px 14px;border-bottom:1px solid var(--border);font-size:13px;transition:background .15s}
  .rrow:last-child{border-bottom:none}.rrow:not(.rhdr):hover{background:var(--surface)}
  .rhdr{background:var(--bg3);font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);font-weight:700;padding:8px 14px}
  .rhdr>div{cursor:pointer;user-select:none}.rhdr>div:hover{color:var(--text2)}
  .rnum{font-family:var(--mono);font-weight:800;font-size:13px}
  .rk1{color:#fbbf24}.rk2{color:#94a3b8}.rk3{color:#d97706}
  .pgbar{display:flex;align-items:center;gap:6px}
  .pgtrack{flex:1;height:4px;background:var(--surface);border-radius:99px;overflow:hidden;min-width:38px}
  .pgfill{height:100%;border-radius:99px}
  .pgval{font-family:var(--mono);font-size:12px;font-weight:700;width:28px;text-align:right}
  .kgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px}
  .kbox{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:12px 10px}
  .kemp{display:flex;align-items:center;gap:6px;margin-bottom:9px}
  .kav{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10px;color:#0a0d14;flex-shrink:0}
  .kstat{display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--border)}.kstat:last-child{border-bottom:none}
  .kslab{font-size:11px;color:var(--text2)}.ksval{font-family:var(--mono);font-size:11px;font-weight:700}

  /* MISC */
  .tag{display:inline-block;padding:2px 7px;border-radius:99px;font-size:11px;font-weight:700}
  .tg{background:rgba(212,175,55,.1);color:var(--accent);border:1px solid rgba(212,175,55,.18)}
  .tb{background:rgba(14,165,233,.1);color:var(--accent2);border:1px solid rgba(14,165,233,.18)}
  .ty{background:rgba(251,191,36,.1);color:var(--warn);border:1px solid rgba(251,191,36,.18)}
  .trow{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
  .nodata{text-align:center;padding:28px;color:var(--text3);font-size:13px}
  .denied{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:70px 22px;text-align:center;color:var(--text3)}
  .emp-view-banner{background:linear-gradient(135deg,rgba(34,211,160,.09),rgba(14,165,233,.07));border:1px solid rgba(34,211,160,.18);border-radius:var(--r);padding:18px 22px;margin-bottom:18px;display:flex;align-items:center;gap:14px}
  .emp-banner-av{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:#0a0d14;flex-shrink:0}
  .my-task-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:14px}
  .my-task-head{padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
  .task-item{padding:13px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;transition:background .15s}
  .task-item:last-child{border-bottom:none}.task-item:hover{background:var(--surface)}.task-item.overdue{background:rgba(248,113,113,.04);border-left:3px solid var(--danger)}

  /* PERM TABLE in settings */
  .perm-table{width:100%;border-collapse:collapse;background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);overflow:hidden}
  .perm-table th,.perm-table td{padding:10px 14px;text-align:left;border-bottom:1px solid var(--border);font-size:13px}
  .perm-table th{background:var(--bg3);font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:var(--text3);font-weight:700}
  .perm-table tr:last-child td{border-bottom:none}
  .perm-table tr:not(:first-child):hover td{background:var(--surface)}
  .pcheck{font-size:15px;text-align:center}

  /* ── REPORTS ── */
  .rep-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:16px}
  .mode-toggle{display:flex;background:var(--surface);border:1px solid var(--border);border-radius:var(--rs);overflow:hidden}
  .mode-btn{padding:7px 16px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:none;color:var(--text2);font-family:var(--font);transition:all .18s}
  .mode-btn.on{background:var(--accent);color:#0a0d14}
  .rep-pivot-wrap{overflow-x:auto;border-radius:var(--r);border:1px solid var(--border);margin-bottom:18px}
  .rep-table{width:100%;border-collapse:collapse;min-width:600px}
  .rep-table th{padding:9px 11px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--text3);background:var(--bg3);border-bottom:1px solid var(--border);border-right:1px solid var(--border);font-weight:700;white-space:nowrap}
  .rep-table th.sticky{text-align:left;position:sticky;left:0;z-index:2;background:var(--bg3);min-width:140px}
  .rep-table td{padding:9px 10px;text-align:center;border-bottom:1px solid var(--border);border-right:1px solid var(--border);font-size:12px;font-family:var(--mono)}
  .rep-table td.sticky{text-align:left;position:sticky;left:0;z-index:1;background:var(--bg2);font-family:var(--font);font-size:13px;font-weight:700;min-width:140px}
  .rep-table tr:last-child td{border-bottom:none}
  .rep-table tr.total-row td{background:rgba(34,211,160,.07);font-weight:800;border-top:2px solid rgba(34,211,160,.25)}
  .rep-table tr.total-row td.sticky{background:rgba(34,211,160,.1)}
  .rep-table td:last-child,.rep-table th:last-child{border-right:none}
  .rep-table tr:not(.total-row):hover td:not(.sticky){background:var(--surface)}
  .rep-cell-good{color:var(--accent)}.rep-cell-warn{color:var(--warn)}.rep-cell-bad{color:var(--danger)}

  .rep-detail-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px;margin-bottom:18px}
  .rep-emp-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:14px;cursor:pointer;transition:all .18s}
  .rep-emp-card:hover,.rep-emp-card.sel{border-color:var(--accent);background:rgba(34,211,160,.05)}
  .rep-emp-card .ename{font-size:13px;font-weight:700;margin-bottom:2px}
  .rep-emp-card .erole{font-size:11px;color:var(--text3)}
  .rep-emp-kpi{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-top:10px}
  .rep-emp-kpi-item{background:var(--surface);border-radius:var(--rs);padding:6px 8px}
  .rep-emp-kpi-val{font-family:var(--mono);font-size:14px;font-weight:800}
  .rep-emp-kpi-lbl{font-size:10px;color:var(--text3);margin-top:1px}

  .trend-row{display:flex;align-items:flex-end;gap:3px;height:44px;margin-top:8px}
  .trend-bar{flex:1;border-radius:3px 3px 0 0;min-height:3px;transition:height .3s}

  .export-row{display:flex;gap:8px;align-items:center;margin-bottom:16px;flex-wrap:wrap}
  .export-info{font-size:12px;color:var(--text3);font-style:italic}

  /* ── MY KPI DASHBOARD ── */
  .kpi-hero{background:linear-gradient(135deg,rgba(34,211,160,.12),rgba(14,165,233,.08));border:1px solid rgba(34,211,160,.22);border-radius:var(--r);padding:22px 26px;margin-bottom:18px;display:flex;align-items:center;gap:20px;position:relative;overflow:hidden}
  .kpi-hero::before{content:'';position:absolute;right:-60px;top:-60px;width:200px;height:200px;background:radial-gradient(circle,rgba(34,211,160,.12),transparent);border-radius:50%;pointer-events:none}
  .kpi-hero-av{width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;color:#0a0d14;flex-shrink:0;box-shadow:0 6px 20px rgba(34,211,160,.3)}
  .kpi-clock{font-family:var(--mono);font-size:13px;color:var(--accent);font-weight:700;background:rgba(34,211,160,.1);padding:4px 12px;border-radius:99px;border:1px solid rgba(34,211,160,.22)}
  .kpi-date{font-size:12px;color:var(--text2);margin-top:3px}

  .kpi-big-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}
  .kpi-big-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:18px 16px;position:relative;overflow:hidden;transition:border-color .2s}
  .kpi-big-card:hover{border-color:var(--accent2)}
  .kpi-big-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px}
  .kpi-big-card.g::after{background:linear-gradient(90deg,var(--accent),transparent)}
  .kpi-big-card.b::after{background:linear-gradient(90deg,var(--accent2),transparent)}
  .kpi-big-card.r::after{background:linear-gradient(90deg,var(--danger),transparent)}
  .kpi-big-card.y::after{background:linear-gradient(90deg,var(--warn),transparent)}
  .kpi-big-card.p::after{background:linear-gradient(90deg,var(--purple),transparent)}
  .kpi-big-num{font-family:var(--mono);font-size:32px;font-weight:800;line-height:1;margin:10px 0 4px}
  .kpi-big-lbl{font-size:12px;color:var(--text2)}
  .kpi-big-sub{font-size:11px;color:var(--text3);margin-top:5px}
  .kpi-big-icon{font-size:20px;margin-bottom:2px}
  .kpi-vs{font-size:11px;font-weight:700;margin-top:6px;display:inline-flex;align-items:center;gap:3px}
  .kpi-vs.up{color:var(--accent)}.kpi-vs.down{color:var(--danger)}.kpi-vs.eq{color:var(--text3)}

  .goal-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:18px;margin-bottom:14px}
  .goal-row{display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border)}
  .goal-row:last-child{border-bottom:none}
  .goal-label{font-size:13px;font-weight:600;min-width:130px}
  .goal-track{flex:1;height:8px;background:var(--surface);border-radius:99px;overflow:hidden}
  .goal-fill{height:100%;border-radius:99px;transition:width .6s cubic-bezier(.4,0,.2,1)}
  .goal-nums{font-family:var(--mono);font-size:12px;font-weight:700;min-width:70px;text-align:right}
  .goal-pct{font-size:11px;color:var(--text3);min-width:36px;text-align:right}

  .hourly-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:18px;margin-bottom:14px}
  .hourly-chart{display:flex;gap:4px;align-items:flex-end;height:90px;margin-top:12px}
  .hour-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:default}
  .hour-bar-wrap{flex:1;width:100%;display:flex;align-items:flex-end}
  .hour-bar{width:100%;border-radius:4px 4px 0 0;min-height:3px;transition:height .4s cubic-bezier(.4,0,.2,1)}
  .hour-bar.cur{box-shadow:0 0 8px rgba(34,211,160,.5)}
  .hour-lbl{font-size:9px;color:var(--text3);font-family:var(--mono)}
  .hour-val{font-size:10px;font-weight:700;font-family:var(--mono)}

  .week-card{background:var(--bg2);border:1px solid var(--border);border-radius:var(--r);padding:18px;margin-bottom:14px}
  .week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-top:12px}
  .week-day{background:var(--surface);border-radius:var(--rs);padding:10px 6px;text-align:center;border:1px solid var(--border);transition:all .15s}
  .week-day.today{border-color:var(--accent);background:rgba(34,211,160,.08)}
  .week-day.future{opacity:.35}
  .week-day-name{font-size:10px;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
  .week-day-num{font-family:var(--mono);font-size:18px;font-weight:800;margin-bottom:4px}
  .week-day-calls{font-size:11px;color:var(--text2)}
  .week-day-bar{height:4px;background:var(--surface2);border-radius:99px;margin-top:6px;overflow:hidden}
  .week-day-fill{height:100%;border-radius:99px}

  .rank-banner{background:linear-gradient(135deg,rgba(167,139,250,.1),rgba(14,165,233,.07));border:1px solid rgba(167,139,250,.2);border-radius:var(--r);padding:16px 20px;display:flex;align-items:center;gap:14px;margin-bottom:14px}
  .rank-medal{font-size:36px}
  .rank-text{flex:1}
  .rank-title{font-size:15px;font-weight:800;margin-bottom:2px}
  .rank-sub{font-size:12px;color:var(--text2)}
  .live-dot{width:8px;height:8px;border-radius:50%;background:var(--accent);animation:livepulse 1.5s infinite;flex-shrink:0}
  @keyframes livepulse{0%,100%{opacity:1;box-shadow:0 0 0 0 rgba(34,211,160,.4)}50%{opacity:.8;box-shadow:0 0 0 6px rgba(34,211,160,0)}}

  .two-col-layout{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  @media(max-width:900px){.kpi-big-grid{grid-template-columns:repeat(2,1fr)}.two-col-layout{grid-template-columns:1fr}}
`;

// ─────────────────────────────────────────────────────────────────────────────
// SMALL REUSABLE COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
const RoleChip = ({ role }) => (
  <span className="rchip" style={{
    background:`rgba(${role==="admin"?"167,139,250":role==="manager"?"14,165,233":"34,211,160"},.09)`,
    borderColor:`rgba(${role==="admin"?"167,139,250":role==="manager"?"14,165,233":"34,211,160"},.28)`,
    color:ROLE_COLOR[role]
  }}>{ROLE_ICON[role]} {ROLE_LABEL[role]}</span>
);

const AccessDenied = ({ requiredRole }) => (
  <div className="denied">
    <div style={{fontSize:48,marginBottom:14,opacity:.5}}>🔒</div>
    <div style={{fontSize:16,fontWeight:800,marginBottom:8,color:"var(--text2)"}}>Không có quyền truy cập</div>
    <div style={{fontSize:13,maxWidth:300,lineHeight:1.7}}>Tính năng này yêu cầu quyền <strong>{ROLE_LABEL[requiredRole]}</strong> trở lên.</div>
  </div>
);

// Generic confirm/delete dialog
const ConfirmModal = ({ icon="🗑", title, msg, onConfirm, onCancel, danger=true }) => (
  <div className="conf-ov" onClick={e=>e.target.className==="conf-ov"&&onCancel()}>
    <div className="conf-box">
      <div className="conf-icon">{icon}</div>
      <div className="conf-title">{title}</div>
      <div className="conf-msg">{msg}</div>
      <div className="conf-btns">
        <button className="btn btng" onClick={onCancel}>Huỷ</button>
        <button className={`btn ${danger?"btnd":"btnp"}`} onClick={onConfirm}>{danger?"🗑 Xoá":"Xác nhận"}</button>
      </div>
    </div>
  </div>
);


const TR = ({ text }) => (
  <div className="trpanel">
    {text.split("\n").filter(Boolean).map((line,i)=>{
      const m=line.match(/^\[(\d{2}:\d{2})\]/);
      if(!m)return<div key={i}>{line}</div>;
      const rest=line.slice(m[0].length);
      return<div key={i}><span className="tt">{m[0]}</span>{rest.includes("Nhân viên")?<span className="tnv">{rest}</span>:rest.includes("Khách hàng")?<span className="tkh">{rest}</span>:rest}</div>;
    })}
  </div>
);

const CallLogModal = ({ employees, onClose, onSave, sessionLogs, addToast }) => {
  const [form, setForm] = useState({
    direction: "INBOUND", phone: "", name: "", service: "", empId: "", date: new Date().toISOString().slice(0,16), durM: "0", durS: "0", notes: ""
  });
  const [audioFile, setAudioFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const sub = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const durSec = parseInt(form.durM)*60 + parseInt(form.durS);
      const fd = new FormData();
      fd.append("customerPhone", form.phone);
      fd.append("customerName", form.name);
      fd.append("direction", form.direction);
      fd.append("serviceType", form.service);
      fd.append("assignedToId", form.empId);
      fd.append("calledAt", form.date);
      fd.append("durationSeconds", durSec);
      fd.append("notes", form.notes);
      if (audioFile) fd.append("audio", audioFile);

      const res = await api.post("/calls/manual", fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      onSave(res.data);
      setForm({ ...form, phone: "", name: "", notes: "" }); 
      setAudioFile(null);
    } catch (err) {
      console.error(err);
      addToast("overdue", "Lỗi khi lưu cuộc gọi: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mov" onClick={e=>e.target.className==="mov"&&onClose()}>
      <div className="modal" style={{maxWidth:960, display:"flex", gap:20, padding:0, background:"none", border:"none", boxShadow:"none"}}>
        <div className="mcard" style={{flex:1, background:"var(--surface)", borderRadius:16, padding:24, boxShadow:"var(--shadow-lg)"}}>
          <div className="mhead" style={{marginBottom:20}}>
            <h2 style={{fontSize:20,fontWeight:800}}>➕ Nhật ký cuộc gọi</h2>
            <button className="mcls" onClick={onClose}>×</button>
          </div>
          <form onSubmit={sub} className="lform">
            <div className="tbar" style={{marginBottom:20, display:"flex", background:"rgba(255,255,255,0.05)", borderRadius:8, padding:4}}>
              <div className={`tbtn ${form.direction==="INBOUND"?"act":""}`} style={{flex:1, textAlign:"center", padding:"8px 0", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:700, background:form.direction==="INBOUND"?"var(--accent)":"none", color:form.direction==="INBOUND"?"#fff":"var(--text3)"}} onClick={()=>setForm({...form,direction:"INBOUND"})}>📥 Đến</div>
              <div className={`tbtn ${form.direction==="OUTBOUND"?"act":""}`} style={{flex:1, textAlign:"center", padding:"8px 0", borderRadius:6, cursor:"pointer", fontSize:13, fontWeight:700, background:form.direction==="OUTBOUND"?"var(--accent)":"none", color:form.direction==="OUTBOUND"?"#fff":"var(--text3)"}} onClick={()=>setForm({...form,direction:"OUTBOUND"})}>📤 Đi</div>
            </div>
            <div className="fgrid" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:15}}>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>SỐ ĐIỆN THOẠI</label><input required className="linp" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>TÊN KHÁCH HÀNG</label><input className="linp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>DỊCH VỤ QUAN TÂM</label><input className="linp" value={form.service} onChange={e=>setForm({...form,service:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>NHÂN VIÊN PHỤ TRÁCH</label>
                <select className="sel2" value={form.empId} onChange={e=>setForm({...form,empId:e.target.value})} required style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", color:"#fff", width:"100%"}}>
                  <option value="" style={{background:"#1a1f2b"}}>-- Chọn nhân viên --</option>
                  {employees.map(e=><option key={e.id} value={e.id} style={{background:"#1a1f2b"}}>{e.name}</option>)}
                </select>
              </div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>THỜI GIAN</label><input type="datetime-local" className="linp" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>THỜI LƯỢNG</label>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <input type="number" className="linp" style={{width:80, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", color:"#fff"}} value={form.durM} onChange={e=>setForm({...form,durM:e.target.value})} /> <span style={{fontSize:12,color:"var(--text3)"}}>phút</span>
                  <input type="number" className="linp" style={{width:80, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", color:"#fff"}} value={form.durS} onChange={e=>setForm({...form,durS:e.target.value})} /> <span style={{fontSize:12,color:"var(--text3)"}}>giây</span>
                </div>
              </div>
              <div className="fg" style={{gridColumn:"1 / span 2", display:"flex", flexDirection:"column", gap:6}}>
                <label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>TẢI LÊN FILE GHI ÂM (NẾU CÓ)</label>
                <input type="file" accept="audio/*" onChange={e=>setAudioFile(e.target.files[0])} style={{background:"rgba(255,255,255,0.05)", border:"1px dashed rgba(255,255,255,0.2)", borderRadius:8, padding:"10px", color:"var(--text3)", fontSize:12}} />
              </div>
            </div>
            <div className="fg" style={{marginTop:15, display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>GHI CHÚ</label><textarea className="linp" style={{height:80, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"10px 14px", color:"#fff", resize:"none"}} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            <button className="lbtn" type="submit" disabled={loading} style={{marginTop:20, width:"100%", padding:"14px", background:"var(--accent)", color:"#fff", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", opacity:loading?0.7:1}}>{loading?"ĐANG LƯU...":"LƯU CUỘC GỌI"}</button>
          </form>
        </div>
        <div className="mcard" style={{width:300, background:"rgba(255,255,255,0.02)", backdropFilter:"blur(20px)", borderRadius:16, padding:20, border:"1px solid rgba(255,255,255,0.05)", overflowY:"auto"}}>
          <h3 style={{fontSize:13,fontWeight:800,marginBottom:15,color:"var(--text3)", textTransform:"uppercase", letterSpacing:0.5}}>Vừa lưu trong phiên</h3>
          <div className="latest-list">
            {sessionLogs.length===0 && <div style={{fontSize:12,color:"var(--text3)",textAlign:"center",marginTop:60, opacity:0.5}}>Chưa có bản ghi nào</div>}
            {sessionLogs.map(l=>(
              <div key={l.id} className="latest-item" style={{padding:12, borderRadius:12, background:"rgba(255,255,255,0.03)", marginBottom:10, border:"1px solid rgba(255,255,255,0.05)"}}>
                <div style={{fontSize:13,fontWeight:700,display:"flex",justifyContent:"space-between", alignItems:"center"}}>
                  <span>{l.phone}</span>
                  <span style={{fontSize:10, padding:"2px 6px", borderRadius:4, background:l.direction==="INBOUND"?"rgba(16,185,129,0.1)":"rgba(59,130,246,0.1)", color:l.direction==="INBOUND"?"#10b981":"#3b82f6"}}>{l.direction==="INBOUND"?"IN":"OUT"}</span>
                </div>
                <div style={{fontSize:11,color:"var(--text3)",marginTop:6, display:"flex", justifyContent:"space-between"}}>
                   <span>{new Date(l.calledAt).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</span>
                   <span>{l.serviceType||"N/A"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const EmployeeWizard = ({ onClose, onSave, addToast }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: "", gender: "Nam", phone: "", email: "", dept: "", status: "online", joinDate: new Date().toISOString().slice(0,10), address: "", emer: "",
    targetCalls: 50, targetConv: 5, password: "password123"
  });
  const [loading, setLoading] = useState(false);

  const next = () => {
    if (step===1 && (!form.name || !form.email || !form.phone)) return addToast("info", "Vui lòng nhập đầy đủ thông tin bắt buộc");
    setStep(step+1);
  };

  const sub = async () => {
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        ...form,
        phoneNumber: form.phone,
        department: form.dept,
        targetCallsPerDay: form.targetCalls,
        targetConversionsPerDay: form.targetConv,
        role: "USER"
      });
      onSave(res.data.user);
    } catch (err) {
      console.error(err);
      addToast("overdue", "Lỗi khi tạo nhân viên: " + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const av = form.name ? form.name.split(" ").pop().charAt(0).toUpperCase() : "?";

  return (
    <div className="mov" onClick={e=>e.target.className==="mov"&&onClose()}>
      <div className="modal" style={{maxWidth:600, background:"var(--surface)", borderRadius:20, padding:32, boxShadow:"var(--shadow-lg)"}}>
        <div className="mhead" style={{marginBottom:30}}>
          <div>
            <h2 style={{fontSize:22,fontWeight:800}}>🧑💼 Tạo hồ sơ nhân viên</h2>
            <div style={{fontSize:12,color:"var(--text3)",marginTop:4}}>Bước {step} / 3: {step===1?"Thông tin cá nhân":step===2?"Mục tiêu KPI":"Xác nhận"}</div>
          </div>
          <button className="mcls" onClick={onClose} style={{fontSize:24}}>×</button>
        </div>
        
        <div className="wizard-progress" style={{display:"flex",gap:8,marginBottom:32}}>
          {[1,2,3].map(s=><div key={s} style={{flex:1,height:4,borderRadius:2,background:s<=step?"var(--accent)":"rgba(255,255,255,0.05)", transition:"0.3s"}} />)}
        </div>

        <div className="wizard-body" style={{minHeight:320}}>
          {step===1 && (
            <div className="fgrid" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>HỌ TÊN *</label><input className="linp" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>GIỚI TÍNH</label><select className="sel2" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff", width:"100%"}}><option style={{background:"#1a1f2b"}}>Nam</option><option style={{background:"#1a1f2b"}}>Nữ</option></select></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>SỐ ĐIỆN THOẠI *</label><input className="linp" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>GMAIL *</label><input type="email" className="linp" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>PHÒNG BAN</label><input className="linp" value={form.dept} onChange={e=>setForm({...form,dept:e.target.value})} placeholder="VD: CSKH, Tư vấn..." style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>NGÀY VÀO LÀM</label><input type="date" className="linp" value={form.joinDate} onChange={e=>setForm({...form,joinDate:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
              <div className="fg" style={{gridColumn:"1 / span 2", display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>ĐỊA CHỈ</label><input className="linp" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
            </div>
          )}

          {step===2 && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center", paddingTop:20}}>
              <div className="sbuav" style={{width:90,height:90,fontSize:36,marginBottom:24,background:"var(--accent)",color:"#fff", boxShadow:"0 0 20px rgba(59,130,246,0.3)"}}>{av}</div>
              <div style={{width:"100%", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>TARGET CUỘC GỌI / NGÀY</label><input type="number" className="linp" value={form.targetCalls} onChange={e=>setForm({...form,targetCalls:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
                <div className="fg" style={{display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>TARGET CHUYỂN ĐỔI / NGÀY</label><input type="number" className="linp" value={form.targetConv} onChange={e=>setForm({...form,targetConv:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
                <div className="fg" style={{gridColumn:"1 / span 2", display:"flex", flexDirection:"column", gap:6}}><label style={{fontSize:11, color:"var(--text3)", fontWeight:700}}>MẬT KHẨU ĐĂNG NHẬP</label><input className="linp" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} style={{background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"12px 14px", color:"#fff"}} /></div>
              </div>
            </div>
          )}

          {step===3 && (
            <div className="confirm-box" style={{background:"rgba(255,255,255,0.02)",borderRadius:16,padding:24, border:"1px solid rgba(255,255,255,0.05)", marginTop:20}}>
               <p style={{marginBottom:20, fontSize:15}}>Bạn sắp tạo hồ sơ cho nhân viên <b>{form.name}</b>:</p>
               <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:15}}>
                 <div style={{padding:12, borderRadius:8, background:"rgba(255,255,255,0.03)"}}><div style={{fontSize:10,color:"var(--text3)",marginBottom:4}}>EMAIL ĐĂNG NHẬP</div><div style={{fontSize:13,fontWeight:700}}>{form.email}</div></div>
                 <div style={{padding:12, borderRadius:8, background:"rgba(255,255,255,0.03)"}}><div style={{fontSize:10,color:"var(--text3)",marginBottom:4}}>PHÒNG BAN</div><div style={{fontSize:13,fontWeight:700}}>{form.dept || "Chưa gán"}</div></div>
                 <div style={{padding:12, borderRadius:8, background:"rgba(255,255,255,0.03)"}}><div style={{fontSize:10,color:"var(--text3)",marginBottom:4}}>CHỈ TIÊU GỌI</div><div style={{fontSize:13,fontWeight:700,color:"var(--accent)"}}>{form.targetCalls} cuộc / ngày</div></div>
                 <div style={{padding:12, borderRadius:8, background:"rgba(255,255,255,0.03)"}}><div style={{fontSize:10,color:"var(--text3)",marginBottom:4}}>CHỈ TIÊU CHỐT</div><div style={{fontSize:13,fontWeight:700,color:"var(--accent2)"}}>{form.targetConv} khách / ngày</div></div>
               </div>
            </div>
          )}
        </div>

        <div style={{display:"flex",justifyContent:"space-between",marginTop:40}}>
          {step>1 ? <button className="lbtn" style={{background:"none",border:"1px solid rgba(255,255,255,0.1)",width:"auto",padding:"0 24px", color:"var(--text2)"}} onClick={()=>setStep(step-1)}>Quay lại</button> : <div />}
          {step<3 ? <button className="lbtn" style={{width:"auto",padding:"0 48px", background:"var(--accent)", color:"#fff", border:"none"}} onClick={next}>Tiếp theo</button> : <button className="lbtn" style={{width:"auto",padding:"0 48px", background:"var(--accent)", color:"#fff", border:"none"}} onClick={sub} disabled={loading}>{loading?"ĐANG TẠO...":"HOÀN TẤT"}</button>}
        </div>
      </div>
    </div>
  );
};

const MBC = ({ data, color, title }) => {
  const max=Math.max(...data.map(d=>d.v),1);
  return<div className="bcwrap"><div className="bctitle">{title}</div><div className="bc">{data.map((d,i)=><div className="bcol" key={i}><div className="bval" style={{color}}>{d.v}</div><div className="brect" style={{height:`${Math.max((d.v/max)*85,3)}px`,background:color,opacity:.72+(i/data.length)*.27}}/><div className="blbl">{d.l}</div></div>)}</div></div>;
};

const PB = ({v,max,col}) => <div className="pgbar"><div className="pgtrack"><div className="pgfill" style={{width:`${Math.min((v/Math.max(max,1))*100,100)}%`,background:col}}/></div><span className="pgval" style={{color:col}}>{v}</span></div>;

const DRBar = ({ from, to, onF, onT, count }) => {
  const REF="2025-03-21";
  const setQ=days=>{const d=new Date(REF);const te=d.toISOString().slice(0,10);d.setDate(d.getDate()-days+1);onF(d.toISOString().slice(0,10));onT(te);};
  const isQ=days=>{const d=new Date(REF);const te=d.toISOString().slice(0,10);d.setDate(d.getDate()-days+1);return from===d.toISOString().slice(0,10)&&to===te;};
  return<div className="fbar"><label>Lọc ngày</label><input type="date" className="dinp" value={from} onChange={e=>onF(e.target.value)}/><span style={{color:"var(--text3)"}}>→</span><input type="date" className="dinp" value={to} onChange={e=>onT(e.target.value)}/><div className="qbtns">{[[1,"Hôm nay"],[7,"7 ngày"],[14,"14 ngày"],[30,"30 ngày"]].map(([d,l])=><button key={d} className={`qb ${isQ(d)?"on":""}`} onClick={()=>setQ(d)}>{l}</button>)}</div>{count!==undefined&&<span className="fcnt">{count} cuộc</span>}</div>;
};

const ToastItem = ({ t, onDismiss }) => {
  const [out,setOut]=useState(false);
  useEffect(()=>{const tm=setTimeout(()=>{setOut(true);setTimeout(()=>onDismiss(t.id),240);},5000);return()=>clearTimeout(tm);},[]);
  const ic={assigned:"📲",reminder:"⏰",overdue:"🚨",called:"✅",info:"ℹ️"};
  const tl={assigned:"SĐT vừa được chia",reminder:"⚠️ Nhắc gọi điện",overdue:"🚨 Quá thời gian!",called:"✅ Gọi thành công",info:"Thông báo"};
  return<div className={`toast ${t.type} ${out?"out":""}`}><span style={{fontSize:19,flexShrink:0,marginTop:1}}>{ic[t.type]||"ℹ️"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:700,marginBottom:2}}>{tl[t.type]}</div><div style={{fontSize:12,color:"var(--text2)",lineHeight:1.5}}>{t.msg}</div><div style={{fontSize:11,color:"var(--text3)",marginTop:3,fontFamily:"var(--mono)"}}>{fmtTime(t.ts)}</div></div><button className="tcls" onClick={()=>{setOut(true);setTimeout(()=>onDismiss(t.id),240);}}>×</button></div>;
};

// ─────────────────────────────────────────────────────────────────────────────
// EDIT MODALS
// ─────────────────────────────────────────────────────────────────────────────

// ── Edit Employee ─────────────────────────────────────────────────────────────
const EditEmpModal = ({ emp, onSave, onClose }) => {
  const [form, setForm] = useState({ name:emp.name, dept:emp.dept, phone:emp.phone, status:emp.status, note:emp.note||"" });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  return(
    <div className="mov" onClick={e=>e.target.className==="mov"&&onClose()}>
      <div className="modal sm">
        <div className="mhead">
          <div className="mav">{emp.avatar}</div>
          <div><div style={{fontSize:16,fontWeight:800}}>Chỉnh sửa nhân viên</div><div style={{fontSize:12,color:"var(--text2)"}}>{emp.id}</div></div>
          <button className="mcls" onClick={onClose}>×</button>
        </div>
        <div className="mbody">
          <div className="fg"><label className="flbl">Họ và tên</label><input className="finp" value={form.name} onChange={f("name")} /></div>
          <div className="frow2">
            <div className="fg"><label className="flbl">Phòng ban</label>
              <select className="fsel" value={form.dept} onChange={f("dept")}><option>CSKH</option><option>Tư vấn</option><option>Kỹ thuật</option><option>Marketing</option></select>
            </div>
            <div className="fg"><label className="flbl">Trạng thái</label>
              <select className="fsel" value={form.status} onChange={f("status")}><option value="online">Trực tuyến</option><option value="busy">Đang bận</option><option value="offline">Offline</option><option value="pending">Chờ duyệt</option></select>
            </div>
          </div>
          <div className="fg"><label className="flbl">Số điện thoại nội bộ</label><input className="finp" value={form.phone} onChange={f("phone")} /></div>
          <div className="fg"><label className="flbl">Ghi chú quản lý</label><textarea className="ftextarea" value={form.note} onChange={f("note")} placeholder="Ghi chú về nhân viên này..."/></div>
        </div>
        <div className="mfooter"><button className="btn btng" onClick={onClose}>Huỷ</button><button className="btn btnp" onClick={()=>onSave({...emp,...form})}>💾 Lưu thay đổi</button></div>
      </div>
    </div>
  );
};

// ── Edit Assignment ───────────────────────────────────────────────────────────
const EditAssignModal = ({ a, employees, onSave, onClose }) => {
  const [form, setForm] = useState({ empId:a.empId, note:a.note||"", extendMin:0, source:a.source });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  return(
    <div className="mov" onClick={e=>e.target.className==="mov"&&onClose()}>
      <div className="modal sm">
        <div className="mhead">
          <div className="mav" style={{fontSize:14}}>✏️</div>
          <div><div style={{fontSize:16,fontWeight:800}}>Sửa phân công SĐT</div><div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)"}}>{a.phone}</div></div>
          <button className="mcls" onClick={onClose}>×</button>
        </div>
        <div className="mbody">
          <div className="fg"><label className="flbl">Chuyển sang nhân viên</label>
            <select className="fsel" value={form.empId} onChange={f("empId")}>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.dept})</option>)}
            </select>
          </div>
          <div className="fg"><label className="flbl">Nguồn lead</label>
            <select className="fsel" value={form.source} onChange={f("source")}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select>
          </div>
          <div className="fg"><label className="flbl">Gia hạn thêm (phút)</label>
            <input type="number" className="finp" value={form.extendMin} min={0} max={120} onChange={f("extendMin")} placeholder="0 = không gia hạn"/>
          </div>
          <div className="fg"><label className="flbl">Ghi chú</label><textarea className="ftextarea" value={form.note} onChange={f("note")} /></div>
        </div>
        <div className="mfooter"><button className="btn btng" onClick={onClose}>Huỷ</button><button className="btn btnp" onClick={()=>onSave(form)}>💾 Lưu</button></div>
      </div>
    </div>
  );
};

// ── Edit Call ─────────────────────────────────────────────────────────────────
const EditCallModal = ({ call, employees, onSave, onClose, addToast }) => {
  const [note, setNote] = useState(call.note || call.notes || "");
  const [saving, setSaving] = useState(false);
  const emp = employees.find(e=>e.id===call.empId);

  const handleSave = async () => {
    setSaving(true);
    try {
      // If it's a real call from backend (has DB id format), update it
      if (call.id && !call.id.startsWith("call_")) {
        await api.patch(`/calls/${call.id}`, { notes: note });
      }
      onSave({ note, status: call.status });
    } catch (error) {
      console.error("Failed to save note", error);
      addToast("overdue", "Lỗi khi lưu ghi chú");
    } finally {
      setSaving(false);
    }
  };

  return(
    <div className="mov" onClick={e=>e.target.className==="mov"&&onClose()}>
      <div className="modal sm">
        <div className="mhead">
          <div className="mav" style={{fontSize:14}}>✏️</div>
          <div><div style={{fontSize:16,fontWeight:800}}>Sửa bản ghi cuộc gọi</div><div style={{fontSize:12,color:"var(--text2)",fontFamily:"var(--mono)"}}>{call.phone} · {emp?.name}</div></div>
          <button className="mcls" onClick={onClose}>×</button>
        </div>
        <div className="mbody">
          <div className="icard">
            {[["SĐT",call.phone],["Ngày",call.date],["Giờ",call.time],["TG gọi",call.duration],["NV phụ trách",emp?.name||"—"]].map(([k,v])=>(
              <div className="irow" key={k}><span className="ik">{k}</span><span className="iv">{v}</span></div>
            ))}
          </div>
          <div className="fg"><label className="flbl">Ghi chú cuộc gọi</label><textarea className="ftextarea" value={note} onChange={e=>setNote(e.target.value)} placeholder="Nội dung tư vấn, kết quả, hành động tiếp theo..."/></div>
        </div>
        <div className="mfooter"><button className="btn btng" onClick={onClose}>Huỷ</button><button className="btn btnp" disabled={saving} onClick={handleSave}>{saving ? "⏳..." : "💾 Lưu"}</button></div>
      </div>
    </div>
  );
};

// ── Edit Account ──────────────────────────────────────────────────────────────
const EditAccModal = ({ acc, employees, onSave, onClose, isNew=false }) => {
  const [form, setForm] = useState({ name:acc.name, username:acc.username, password:acc.password, role:acc.role, empId:acc.empId||"", avatar:acc.avatar });
  const f = k => e => setForm(p=>({...p,[k]:e.target.value}));
  return(
    <div className="mov" onClick={e=>e.target.className==="mov"&&onClose()}>
      <div className="modal sm">
        <div className="mhead">
          <div className="mav" style={{background:`linear-gradient(135deg,${ROLE_COLOR[form.role]||"#22d3a0"},#0ea5e9)`,color:form.role==="admin"?"#fff":"#0a0d14",fontSize:14}}>{form.avatar||"?"}</div>
          <div><div style={{fontSize:16,fontWeight:800}}>{isNew?"Tạo tài khoản mới":"Chỉnh sửa tài khoản"}</div><div style={{fontSize:12,color:"var(--text2)"}}>{acc.id}</div></div>
          <button className="mcls" onClick={onClose}>×</button>
        </div>
        <div className="mbody">
          <div className="frow2">
            <div className="fg"><label className="flbl">Tên hiển thị</label><input className="finp" value={form.name} onChange={f("name")} /></div>
            <div className="fg"><label className="flbl">Avatar (chữ cái)</label><input className="finp" value={form.avatar} onChange={f("avatar")} maxLength={3} /></div>
          </div>
          <div className="frow2">
            <div className="fg"><label className="flbl">Username</label><input className="finp" value={form.username} onChange={f("username")} /></div>
            <div className="fg"><label className="flbl">Mật khẩu</label><input className="finp" type="text" value={form.password} onChange={f("password")} /></div>
          </div>
          <div className="frow2">
            <div className="fg"><label className="flbl">Quyền hạn</label>
              <select className="fsel" value={form.role} onChange={f("role")}><option value="admin">👑 Admin</option><option value="manager">🧑💼 Quản lý</option><option value="employee">👤 Nhân viên</option></select>
            </div>
            <div className="fg"><label className="flbl">Liên kết nhân viên</label>
              <select className="fsel" value={form.empId} onChange={f("empId")}>
                <option value="">— Không liên kết —</option>
                {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="mfooter"><button className="btn btng" onClick={onClose}>Huỷ</button><button className="btn btnp" onClick={()=>onSave({...acc,...form,empId:form.empId||null})}>💾 {isNew?"Tạo tài khoản":"Lưu thay đổi"}</button></div>
      </div>
    </div>
  );
};

// ── View Employee Detail Modal ────────────────────────────────────────────────
const EmpDetailModal = ({ emp, calls, onClose, transcripts }) => {
  const [tab,setTab]=useState("profile"); const [openTr,setOpenTr]=useState(null);
  const [from,setFrom]=useState("2025-03-01"); const [to,setTo]=useState("2025-03-21"); const [stF,setStF]=useState("all");
  const empCalls=calls.filter(c=>c.empId===emp.id);
  const filtered=useMemo(()=>{const f=new Date(from);f.setHours(0,0,0,0);const t=new Date(to);t.setHours(23,59,59,999);return empCalls.filter(c=>c.dateObj>=f&&c.dateObj<=t&&(stF==="all"||c.status===stF));},[empCalls,from,to,stF]);
  const kpi=useMemo(()=>computeKPI(emp.id,calls),[emp.id,calls]);
  return(
    <div className="mov" onClick={e=>e.target.className==="mov"&&onClose()}>
      <div className="modal lg">
        <div className="mhead">
          <div className="mav">{emp.avatar}</div>
          <div><div style={{fontSize:17,fontWeight:800}}>{emp.name}</div><div style={{fontSize:12,color:"var(--text2)",marginTop:2}}>{emp.id} · {emp.dept} · {emp.joinDate}</div><div className="trow" style={{marginTop:4}}><span className={`tag ${emp.status==="online"?"tg":emp.status==="busy"?"ty":"tb"}`}>{STATUS_LABEL[emp.status]}</span></div></div>
          <button className="mcls" onClick={onClose}>×</button>
        </div>
        <div className="mtabs">{[["profile","👤 Hồ sơ"],["calls","📞 Lịch sử gọi"]].map(([id,lb])=><div key={id} className={`mtab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lb}</div>)}</div>
        <div className="mbody">
          {tab==="profile"&&<>
            <div className="prow">
              <div className="pbox"><div className="pnum" style={{color:"var(--accent)"}}>{kpi.completed}</div><div className="plbl">Đã nghe</div></div>
              <div className="pbox"><div className="pnum" style={{color:"var(--danger)"}}>{kpi.missed}</div><div className="plbl">Gọi nhỡ</div></div>
              <div className="pbox"><div className="pnum" style={{color:"var(--accent2)"}}>{kpi.avgDur}</div><div className="plbl">TG TB</div></div>
              <div className="pbox"><div className="pnum" style={{color:"var(--warn)"}}>{kpi.convRate}%</div><div className="plbl">Conv.%</div></div>
            </div>
            <div className="p2col">
              <div className="icard"><div className="ictitle">Thông tin</div>
                {[["Họ tên",emp.name],["Mã NV",emp.id],["Phòng ban",emp.dept],["SĐT",emp.phone],["Ngày vào",emp.joinDate]].map(([k,v])=><div className="irow" key={k}><span className="ik">{k}</span><span className="iv">{v}</span></div>)}
              </div>
              <div className="icard"><div className="ictitle">KPI</div>
                {[["Tổng gọi",kpi.total,"var(--text)"],["Đã nghe",kpi.completed,"var(--accent)"],["Miss%",kpi.missRate+"%",parseFloat(kpi.missRate)>15?"var(--danger)":"var(--accent)"],["Conv.",kpi.converted,"var(--accent2)"],["Conv.%",kpi.convRate+"%","var(--accent)"]].map(([k,v,c])=><div className="irow" key={k}><span className="ik">{k}</span><span className="iv" style={{color:c}}>{v}</span></div>)}
              </div>
            </div>
            {emp.note&&<div className="icard"><div className="ictitle">Ghi chú</div><p style={{fontSize:13,color:"var(--text2)",lineHeight:1.7}}>{emp.note}</p></div>}
          </>}
          {tab==="calls"&&<>
            <div className="cbar">
              <input type="date" className="dinp" value={from} onChange={e=>setFrom(e.target.value)} /><span style={{color:"var(--text3)"}}>→</span><input type="date" className="dinp" value={to} onChange={e=>setTo(e.target.value)} />
              <select className="sel2" value={stF} onChange={e=>setStF(e.target.value)}><option value="all">Tất cả</option><option value="completed">Đã nghe</option><option value="missed">Gọi nhỡ</option></select>
              <span className="ccnt">{filtered.length} cuộc</span>
            </div>
            {filtered.length===0?<div className="nodata">📭 Không có cuộc gọi</div>:<div className="clist">{filtered.map(c=><div key={c.id}><div className="citem"><div style={{fontSize:15,width:26,height:26,background:"var(--surface)",borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{c.status==="completed"?"📞":"📵"}</div><div style={{flex:1}}><div className="cph">{c.phone}</div><div style={{fontSize:11,color:"var(--text3)"}}>📅 {c.date} · ⏰ {c.time}</div>{c.note&&<div style={{fontSize:11,color:"var(--accent2)",marginTop:2}}>📝 {c.note}</div>}</div><div style={{textAlign:"right",minWidth:56}}><div style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:13}}>{c.duration}</div><div style={{fontSize:11,color:c.status==="completed"?"var(--accent)":"var(--danger)"}}>{c.status==="completed"?"✓":"✗"}</div></div><button className={`trb ${openTr===c.id?"op":""}`} disabled={!c.hasTr} onClick={()=>c.hasTr&&setOpenTr(openTr===c.id?null:c.id)}>📝 {openTr===c.id?"Ẩn":"Transcript"}</button></div>{openTr===c.id&&(transcripts[c.id]?<TR text={transcripts[c.id]}/>:<div className="trpanel" style={{color:"var(--text3)"}}>⚠ Đang xử lý.</div>)}</div>)}</div>}
          </>}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MY KPI DASHBOARD — realtime for employee
// ─────────────────────────────────────────────────────────────────────────────
const MyKPIPage = ({ account, calls, employees, assignments }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const emp = employees.find(e => e.id === account.empId);

  // ── date helpers ──────────────────────────────────────────────────────────
  const nowDate   = new Date(now);
  const todayStr  = nowDate.toLocaleDateString("vi-VN"); // "dd/mm/yyyy"
  const todayISO  = nowDate.toISOString().slice(0,10);
  const clockStr  = nowDate.toLocaleTimeString("vi-VN", {hour:"2-digit",minute:"2-digit",second:"2-digit"});
  const dateLabel = nowDate.toLocaleDateString("vi-VN",{weekday:"long",day:"2-digit",month:"2-digit",year:"numeric"});

  const myCalls = calls.filter(c => c.empId === account.empId);

  // ── today's calls ─────────────────────────────────────────────────────────
  const todayCalls = myCalls.filter(c => {
    const [d,m,y] = c.date.split("/");
    return new Date(`${y}-${m}-${d}`).toISOString().slice(0,10) === todayISO;
  });
  const todayComp  = todayCalls.filter(c => c.status === "completed");
  const todayMiss  = todayCalls.filter(c => c.status === "missed");
  const todayAvgS  = todayComp.length ? Math.round(todayComp.reduce((s,c) => s+c.durationSec,0)/todayComp.length) : 0;
  const todayConv  = todayComp.filter(c => c.durationSec > 180).length;
  const todayTotalS= todayComp.reduce((s,c) => s+c.durationSec,0);

  // ── yesterday for comparison ──────────────────────────────────────────────
  const yDay = new Date(nowDate); yDay.setDate(yDay.getDate()-1);
  const yISO = yDay.toISOString().slice(0,10);
  const yCalls = myCalls.filter(c => { const[d,m,y2]=c.date.split("/"); return new Date(`${y2}-${m}-${d}`).toISOString().slice(0,10)===yISO; });
  const yComp  = yCalls.filter(c => c.status==="completed");
  const yConv  = yComp.filter(c => c.durationSec>180).length;

  const vs = (a,b) => a===b ? "eq" : a>b ? "up" : "down";
  const vsTxt = (a,b,unit="") => {
    if(b===0&&a===0) return null;
    const diff = a-b;
    const sign = diff>0 ? "▲" : diff<0 ? "▼" : "─";
    return `${sign} ${Math.abs(diff)}${unit} so với hôm qua`;
  };

  // ── goals (configurable targets) ─────────────────────────────────────────
  const GOALS = [
    { label:"Cuộc gọi/ngày",   val:todayCalls.length,  target:20, col:"var(--accent2)" },
    { label:"Đã nghe",         val:todayComp.length,   target:16, col:"var(--accent)" },
    { label:"Chuyển đổi",      val:todayConv,          target:6,  col:"var(--purple)" },
    { label:"Tỷ lệ nghe máy",  val:todayCalls.length?Math.round((todayComp.length/todayCalls.length)*100):0, target:80, col:"var(--warn)", unit:"%" },
  ];

  // ── hourly breakdown (mock realistic distribution) ────────────────────────
  const HOURS = [8,9,10,11,12,13,14,15,16,17];
  const seeded = seededRand(account.empId.charCodeAt(4) * 71 + nowDate.getDate());
  const hourlyData = HOURS.map(h => {
    // calls from real data: match hour from time field
    const real = todayCalls.filter(c => parseInt(c.time.split(":")[0]) === h);
    // simulate if no real data with seed
    const mock = Math.floor(seeded() * 5);
    const count = real.length > 0 ? real.length : mock;
    const comp  = real.filter(c=>c.status==="completed").length || Math.floor(count * 0.85);
    return { h, count, comp, isCurrent: nowDate.getHours() === h };
  });
  const maxHour = Math.max(...hourlyData.map(d => d.count), 1);

  // ── 7-day trend ───────────────────────────────────────────────────────────
  const WEEKDAYS = ["CN","T2","T3","T4","T5","T6","T7"];
  const weekData = Array.from({length:7}, (_,i) => {
    const d = new Date(nowDate); d.setDate(d.getDate() - (6-i));
    const iso = d.toISOString().slice(0,10);
    const dc = myCalls.filter(c => { const[dd,m,y2]=c.date.split("/"); return new Date(`${y2}-${m}-${dd}`).toISOString().slice(0,10)===iso; });
    const isToday = iso === todayISO;
    const isFuture = d > nowDate && !isToday;
    return { d, iso, total:dc.length, comp:dc.filter(c=>c.status==="completed").length,
      miss:dc.filter(c=>c.status==="missed").length, isToday, isFuture,
      dayName: WEEKDAYS[d.getDay()], dayNum: d.getDate() };
  });
  const maxWeek = Math.max(...weekData.filter(d=>!d.isFuture).map(d=>d.total), 1);

  // ── ranking among employees (using mock full data) ────────────────────────
  const todayAllCalls = calls.filter(c => { const[d,m,y]=c.date.split("/"); return new Date(`${y}-${m}-${d}`).toISOString().slice(0,10)===todayISO; });
  const empRanks = employees.map(e => ({
    id: e.id,
    count: todayAllCalls.filter(c=>c.empId===e.id&&c.status==="completed").length
  })).sort((a,b) => b.count-a.count);
  const myRank = empRanks.findIndex(e => e.id===account.empId) + 1;
  const MEDALS = ["🥇","🥈","🥉"];

  // ── pending tasks ─────────────────────────────────────────────────────────
  const pendingTasks = assignments.filter(a => a.empId===account.empId && ["pending","reminder","overdue"].includes(a.status));
  const overdueTasks = pendingTasks.filter(a => a.status==="overdue");

  // ── format helpers ────────────────────────────────────────────────────────
  const fmtDur = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
  const fmtHrMin = s => s >= 3600 ? `${Math.floor(s/3600)}g${Math.floor((s%3600)/60)}p` : `${Math.floor(s/60)}p${s%60}s`;

  return (
    <div className="content">
      {/* ── HERO BANNER ── */}
      <div className="kpi-hero">
        <div className="kpi-hero-av">{account.avatar}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{fontSize:18,fontWeight:800}}>{account.name}</div>
            <div className="live-dot"/>
            <span style={{fontSize:11,color:"var(--accent)",fontWeight:700}}>LIVE</span>
          </div>
          <div className="kpi-date">{dateLabel}</div>
          <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
            <RoleChip role="employee"/>
            {emp&&<span style={{fontSize:11,color:"var(--text3)"}}>{emp.dept} · {emp.phone}</span>}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div className="kpi-clock">{clockStr}</div>
          {pendingTasks.length>0&&(
            <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"}}>
              {overdueTasks.length>0&&<span style={{fontSize:12,fontWeight:700,color:"var(--danger)",background:"rgba(248,113,113,.12)",padding:"3px 10px",borderRadius:99,border:"1px solid rgba(248,113,113,.28)"}}>🚨 {overdueTasks.length} SĐT quá hạn</span>}
              {pendingTasks.filter(a=>a.status!=="overdue").length>0&&<span style={{fontSize:12,fontWeight:700,color:"var(--warn)",background:"rgba(251,191,36,.1)",padding:"3px 10px",borderRadius:99,border:"1px solid rgba(251,191,36,.25)"}}>⏳ {pendingTasks.filter(a=>a.status!=="overdue").length} SĐT chờ gọi</span>}
            </div>
          )}
        </div>
      </div>

      {/* ── RANKING BANNER ── */}
      {myRank <= employees.length && (
        <div className="rank-banner">
          <div className="rank-medal">{MEDALS[myRank-1]||`#${myRank}`}</div>
          <div className="rank-text">
            <div className="rank-title">
              {myRank===1 ? "🔥 Dẫn đầu hôm nay!" : myRank<=3 ? `Top ${myRank} hôm nay` : `Xếp hạng #${myRank} trong đội`}
            </div>
            <div className="rank-sub">
              {empRanks[0]?.id===account.empId
                ? `Đang dẫn với ${todayComp.length} cuộc đã nghe — tiếp tục giữ vững!`
                : `Cần thêm ${Math.max(0,(empRanks[0]?.count||0)-todayComp.length+1)} cuộc để vươn lên #1 · Người dẫn đầu: ${employees.find(e=>e.id===empRanks[0]?.id)?.name||"—"} (${empRanks[0]?.count||0} cuộc)`}
            </div>
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:13,color:"var(--text2)",textAlign:"right",flexShrink:0}}>
            <div style={{fontSize:22,fontWeight:800,color:"var(--purple)"}}>#{myRank}/{employees.length}</div>
            <div style={{fontSize:11}}>Xếp hạng hôm nay</div>
          </div>
        </div>
      )}

      {/* ── BIG KPI CARDS ── */}
      <div className="kpi-big-grid">
        {[
          {ic:"📞",lbl:"Tổng cuộc gọi",num:todayCalls.length,sub:`Đã nghe: ${todayComp.length} · Nhỡ: ${todayMiss.length}`,cls:"g",col:"var(--accent)",cmp:vsTxt(todayCalls.length,yCalls.length),dir:vs(todayCalls.length,yCalls.length)},
          {ic:"✅",lbl:"Cuộc đã nghe",num:todayComp.length,sub:`Tỷ lệ: ${todayCalls.length?Math.round((todayComp.length/todayCalls.length)*100):0}%`,cls:"b",col:"var(--accent2)",cmp:vsTxt(todayComp.length,yComp.length),dir:vs(todayComp.length,yComp.length)},
          {ic:"📵",lbl:"Gọi nhỡ",num:todayMiss.length,sub:`Miss rate: ${todayCalls.length?((todayMiss.length/todayCalls.length)*100).toFixed(1):0}%`,cls:"r",col:"var(--danger)",cmp:vsTxt(todayMiss.length,yCalls.filter(c=>c.status==="missed").length),dir:vs(todayMiss.length,yCalls.filter(c=>c.status==="missed").length)==="up"?"down":vs(todayMiss.length,yCalls.filter(c=>c.status==="missed").length)==="down"?"up":"eq"},
          {ic:"⏱",lbl:"TG TB / cuộc",num:fmtDur(todayAvgS),sub:`Tổng: ${fmtHrMin(todayTotalS)}`,cls:"y",col:"var(--warn)",cmp:null,dir:"eq"},
          {ic:"🎯",lbl:"Chuyển đổi",num:todayConv,sub:`Conv. rate: ${todayComp.length?((todayConv/todayComp.length)*100).toFixed(1):0}%`,cls:"p",col:"var(--purple)",cmp:vsTxt(todayConv,yConv),dir:vs(todayConv,yConv)},
        ].map(({ic,lbl,num,sub,cls,col,cmp,dir})=>(
          <div key={lbl} className={`kpi-big-card ${cls}`}>
            <div className="kpi-big-icon">{ic}</div>
            <div className="kpi-big-num" style={{color:col}}>{num}</div>
            <div className="kpi-big-lbl">{lbl}</div>
            <div className="kpi-big-sub">{sub}</div>
            {cmp&&<div className={`kpi-vs ${dir}`}>{cmp}</div>}
          </div>
        ))}
      </div>

      <div className="two-col-layout">
        {/* ── HOURLY CHART ── */}
        <div className="hourly-card">
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14,fontWeight:700}}>📊 Phân bổ cuộc gọi theo giờ</span>
            <span style={{fontSize:11,color:"var(--text3)"}}>Hôm nay</span>
          </div>
          <div className="hourly-chart">
            {hourlyData.map(({h,count,comp,isCurrent})=>{
              const barH = Math.max((count/maxHour)*76, count>0?4:0);
              const compH = count>0 ? Math.round((comp/count)*barH) : 0;
              const missH = barH - compH;
              return(
                <div className="hour-col" key={h}>
                  <div className="hour-val" style={{color:isCurrent?"var(--accent)":"var(--text3)"}}>{count||""}</div>
                  <div className="hour-bar-wrap" style={{height:76}}>
                    <div style={{width:"100%",display:"flex",flexDirection:"column-reverse",gap:1}}>
                      {comp>0&&<div className="hour-bar" style={{height:`${compH}px`,background:"var(--accent)",opacity:isCurrent?1:.7}}/>}
                      {missH>2&&count>0&&<div className="hour-bar" style={{height:`${missH}px`,background:"var(--danger)",opacity:.7}}/>}
                    </div>
                  </div>
                  <div className="hour-lbl" style={{color:isCurrent?"var(--accent)":"var(--text3)",fontWeight:isCurrent?800:400}}>{h}h{isCurrent?<span style={{marginLeft:1}}>◀</span>:""}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",gap:12,marginTop:8,fontSize:11,color:"var(--text3)"}}>
            <span><span style={{color:"var(--accent)"}}>■</span> Đã nghe</span>
            <span><span style={{color:"var(--danger)"}}>■</span> Gọi nhỡ</span>
            <span style={{color:"var(--accent)",marginLeft:"auto"}}>◀ Giờ hiện tại</span>
          </div>
        </div>

        {/* ── GOAL PROGRESS ── */}
        <div className="goal-card">
          <div style={{fontSize:14,fontWeight:700,marginBottom:14}}>🎯 Tiến độ mục tiêu hôm nay</div>
          {GOALS.map(({label,val,target,col,unit=""})=>{
            const pct = Math.min((val/target)*100, 100);
            const done = val >= target;
            return(
              <div className="goal-row" key={label}>
                <span className="goal-label">{done?"✅ ":""}{label}</span>
                <div className="goal-track">
                  <div className="goal-fill" style={{width:`${pct}%`,background:done?"var(--accent)":col}}/>
                </div>
                <span className="goal-nums" style={{color:done?"var(--accent)":pct>=70?"var(--warn)":"var(--text2)"}}>{val}{unit} / {target}{unit}</span>
                <span className="goal-pct" style={{color:done?"var(--accent)":pct>=70?"var(--warn)":"var(--text3)"}}>{Math.round(pct)}%</span>
              </div>
            );
          })}
          <div style={{marginTop:14,padding:"10px 12px",background:"var(--surface)",borderRadius:"var(--rs)",fontSize:12,color:"var(--text2)"}}>
            <span style={{fontWeight:700}}>💡 Gợi ý: </span>
            {GOALS.every(g=>g.val>=g.target)
              ? "🎉 Xuất sắc! Đã hoàn thành tất cả mục tiêu hôm nay."
              : `Còn ${GOALS.filter(g=>g.val<g.target).length} mục tiêu chưa đạt — tập trung vào "${GOALS.filter(g=>g.val<g.target)[0]?.label}".`}
          </div>
        </div>
      </div>

      {/* ── 7-DAY WEEK CHART ── */}
      <div className="week-card">
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
          <span style={{fontSize:14,fontWeight:700}}>📅 Hiệu suất 7 ngày gần nhất</span>
        </div>
        <div style={{fontSize:12,color:"var(--text3)",marginBottom:4}}>Cuộc gọi đã nghe mỗi ngày</div>
        <div className="week-grid">
          {weekData.map((d,i)=>{
            const pct = d.isFuture ? 0 : Math.min((d.comp/Math.max(maxWeek,1))*100,100);
            const barCol = d.isToday?"var(--accent)":d.comp>0?"var(--accent2)":"var(--surface2)";
            return(
              <div key={i} className={`week-day ${d.isToday?"today":""} ${d.isFuture?"future":""}`}>
                <div className="week-day-name">{d.dayName}</div>
                <div className="week-day-num" style={{color:d.isToday?"var(--accent)":d.isFuture?"var(--text3)":d.comp>0?"var(--text)":"var(--text3)"}}>{d.dayNum}</div>
                {!d.isFuture&&(
                  <>
                    <div className="week-day-calls">{d.total>0?`${d.comp}✓ ${d.miss>0?d.miss+"✗":""}`:"—"}</div>
                    <div className="week-day-bar"><div className="week-day-fill" style={{width:`${pct}%`,background:barCol}}/></div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <div style={{display:"flex",gap:16,marginTop:12,fontSize:11,color:"var(--text3)"}}>
          {weekData.filter(d=>!d.isFuture&&d.total>0).length>0&&(
            <>
              <span>Tổng 7 ngày: <strong style={{color:"var(--accent)"}}>{weekData.filter(d=>!d.isFuture).reduce((s,d)=>s+d.comp,0)} cuộc đã nghe</strong></span>
              <span>TB/ngày: <strong style={{color:"var(--accent2)"}}>{Math.round(weekData.filter(d=>!d.isFuture&&d.total>0).reduce((s,d)=>s+d.comp,0)/Math.max(weekData.filter(d=>!d.isFuture&&d.total>0).length,1))}</strong></span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGES FROM PREVIOUS VERSION
// ─────────────────────────────────────────────────────────────────────────────

const DashPage = ({ allCalls }) => {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); });
  const [to,   setTo]   = useState(() => new Date().toISOString().slice(0,10));
  const [sKey, setSKey] = useState("completed");
  const [sDir, setSDir] = useState(-1);

  const fc = useMemo(() => {
    const f = new Date(from); f.setHours(0,0,0,0);
    const t = new Date(to);   t.setHours(23,59,59,999);
    return allCalls.filter(c => c.dateObj >= f && c.dateObj <= t);
  }, [allCalls, from, to]);

  const ekpis = useMemo(() => INIT_EMPLOYEES.map(emp => {
    // Basic compute KPI for DashPage
    const myCalls = fc.filter(c => c.empId === emp.id);
    const completed = myCalls.filter(c => c.status === "completed");
    const missed = myCalls.filter(c => c.status === "missed");
    const avgDurSec = completed.length ? Math.round(completed.reduce((s,c)=>s+c.durationSec,0)/completed.length) : 0;
    const converted = completed.filter(c => c.durationSec > 180).length;
    return {
      emp,
      kpi: {
        total: myCalls.length,
        completed: completed.length,
        missed: missed.length,
        missRate: myCalls.length ? ((missed.length/myCalls.length)*100).toFixed(1) : "0.0",
        avgDurSec,
        avgDur: `${Math.floor(avgDurSec/60)}:${String(avgDurSec%60).padStart(2,"0")}`,
        converted,
        convRate: completed.length ? ((converted/completed.length)*100).toFixed(1) : "0.0",
      }
    };
  }), [fc]);

  const sorted = useMemo(() =>
    [...ekpis].sort((a,b) => (parseFloat(b.kpi[sKey]||0) - parseFloat(a.kpi[sKey]||0)) * sDir),
    [ekpis, sKey, sDir]);

  const tog = (k) => { if(sKey===k) setSDir(d=>-d); else { setSKey(k); setSDir(-1); } };
  const arr = (k) => sKey===k ? (sDir<0?"▼":"▲") : "";

  const total = fc.length;
  const comp  = fc.filter(c=>c.status==="completed").length;
  const miss  = fc.filter(c=>c.status==="missed").length;
  const avgs  = comp ? Math.round(fc.filter(c=>c.status==="completed").reduce((s,c)=>s+c.durationSec,0)/comp) : 0;
  const maxC  = Math.max(...ekpis.map(e=>e.kpi.completed), 1);
  const maxCv = Math.max(...ekpis.map(e=>e.kpi.converted), 1);

  return (
    <div className="content">
      <div className="sgrid">
        <div className="scard cg"><div className="sic">📞</div><div className="sval" style={{color:"var(--accent)"}}>{total}</div><div className="slbl">Tổng cuộc gọi (kỳ lọc)</div></div>
        <div className="scard cb"><div className="sic">✅</div><div className="sval" style={{color:"var(--accent2)"}}>{comp}</div><div className="slbl">Đã nghe</div><div className="schg up" style={{color:"var(--accent)",fontSize:11,marginTop:4}}>{total?((comp/total)*100).toFixed(1):0}% tỷ lệ nghe máy</div></div>
        <div className="scard cy"><div className="sic">⏱</div><div className="sval" style={{color:"var(--warn)"}}>{Math.floor(avgs/60)}:{String(avgs%60).padStart(2,"0")}</div><div className="slbl">Thời lượng TB toàn đội</div></div>
        <div className="scard cr"><div className="sic">📵</div><div className="sval" style={{color:"var(--danger)"}}>{miss}</div><div className="slbl">Tổng gọi nhỡ</div><div className="schg down" style={{color:"var(--danger)",fontSize:11,marginTop:4}}>{total?((miss/total)*100).toFixed(1):0}% tỷ lệ nhỡ</div></div>
      </div>

      <DRBar from={from} to={to} onF={setFrom} onT={setTo} count={fc.length} />

      <div className="charts2">
        <MBC title="📞 Cuộc gọi đã nghe / nhân viên" color="var(--accent)"
          data={ekpis.map(e=>({l:e.emp.name.split(" ").pop(), v:e.kpi.completed}))} />
        <MBC title="🎯 Leads chuyển đổi / nhân viên" color="var(--accent2)"
          data={ekpis.map(e=>({l:e.emp.name.split(" ").pop(), v:e.kpi.converted}))} />
      </div>

      <div className="dash-sec" style={{marginBottom: 24}}>
        <div className="sec-title" style={{fontSize: 16, fontWeight: 800, marginBottom: 12}}>🏆 Bảng xếp hạng hiệu suất</div>
        <div className="rtable">
          <div className="rrow rhdr">
            <div>#</div>
            <div>Nhân viên</div>
            <div onClick={()=>tog("completed")}>Đã nghe {arr("completed")}</div>
            <div onClick={()=>tog("missed")}>Nhỡ {arr("missed")}</div>
            <div onClick={()=>tog("missRate")}>Tỷ lệ nhỡ {arr("missRate")}</div>
            <div onClick={()=>tog("avgDurSec")}>TG trung bình {arr("avgDurSec")}</div>
            <div onClick={()=>tog("converted")}>Chuyển đổi {arr("converted")}</div>
            <div onClick={()=>tog("convRate")}>Tỷ lệ CĐ {arr("convRate")}</div>
          </div>
          {sorted.map(({emp,kpi},i) => (
            <div className="rrow" key={emp.id}>
              <div className={`rnum ${i===0?"rk1":i===1?"rk2":i===2?"rk3":""}`}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}
              </div>
              <div>
                <div className="ecell">
                  <div className="av" style={{width:28,height:28,fontSize:11}}>{emp.avatar}</div>
                  <div>
                    <div style={{fontSize:12,fontWeight:700}}>{emp.name.split(" ").slice(-2).join(" ")}</div>
                    <span className={`rbadge ${emp.role==="CSKH"?"rbc":"rbt"}`} style={{fontSize:10}}>{emp.role}</span>
                  </div>
                </div>
              </div>
              <div><PB v={kpi.completed} max={maxC} col="var(--accent)" /></div>
              <div><span style={{fontFamily:"var(--mono)",fontWeight:700,color:kpi.missed>3?"var(--danger)":"var(--text2)"}}>{kpi.missed}</span></div>
              <div><span style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:parseFloat(kpi.missRate)>15?"var(--danger)":"var(--accent)"}}>{kpi.missRate}%</span></div>
              <div><span className="mono">{kpi.avgDur}</span></div>
              <div><PB v={kpi.converted} max={maxCv} col="var(--accent2)" /></div>
              <div><span style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:parseFloat(kpi.convRate)>40?"var(--accent)":"var(--warn)"}}>{kpi.convRate}%</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MISSING PAGES (Synthesized due to truncation)
// ─────────────────────────────────────────────────────────────────────────────

const MyTasksPage = ({ account, assignments, employees, calls, onUpdateTask }) => {
  const myTasks = assignments.filter(a => a.empId === account.empId);
  return (
    <div className="content">
      <div className="sec-title">📋 Nhiệm vụ của tôi</div>
      <div className="tcard">
        <table>
          <thead><tr><th>SĐT</th><th>Nguồn</th><th>Giao lúc</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
          <tbody>
            {myTasks.map(t => (
              <tr key={t.id}>
                <td className="cph">{t.phone}</td>
                <td>{t.source}</td>
                <td>{new Date(t.assignedAt).toLocaleString()}</td>
                <td><span className={`tag ${t.status==="called"?"tg":t.status==="overdue"?"cr":"tb"}`}>{t.status}</span></td>
                <td><button className="btn btnp" disabled={t.status==="called"} onClick={() => onUpdateTask(t.id, {status: "called"})}>Gọi</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const MyCallsPage = ({ account, calls, openTr, setOpenTr, transcripts, setEditCall, can, onDeleteCall }) => {
  const myCalls = calls.filter(c => c.empId === account.empId);
  return (
    <div className="content">
      <div className="sec-title">📞 Lịch sử cuộc gọi của tôi</div>
      <div className="tcard">
        <table>
          <thead><tr><th>SĐT</th><th>Ngày / Giờ</th><th>Thời lượng</th><th>Transcript</th></tr></thead>
          <tbody>
            {myCalls.map(c => (
              <React.Fragment key={c.id}>
                <tr>
                  <td className="cph">{c.phone}</td>
                  <td>{c.date} {c.time}</td>
                  <td className="mono">{c.duration}</td>
                  <td>
                    <button
                      className={`trb ${openTr === c.id ? "op" : ""}`}
                      disabled={!c.hasTr}
                      onClick={() => c.hasTr && setOpenTr(openTr === c.id ? null : c.id)}
                    >
                      📝 {openTr === c.id ? "Ẩn" : "Transcript"}
                    </button>
                    {can("editCustomer") && (
                      <button
                        className="trb"
                        style={{marginLeft: 4}}
                        onClick={() => setEditCall(c)}
                      >
                        ✏️ Sửa
                      </button>
                    )}
                    {can("deleteCustomer") && (
                      <button
                        className="trb"
                        style={{marginLeft: 4, color: "var(--danger)"}}
                        onClick={() => onDeleteCall(c.id)}
                      >
                        🗑 Xoá
                      </button>
                    )}
                  </td>
                </tr>
                {openTr === c.id && (
                  <tr>
                    <td colSpan="4" style={{ padding: "0 12px 12px" }}>
                      {transcripts[c.id] ? <TR text={transcripts[c.id]} /> : <div className="trpanel" style={{ color: "var(--text3)" }}>⚠ Đang xử lý.</div>}
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AllCallsPage = ({ calls, employees, openTr, setOpenTr, transcripts, onAdd, setEditCall, can, onDeleteCall }) => {
  const [filterEmpId, setFilterEmpId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const fileInputRef = useRef(null);

  const filteredCalls = useMemo(() => {
    let result = calls;
    if (filterEmpId !== "all") result = result.filter(c => c.empId === filterEmpId);
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(c =>
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    }
    return result;
  }, [calls, filterEmpId, searchText]);

  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/calls/import-csv", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setImportMsg({ type: "ok", text: res.data.message });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setImportMsg({ type: "err", text: err.response?.data?.message || "Lỗi khi tải lên" });
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="content">
      <div className="sec-title" style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
        <span>🌍 Tất cả cuộc gọi ({filteredCalls.length})</span>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <select className="sel2" value={filterEmpId} onChange={e=>setFilterEmpId(e.target.value)} style={{minWidth:160,padding:"6px 10px",fontSize:12}}>
            <option value="all">👥 Tất cả nhân viên</option>
            {employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <button className="lbtn" style={{width:"auto", padding:"6px 12px", fontSize:12}} onClick={onAdd}>+ Thêm cuộc gọi</button>
          <input type="file" ref={fileInputRef} accept=".csv,.txt,.xlsx,.xls" style={{display:"none"}} onChange={handleImportCSV} />
          <button className="lbtn" style={{width:"auto", padding:"6px 12px", fontSize:12, background:"var(--accent2)"}} onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? "⏳ Đang tải..." : "📁 Tải file khách hàng"}
          </button>
        </div>
      </div>

      {importMsg && (
        <div style={{padding:"10px 14px",marginBottom:12,borderRadius:8,fontSize:13,fontWeight:600,
          background:importMsg.type==="ok"?"rgba(34,211,160,.15)":"rgba(255,77,77,.15)",
          color:importMsg.type==="ok"?"var(--accent)":"var(--danger)"}}>
          {importMsg.type==="ok"?"✅":"❌"} {importMsg.text}
        </div>
      )}

      <div style={{marginBottom:12}}>
        <input
          type="text"
          placeholder="🔍 Tìm theo tên hoặc số điện thoại khách hàng..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"1px solid var(--border)",background:"var(--surface)",color:"var(--text)",fontSize:13,outline:"none"}}
        />
      </div>
      <div className="tcard">
        <table>
          <thead><tr><th>SĐT</th><th>Tên khách</th><th>Nhân viên</th><th>Ngày / Giờ</th><th>Thời gian</th><th>Ghi chú</th><th>Hành động</th></tr></thead>
          <tbody>
            {filteredCalls.map(c => {
              const emp = employees.find(e => e.id === c.empId);
              return (
                <React.Fragment key={c.id}>
                  <tr>
                    <td className="cph">{c.phone}</td>
                    <td style={{fontSize:12}}>{c.customerName || <span style={{color:"var(--text3)",fontStyle:"italic"}}>—</span>}</td>
                    <td>{emp ? emp.name : "—"}</td>
                    <td>{c.date} {c.time}</td>
                    <td className="mono">{c.duration}</td>
                    <td>
                      <p className="text-xs text-slate-500 max-w-[150px] truncate" title={c.notes}>
                        {c.notes || <span className="text-slate-300 italic">Trống</span>}
                      </p>
                    </td>
                    <td>
                      <button
                        className={`trb ${openTr === c.id ? "op" : ""}`}
                        disabled={!c.hasTr}
                        onClick={() => c.hasTr && setOpenTr(openTr === c.id ? null : c.id)}
                      >
                        📝 {openTr === c.id ? "Ẩn" : "Transcript"}
                      </button>
                      {can("editCustomer") && (
                        <button
                          className="trb"
                          style={{marginLeft: 4}}
                          onClick={() => setEditCall(c)}
                        >
                          ✏️ Sửa
                        </button>
                      )}
                      {can("deleteCustomer") && (
                        <button
                          className="trb"
                          style={{marginLeft: 4, color: "var(--danger)"}}
                          onClick={() => onDeleteCall(c.id)}
                        >
                          🗑 Xoá
                        </button>
                      )}
                    </td>
                  </tr>
                  {openTr === c.id && (
                    <tr>
                      <td colSpan="7" style={{ padding: "0 12px 12px" }}>
                        {transcripts[c.id] ? <TR text={transcripts[c.id]} /> : <div className="trpanel" style={{ color: "var(--text3)" }}>⚠ Đang xử lý.</div>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <button className="fab" onClick={onAdd} title="Thêm cuộc gọi mới">
        ✚
      </button>
    </div>
  );
};

const AccountsPage = ({ accounts, employees }) => {
  return (
    <div className="content">
      <div className="sec-title">🔑 Quản lý tài khoản</div>
      <div className="tcard">
        <table>
          <thead><tr><th>ID</th><th>Username</th><th>Tên</th><th>Role</th><th>Nhân viên liên kết</th></tr></thead>
          <tbody>
            {accounts.map(acc => (
              <tr key={acc.id}>
                <td>{acc.id}</td>
                <td style={{fontWeight:700}}>{acc.username}</td>
                <td><div className="ecell"><div className="av">{acc.avatar}</div>{acc.name}</div></td>
                <td><RoleChip role={acc.role} /></td>
                <td>{acc.empId ? employees.find(e=>e.id===acc.empId)?.name || acc.empId : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmpPage = ({ employees, allCalls, onSel, onAdd, onApprove }) => {
  return (
    <div className="content">
      <div className="sec-title">
        <span>👥 Quản lý nhân viên</span>
        <button className="lbtn" style={{width:"auto", padding:"6px 12px", fontSize:12, background:"var(--accent2)"}} onClick={onAdd}>+ Thêm nhân viên</button>
      </div>
      <div className="tcard">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Phòng ban</th>
              <th>SĐT Nội bộ</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => (
              <tr key={e.id}>
                <td><div className="ecell"><div className="av">{e.avatar}</div>{e.name}</div></td>
                <td>{e.dept}</td>
                <td className="mono">{e.phone}</td>
                <td><span className={`tag ${e.status==="online"?"tg":e.status==="busy"?"ty":e.status==="pending"?"tr":"tb"}`}>{STATUS_LABEL[e.status] || e.status}</span></td>
                <td>
                  <button className="btn btnp" onClick={() => onSel(e)}>Chi tiết</button>
                  {e.status === 'pending' && <button className="btn" style={{marginLeft:8, background:"var(--accent)", color:"#0a0d14", fontWeight:800}} onClick={() => onApprove(e)}>✓ Duyệt</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PermMatrixPage = ({ permissions, onUpdate }) => {
  const perms = Object.keys(INIT_CAN);
  const roles = ["admin", "manager", "employee"];
  
  const toggle = (p, r) => {
    const cur = permissions[p] || [];
    const next = cur.includes(r) ? cur.filter(x => x !== r) : [...cur, r];
    onUpdate({ ...permissions, [p]: next });
  };

  return (
    <div className="content">
      <div className="sec-title">🛡 Quản lý phân quyền</div>
      <div className="tcard">
        <table>
          <thead>
            <tr>
              <th>Quyền hạn</th>
              {roles.map(r => <th key={r} style={{textAlign:"center"}}>{ROLE_LABEL[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {perms.map(p => (
              <tr key={p}>
                <td style={{fontWeight:500}}>{CAN_LABELS[p]}</td>
                {roles.map(r => (
                  <td key={r} style={{textAlign:"center"}}>
                    <button 
                      className={`btn ${permissions[p]?.includes(r) ? "btnp" : "btng"}`}
                      onClick={() => toggle(p, r)}
                      style={{minWidth:44}}
                    >
                      {permissions[p]?.includes(r) ? "✅ Cấp" : "❌ Tắt"}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ReportsPage = () => {
  const [mode, setMode] = useState("day");
  const [from, setFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toISOString().slice(0,10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));
  const [filterUser, setFilterUser] = useState("all");
  const [filterDirection, setFilterDirection] = useState("all");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null); // { empName, period, notes[] }

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode, from, to, userId: filterUser, direction: filterDirection });
      const res = await api.get(`/reports/call-report?${params}`);
      setReport(res.data);
    } catch (err) {
      console.error("Report fetch error", err);
    } finally {
      setLoading(false);
    }
  }, [mode, from, to, filterUser, filterDirection]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Quick date setters
  const setQuick = (key) => {
    const now = new Date();
    const fmt = d => d.toISOString().slice(0,10);
    if (key === "today") { setFrom(fmt(now)); setTo(fmt(now)); setMode("day"); }
    else if (key === "7d") { const d = new Date(); d.setDate(d.getDate()-6); setFrom(fmt(d)); setTo(fmt(now)); setMode("day"); }
    else if (key === "4w") { const d = new Date(); d.setDate(d.getDate()-27); setFrom(fmt(d)); setTo(fmt(now)); setMode("week"); }
    else if (key === "month") { setFrom(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-01`); setTo(fmt(now)); setMode("day"); }
    else if (key === "year") { setFrom(`${now.getFullYear()}-01-01`); setTo(fmt(now)); setMode("month"); }
  };

  // Summary stats from totals
  const summary = useMemo(() => {
    if (!report) return { total: 0, closed: 0, missed: 0, rate: "0.0", slaViolations: 0 };
    const t = Object.values(report.totals || {}).reduce((acc, v) => ({
      total: acc.total + v.totalCalls, closed: acc.closed + v.closed, missed: acc.missed + v.missed,
      slaViolations: acc.slaViolations + (v.slaViolations || 0)
    }), { total: 0, closed: 0, missed: 0, slaViolations: 0 });
    return { ...t, rate: t.total > 0 ? (t.closed / t.total * 100).toFixed(1) : "0.0" };
  }, [report]);

  // Format period label for display
  const periodLabel = (p) => {
    if (mode === "day") { const [y,m,d] = p.split("-"); return `${d}/${m}`; }
    if (mode === "week") { const m = p.match(/^(\d{4})-W(\d{2})$/); return m ? `T${m[2]}/${m[1].slice(2)}` : p; }
    if (mode === "month") { const [y,m] = p.split("-"); const names = ["","Th1","Th2","Th3","Th4","Th5","Th6","Th7","Th8","Th9","Th10","Th11","Th12"]; return `${names[parseInt(m)]}/${y.slice(2)}`; }
    return p;
  };

  const fmtDur = (s) => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

  const RESULT_LABEL = { CLOSED: "Chốt ✓", NO_ANSWER: "Nhỡ ✗", CALLBACK: "Gọi lại", PENDING: "Chờ xử lý" };
  const RESULT_COLOR = { CLOSED: "var(--accent)", NO_ANSWER: "var(--danger)", CALLBACK: "var(--warn)", PENDING: "var(--text3)" };

  // Filtered employees
  const visibleEmps = useMemo(() => {
    if (!report) return [];
    if (filterUser === "all") return report.employees;
    return report.employees.filter(e => e.id === filterUser);
  }, [report, filterUser]);

  return (
    <div className="content">
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div>
          <div style={{fontSize:18,fontWeight:800}}>📊 Báo Cáo Cuộc Gọi & Ghi Chú</div>
          <div style={{fontSize:12,color:"var(--text3)",marginTop:3}}>Thống kê tổng hợp theo ngày, tháng, năm và nhân viên</div>
        </div>
      </div>

      {/* Direction Filter */}
      <div style={{display:"flex",gap:6,marginBottom:14}}>
        {[["all","📞 Tất cả cuộc gọi"],["INBOUND","📥 Cuộc gọi đến"],["OUTBOUND","📤 Cuộc gọi đi"]].map(([k,l])=>(
          <button key={k}
            onClick={()=>setFilterDirection(k)}
            style={{
              padding:"8px 16px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",
              border:filterDirection===k?"2px solid var(--accent)":"1px solid var(--border)",
              background:filterDirection===k?"rgba(34,211,160,.12)":"var(--surface)",
              color:filterDirection===k?"var(--accent)":"var(--text2)",
              transition:"all .2s ease"
            }}
          >{l}</button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="rep-toolbar">
        <div className="mode-toggle">
          {[["day","Ngày"],["week","Tuần"],["month","Tháng"],["year","Năm"]].map(([k,l])=>(
            <button key={k} className={`mode-btn ${mode===k?"on":""}`} onClick={()=>setMode(k)}>{l}</button>
          ))}
        </div>
        <input type="date" className="dinp" value={from} onChange={e=>setFrom(e.target.value)} />
        <span style={{color:"var(--text3)"}}>→</span>
        <input type="date" className="dinp" value={to} onChange={e=>setTo(e.target.value)} />
        <div className="qbtns">
          {[["today","Hôm nay"],["7d","7 ngày"],["4w","4 tuần"],["month","Tháng này"],["year","Năm nay"]].map(([k,l])=>(
            <button key={k} className="qb" onClick={()=>setQuick(k)}>{l}</button>
          ))}
        </div>
        <select className="sel2" value={filterUser} onChange={e=>setFilterUser(e.target.value)} style={{minWidth:140}}>
          <option value="all">Tất cả nhân viên</option>
          {report?.employees?.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="sgrid">
        <div className="scard cg"><div className="sic" style={{fontSize:19}}>{filterDirection==="INBOUND"?"📥":filterDirection==="OUTBOUND"?"📤":"📞"}</div><div className="sval">{loading?"...":summary.total}</div><div className="slbl">{filterDirection==="INBOUND"?"Cuộc gọi đến":filterDirection==="OUTBOUND"?"Cuộc gọi đi":"Tổng cuộc gọi"}</div></div>
        <div className="scard cb"><div className="sic" style={{fontSize:19}}>✅</div><div className="sval" style={{color:"var(--accent)"}}>{loading?"...":summary.closed}</div><div className="slbl">Chốt thành công</div></div>
        <div className="scard cr"><div className="sic" style={{fontSize:19}}>📵</div><div className="sval" style={{color:"var(--danger)"}}>{loading?"...":summary.missed}</div><div className="slbl">Cuộc gọi nhỡ</div></div>
        <div className="scard cp"><div className="sic" style={{fontSize:19}}>📈</div><div className="sval" style={{color:"var(--purple)"}}>{loading?"...":summary.rate}%</div><div className="slbl">Tỷ lệ chốt</div></div>
      </div>

      {/* Pivot Table */}
      {loading ? (
        <div className="nodata" style={{padding:40}}>
          <div style={{fontSize:20,marginBottom:8}}>⏳</div>
          Đang tải dữ liệu báo cáo...
        </div>
      ) : !report || report.periods.length === 0 ? (
        <div className="nodata" style={{padding:40}}>
          <div style={{fontSize:20,marginBottom:8}}>📭</div>
          Không có dữ liệu trong khoảng thời gian đã chọn
        </div>
      ) : (
        <div className="rep-pivot-wrap">
          <table className="rep-table">
            <thead>
              <tr>
                <th className="sticky">Nhân viên</th>
                {report.periods.map(p => <th key={p}>{periodLabel(p)}</th>)}
                <th style={{background:"rgba(34,211,160,.12)",color:"var(--accent)"}}>TỔNG</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmps.map(emp => {
                const empData = report.data[emp.id] || {};
                const empSla = report.slaData?.[emp.id] || {};
                const empTotal = Object.values(empData).reduce((a,v)=>({tc:a.tc+v.totalCalls,cl:a.cl+v.closed,ms:a.ms+v.missed,sla:a.sla+(v.slaViolations||0)}),{tc:0,cl:0,ms:0,sla:0});
                return (
                  <tr key={emp.id}>
                    <td className="sticky">
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <div className="av" style={{width:26,height:26,fontSize:10}}>{emp.name.split(" ").pop().charAt(0)}</div>
                        {emp.name}
                      </div>
                    </td>
                    {report.periods.map(p => {
                      const cell = empData[p];
                      const slaCell = empSla[p];
                      if (!cell && !slaCell) return <td key={p} style={{color:"var(--text3)",opacity:.4}}>—</td>;
                      const hasNotes = cell?.notes && cell.notes.length > 0;
                      const slaCount = slaCell?.count || cell?.slaViolations || 0;
                      return (
                        <td key={p}
                          style={{cursor:"pointer",position:"relative"}}
                          onClick={()=>setDetailModal({empName:emp.name,empId:emp.id,period:p,cell:cell||{totalCalls:0,closed:0,missed:0,pending:0,callback:0,totalDuration:0,notes:[]},slaCell:slaCell})}
                        >
                          <div style={{fontWeight:800,fontSize:14}}>{cell?.totalCalls||0}</div>
                          <div style={{fontSize:10,display:"flex",justifyContent:"center",gap:6,marginTop:2}}>
                            {(cell?.closed||0)>0&&<span className="rep-cell-good">✓{cell.closed}</span>}
                            {(cell?.missed||0)>0&&<span className="rep-cell-bad">✗{cell.missed}</span>}
                            {(cell?.callback||0)>0&&<span className="rep-cell-warn">↩{cell.callback}</span>}
                          </div>
                          {slaCount>0&&<div style={{fontSize:10,color:"var(--danger)",fontWeight:800,marginTop:1}}>🚨{slaCount}</div>}
                          {hasNotes&&<div style={{position:"absolute",top:3,right:5,fontSize:9,opacity:.6}}>📝</div>}
                        </td>
                      );
                    })}
                    <td style={{fontWeight:800,background:empTotal.sla>0?"rgba(248,113,113,.06)":"rgba(34,211,160,.05)"}}>
                      <div>{empTotal.tc}</div>
                      <div style={{fontSize:10,display:"flex",justifyContent:"center",gap:6,marginTop:2}}>
                        {empTotal.cl>0&&<span className="rep-cell-good">✓{empTotal.cl}</span>}
                        {empTotal.ms>0&&<span className="rep-cell-bad">✗{empTotal.ms}</span>}
                      </div>
                      {empTotal.sla>0&&<div style={{fontSize:10,color:"var(--danger)",fontWeight:800,marginTop:1}}>🚨{empTotal.sla} VP</div>}
                    </td>
                  </tr>
                );
              })}
              {/* Totals Row */}
              <tr className="total-row">
                <td className="sticky" style={{fontWeight:800}}>🏢 TỔNG CỘNG</td>
                {report.periods.map(p => {
                  const t = report.totals[p] || {};
                  const st = report.slaTotals?.[p] || {};
                  return (
                    <td key={p}
                      style={{cursor:"pointer"}}
                      onClick={()=>setDetailModal({empName:"TỔNG CỘNG",period:p,cell:t,slaCell:st})}
                    >
                      <div style={{fontWeight:800,fontSize:14}}>{t.totalCalls||0}</div>
                      <div style={{fontSize:10,display:"flex",justifyContent:"center",gap:6,marginTop:2}}>
                        {(t.closed||0)>0&&<span className="rep-cell-good">✓{t.closed}</span>}
                        {(t.missed||0)>0&&<span className="rep-cell-bad">✗{t.missed}</span>}
                      </div>
                      {(st.count||t.slaViolations||0)>0&&<div style={{fontSize:10,color:"var(--danger)",fontWeight:800,marginTop:1}}>🚨{st.count||t.slaViolations}</div>}
                    </td>
                  );
                })}
                <td style={{fontWeight:900,fontSize:16,background:summary.slaViolations>0?"rgba(248,113,113,.08)":"rgba(34,211,160,.1)"}}>
                  <div>{summary.total}</div>
                  {summary.slaViolations>0&&<div style={{fontSize:10,color:"var(--danger)",fontWeight:800,marginTop:2}}>🚨{summary.slaViolations} VP</div>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {detailModal && (
        <div className="mov" onClick={e=>e.target.className==="mov"&&setDetailModal(null)}>
          <div className="modal md">
            <div className="mhead">
              <div className="mav">📋</div>
              <div>
                <div style={{fontSize:16,fontWeight:800}}>Chi tiết: {detailModal.empName}</div>
                <div style={{fontSize:12,color:"var(--text2)"}}>
                  {mode==="day"?detailModal.period.split("-").reverse().join("/"):detailModal.period}
                  {" • "}{detailModal.cell.totalCalls} cuộc gọi
                </div>
              </div>
              <button className="mcls" onClick={()=>setDetailModal(null)}>×</button>
            </div>
            <div className="mbody">
              {/* Stats mini */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>
                <div className="pbox"><div className="pnum">{detailModal.cell.totalCalls}</div><div className="plbl">Tổng</div></div>
                <div className="pbox"><div className="pnum" style={{color:"var(--accent)"}}>{detailModal.cell.closed}</div><div className="plbl">Chốt</div></div>
                <div className="pbox"><div className="pnum" style={{color:"var(--danger)"}}>{detailModal.cell.missed}</div><div className="plbl">Nhỡ</div></div>
                <div className="pbox"><div className="pnum" style={{color:"var(--text2)"}}>{fmtDur(detailModal.cell.totalDuration||0)}</div><div className="plbl">Tổng TL</div></div>
                <div className="pbox" style={{borderColor:detailModal.slaCell?.count>0?"rgba(248,113,113,.4)":"var(--border)",background:detailModal.slaCell?.count>0?"rgba(248,113,113,.06)":""}}><div className="pnum" style={{color:"var(--danger)"}}>{detailModal.slaCell?.count||detailModal.cell.slaViolations||0}</div><div className="plbl">🚨 VP SLA</div></div>
              </div>

              {/* SLA Violations list */}
              {detailModal.slaCell && detailModal.slaCell.leads && detailModal.slaCell.leads.length > 0 && (
                <>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:10,color:"var(--danger)"}}>🚨 Vi phạm SLA ({detailModal.slaCell.leads.length})</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
                    {detailModal.slaCell.leads.map((l,i) => (
                      <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:"rgba(248,113,113,.06)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8}}>
                        <span style={{fontSize:16}}>🚫</span>
                        <div style={{flex:1}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:13}}>{l.phone}</span>
                            {l.name && <span style={{fontSize:12,color:"var(--text2)"}}>({l.name})</span>}
                            {l.empName && <span style={{fontSize:11,color:"var(--accent2)"}}>• {l.empName}</span>}
                          </div>
                          <div style={{fontSize:11,color:"var(--text3)",marginTop:3}}>
                            📅 Giao: {new Date(l.assignedAt).toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"})}
                            {" → "}
                            ⏰ Hạn: {new Date(l.deadline).toLocaleString("vi-VN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"2-digit"})}
                          </div>
                        </div>
                        <span style={{fontSize:11,fontWeight:800,color:"var(--danger)",background:"rgba(248,113,113,.12)",padding:"2px 8px",borderRadius:99}}>QUÁ HẠN</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Notes list */}
              {detailModal.cell.notes && detailModal.cell.notes.length > 0 ? (
                <>
                  <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>📝 Danh sách ghi chú ({detailModal.cell.notes.length})</div>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {detailModal.cell.notes.map((n,i) => (
                      <div key={i} className="icard">
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            <span style={{fontFamily:"var(--mono)",fontWeight:700,fontSize:13}}>{n.phone}</span>
                            {n.name && <span style={{fontSize:12,color:"var(--text2)"}}>({n.name})</span>}
                            {n.empName && <span style={{fontSize:11,color:"var(--accent2)"}}>• {n.empName}</span>}
                          </div>
                          <span style={{fontSize:11,fontWeight:700,color:RESULT_COLOR[n.result]||"var(--text3)"}}>{RESULT_LABEL[n.result]||n.result}</span>
                        </div>
                        <div style={{display:"flex",gap:12,fontSize:11,color:"var(--text3)",marginBottom:6}}>
                          <span>🕐 {new Date(n.calledAt).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}</span>
                          {n.duration>0&&<span>⏱ {fmtDur(n.duration)}</span>}
                        </div>
                        <div style={{fontSize:13,color:"var(--text)",background:"var(--surface)",padding:"8px 10px",borderRadius:6,lineHeight:1.6}}>{n.notes}</div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                !detailModal.slaCell?.leads?.length && <div className="nodata" style={{padding:20}}>
                  <div style={{fontSize:16,marginBottom:6}}>📭</div>
                  Không có ghi chú nào trong khoảng thời gian này
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION BELL (SLA)
// ─────────────────────────────────────────────────────────────────────────────
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/unread');
      setNotifications(res.data);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s for quick testing
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {}
  };

  const markAllAsRead = async () => {
    try {
      await api.post(`/notifications/read-all`);
      setNotifications([]);
      setIsOpen(false);
    } catch (error) {}
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ marginLeft: "auto", position: "relative" }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bellbtn"
      >
        <span>🔔</span>
        {notifications.length > 0 && (
          <span className="bellbadge">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-panel">
          <div className="notif-head">
            <h3 style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Thông báo hệ thống</h3>
            {notifications.length > 0 && (
              <button onClick={markAllAsRead} style={{ fontSize: 11, color: "var(--accent2)", background: "none", border: "none", cursor: "pointer" }}>
                Đã đọc tất cả
              </button>
            )}
          </div>
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: "var(--text3)", fontSize: 12 }}>
                Không có thông báo mới
              </div>
            ) : (
              notifications.map((notif) => (
                <div key={notif.id} className="notif-item unread" onClick={() => markAsRead(notif.id)}>
                  <div className="ndot" style={{ background: "var(--danger)" }}></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 4 }}>{notif.message}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{new Date(notif.createdAt).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  try {
    const [session, setSession] = useState(null); // { account, role }
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [error, setError] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [regForm, setRegForm] = useState({ name: "", email: "", phone: "", password: "" });
    const [regSuccess, setRegSuccess] = useState(false);
    const [toasts, setToasts] = useState([]);
    
    const addToast = (type, msg) => {
      const id = Date.now() + Math.random();
      setToasts(p => [...p, { id, type, msg, ts: Date.now() }]);
    };
    const removeToast = id => setToasts(p => p.filter(t => t.id !== id));
    const [page, setPage] = useState("dashboard");
    const [selEmp, setSelEmp] = useState(null);
    const [showCallLog, setShowCallLog] = useState(false);
    const [showEmpWizard, setShowEmpWizard] = useState(false);
    const [sessionLogs, setSessionLogs] = useState([]);

    // State
    const [accounts, setAccounts] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [calls, setCalls] = useState([]);
    const [assignments, setAssignments] = useState(INIT_ASSIGNMENTS);
    const [permissions, setPermissions] = useState(INIT_CAN);
    const [openTr, setOpenTr] = useState(null);
    const [transcripts, setTranscripts] = useState({});
    const [editCall, setEditCall] = useState(null);
    const [deleteCallId, setDeleteCallId] = useState(null);

    const handleNewCall = (newCall) => {
      const mapped = {
        ...newCall, id: newCall.id, empId: newCall.userId, phone: newCall.customerPhone,
        date: new Date(newCall.calledAt).toLocaleDateString("vi-VN"),
        time: new Date(newCall.calledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        endTime: new Date(new Date(newCall.calledAt).getTime() + (newCall.durationSeconds || 0) * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
        duration: `${Math.floor((newCall.durationSeconds || 0)/60)}:${String((newCall.durationSeconds || 0)%60).padStart(2,"0")}`,
        hasTr: false
      };
      setCalls(prev => [mapped, ...prev]);
      setSessionLogs(prev => [mapped, ...prev].slice(0,5));
    };

    const handleNewEmp = (newEmp) => {
      const mapped = {
        id: newEmp.id, name: newEmp.name, dept: newEmp.department || "CSKH", 
        status: newEmp.status || "online", phone: newEmp.phoneNumber || "", 
        joinDate: new Date(newEmp.joinDate).toLocaleDateString("vi-VN")
      };
      setEmployees(prev => [...prev, mapped]);
      setShowEmpWizard(false);
    };

    const handleLogin = async (e) => {
      e.preventDefault();
      setError("");
      try {
        const res = await api.post("/auth/login", {
          email: loginForm.username.includes("@") ? loginForm.username : `${loginForm.username}@clinic.com`,
          password: loginForm.password
        });
        const { token, user } = res.data;
        localStorage.setItem("token", token);
        const mappedRole = user.role === "ADMIN" ? "admin" : "employee";
        const sessionUser = { ...user, role: mappedRole, avatar: user.name.substring(0,2).toUpperCase() };
        localStorage.setItem("session", JSON.stringify(sessionUser));
        setSession(sessionUser);
        if (mappedRole === "admin") setPage("dashboard");
        else setPage("my_kpi");
      } catch (err) {
        setError(err.response?.data?.message || "Đăng nhập thất bại");
      }
    };

    const handleLogout = () => {
       localStorage.removeItem("token");
       localStorage.removeItem("session");
       setSession(null);
       setPage("dashboard");
    };

    const handleDeleteCall = async () => {
      if (!deleteCallId) return;
      if (deleteCallId.startsWith("call_")) {
        setCalls(prev => prev.filter(c => c.id !== deleteCallId));
        setDeleteCallId(null);
        return;
      }
      try {
        await api.delete(`/calls/${deleteCallId}`);
        setCalls(prev => prev.filter(c => c.id !== deleteCallId));
        setDeleteCallId(null);
      } catch (err) {
        console.error("Delete call error", err);
        addToast("overdue", "Lỗi khi xoá cuộc gọi: " + (err.response?.data?.message || err.message));
      }
    };

    useEffect(() => {
      const saved = localStorage.getItem("session");
      if (saved) {
        try {
          setSession(JSON.parse(saved));
        } catch(e) {
          localStorage.removeItem("session");
        }
      }
    }, []);

    // Auto-login from URL (?u=...&p=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("u");
    const p = params.get("p");
    if (u && p && !session) {
      console.log("[Auto-Login] Attempting with:", u);
      api.post("/auth/login", { email: u, password: p })
        .then(res => {
          const { token, user } = res.data;
          const mappedRole = user.role.toLowerCase() === "admin" ? "admin" : (user.role.toLowerCase() === "manager" ? "manager" : "employee");
          const sessionUser = { ...user, role: mappedRole };
          localStorage.setItem("token", token);
          localStorage.setItem("session", JSON.stringify(sessionUser));
          setSession(sessionUser);
          // Clean up URL
          const newUrl = window.location.origin + window.location.pathname;
          window.history.replaceState({}, document.title, newUrl);
        })
        .catch(err => console.error("[Auto-Login] Failed:", err));
    }
  }, [session]);

  const fetchAllData = useCallback(async () => {
      if (!session) return;
      try {
        console.log("Fetching live data...");
        
        // Fetch Calls
        api.get("/calls?limit=100").then(res => {
          if (res.data?.calls) {
            const mapped = res.data.calls.map(c => ({
              ...c, id: c.id, empId: c.userId, phone: c.customerPhone,
              date: new Date(c.calledAt).toLocaleDateString("vi-VN"),
              time: new Date(c.calledAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
              endTime: new Date(new Date(c.calledAt).getTime() + (c.durationSeconds || 0) * 1000).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
              duration: `${Math.floor((c.durationSeconds || 0)/60)}:${String((c.durationSeconds || 0)%60).padStart(2,"0")}`,
              hasTr: c.transcriptStatus === "DONE"
            }));
            setCalls(mapped);
          }
        }).catch(e => console.error("Calls fetch error", e));

        // Fetch Employees (Admin only)
        if (session.role === "admin") {
          api.get("/reports/kpi").then(res => {
            if (res.data) {
              const mapped = res.data.map(u => ({
                id: u.id, name: u.name, dept: u.department || "CSKH", status: u.status || "online", phone: u.phoneNumber || "N/A", joinDate: u.joinDate ? new Date(u.joinDate).toLocaleDateString("vi-VN") : "N/A"
              }));
              setEmployees(mapped);
            }
          }).catch(e => {
            console.error("Staff fetch error", e);
            // Fallback to minimal data if needed
          });
        }
      } catch (err) {
        console.error("General API Error:", err);
        if (err.response?.status === 401) handleLogout();
      }
    }, [session]);

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    const fetchTranscript = async (callId) => {
       try {
          const res = await api.get(`/calls/${callId}`);
          const segments = res.data?.segments || [];
          const text = segments.map(s => {
            const time = typeof s.startTime === 'number' ? s.startTime.toFixed(1) : s.startTime;
            return `[${time}s] ${s.speaker || 'Unknown'}: ${s.text}`;
          }).join("\n\n") || "Chưa có nội dung transcript.";
          setTranscripts(prev => ({ ...prev, [callId]: text }));
       } catch (err) {
          console.error("TR fetch error", err);
          setTranscripts(prev => ({ ...prev, [callId]: "Lỗi khi tải transcript." }));
       }
    };

    useEffect(() => {
       if (openTr && !transcripts[openTr]) fetchTranscript(openTr);
    }, [openTr]);

    const handleReset = () => {
       localStorage.clear();
       window.location.reload();
    };

    if (!session) {
      if (isRegistering) {
        return (
          <div className="lpage">
            <style>{STYLES}</style>
            <div className="login-hero">
              <div className="lorb" style={{width:800,height:800,background:"var(--accent)",top:"10%",left:"10%"}}/>
            </div>
            <div className="login-right">
              <div className="lorb" style={{width:600,height:600,background:"var(--accent2)",bottom:"-20%",right:"-10%"}}/>
              <div className="lbox">
                <div className="lcard">
                  <div className="llogoic"><img src="/logo.png" alt="Logo" style={{width:"80%",height:"80%",objectFit:"contain"}}/></div>
                <h2 style={{fontSize:22,fontWeight:800,marginBottom:6}}>Đăng ký tài khoản</h2>
                {regSuccess ? (
                  <div style={{textAlign:"center", padding:"20px 0"}}>
                    <div style={{fontSize:40,marginBottom:10}}>✅</div>
                    <p style={{fontSize:14,color:"var(--accent)",fontWeight:700}}>Đăng ký thành công!</p>
                    <p style={{fontSize:12,color:"var(--text3)",marginTop:10,marginBottom:20}}>Tài khoản của bạn đang chờ Admin phê duyệt.</p>
                    <button className="lbtn" onClick={()=>{setIsRegistering(false);setRegSuccess(false);}}>Về trang Đăng nhập</button>
                  </div>
                ) : (
                  <>
                  <p style={{fontSize:12,color:"var(--text3)",marginBottom:20}}>Điền thông tin để tạo tài khoản nhân viên mới</p>
                  {error && <div className="lerr">{error}</div>}
                  <form onSubmit={async(e)=>{
                    e.preventDefault(); setError("");
                    try {
                      const res = await api.post("/auth/register", {
                         name: regForm.name, email: regForm.email, phoneNumber: regForm.phone, password: regForm.password, role: "USER"
                      });
                      setRegSuccess(true);
                      setRegForm({name:"",email:"",phone:"",password:""});
                    } catch(err) {
                      setError(err.response?.data?.message || "Đăng ký thất bại");
                    }
                  }}>
                    <div className="fg"><input required className="linp" placeholder="Họ và tên" value={regForm.name} onChange={e=>setRegForm({...regForm,name:e.target.value})} autoFocus /></div>
                    <div className="fg"><input required type="email" className="linp" placeholder="Email" value={regForm.email} onChange={e=>setRegForm({...regForm,email:e.target.value})} /></div>
                    <div className="fg"><input required className="linp" placeholder="Số điện thoại" value={regForm.phone} onChange={e=>setRegForm({...regForm,phone:e.target.value})} /></div>
                    <div className="fg"><input required className="linp" type="password" placeholder="Mật khẩu" value={regForm.password} onChange={e=>setRegForm({...regForm,password:e.target.value})} /></div>
                    <button className="lbtn" type="submit">ĐĂNG KÝ</button>
                  </form>
                  <div style={{marginTop:16,textAlign:"center"}}>
                    <button onClick={()=>{setIsRegistering(false);setError("");}} type="button" style={{background:"none",border:"none",color:"var(--text3)",fontSize:12,cursor:"pointer"}}>Đã có tài khoản? Đăng nhập</button>
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
      }
      return (
        <div className="lpage">
          <style>{STYLES}</style>
          <div className="login-hero">
            <div className="lorb" style={{width:800,height:800,background:"var(--accent)",top:"10%",left:"10%"}}/>
          </div>
          <div className="login-right">
            <div className="lorb" style={{width:600,height:600,background:"var(--accent2)",bottom:"-20%",right:"-10%"}}/>
            <div className="lbox">
              <div className="lcard">
                <div className="llogoic"><img src="/logo.png" alt="Logo" style={{width:"80%",height:"80%",objectFit:"contain"}}/></div>
              <h2 style={{fontSize:22,fontWeight:800,marginBottom:6}}>Hệ Thống Dr.Nguyễn Hạ</h2>
              <p style={{fontSize:12,color:"var(--text3)",marginBottom:20}}>Đăng nhập để quản lý cuộc gọi và hiệu suất</p>
              {error && <div className="lerr">{error}</div>}
              <form onSubmit={handleLogin}>
                <div className="fg"><input className="linp" placeholder="Email đăng nhập" value={loginForm.username} onChange={e=>setLoginForm({...loginForm,username:e.target.value})} autoFocus /></div>
                <div className="fg"><input className="linp" type="password" placeholder="Mật khẩu" value={loginForm.password} onChange={e=>setLoginForm({...loginForm,password:e.target.value})} /></div>
                <button className="lbtn" type="submit">ĐĂNG NHẬP</button>
              </form>
              <div style={{marginTop:16,textAlign:"center"}}>
                <button onClick={()=>{setIsRegistering(true);setError("");}} type="button" style={{background:"none",border:"none",color:"var(--accent)",fontSize:13,fontWeight:700,cursor:"pointer", marginBottom:12}}>Chưa có tài khoản? Đăng ký</button><br/>
                <button onClick={handleReset} type="button" style={{background:"none",border:"none",color:"var(--text3)",fontSize:11,cursor:"pointer"}}>Gặp sự cố? Nhấn để đặt lại</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
    }

    const role = session.role;
    const can = (perm) => permissions[perm]?.includes(role);

    const NAV = [
      { id: "dashboard", lb: "Bảng điều khiển", ic: "📊", show: can("viewDashboard") },
      { id: "my_kpi", lb: "KPI Của tôi", ic: "🎯", show: role === "employee" },
      { id: "my_tasks", lb: "Nhiệm vụ", ic: "📋", show: role === "employee" },
      { id: "my_calls", lb: "Cuộc gọi của tôi", ic: "📞", show: role === "employee" },
      null,
      { id: "all_calls", lb: "Tất cả cuộc gọi", ic: "🌍", show: can("viewAllCalls") },
      { id: "employees", lb: "Quản lý nhân viên", ic: "👥", show: can("viewAllEmployees") },
      { id: "reports", lb: "Báo cáo", ic: "📈", show: can("viewReports") },
      null,
      { id: "accounts", lb: "Tài khoản", ic: "🔑", show: can("manageAccounts") },
      { id: "permissions", lb: "Phân quyền", ic: "🛡️", show: can("manageAccounts") },
    ];

    return (
      <>
        <style>{STYLES}</style>
        <div className="app">
          <aside className="sb">
            <div className="sblogo">
              <div className="sblogow">
                <div className="sblogoic"><img src="/logo.png" alt="Logo" /></div>
                <div>
                  <div style={{fontSize:13,fontWeight:800,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>Dr.Nguyễn Hạ</div>
                  <div style={{fontSize:10,color:"var(--text3)"}}>Quản lý cuộc gọi</div>
                </div>
              </div>
            </div>
            <nav className="sbnav">
              {NAV.map((n, i) => {
                if (n === null) return <div key={i} className="sbnlbl" style={{marginTop:16}} />;
                if (!n.show) return null;
                return (
                  <div key={n.id} className={`sbnitem ${page===n.id?"act":""}`} onClick={()=>setPage(n.id)}>
                    <span className="sic">{n.ic}</span> <span>{n.lb}</span>
                  </div>
                );
              })}
            </nav>
            <div className="sbfoot">
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
                <div className="sbuav" style={{background:ROLE_COLOR[role],color:role==="admin"?"#fff":"#0a0d14"}}>{session.avatar}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{session.name}</div>
                  <div style={{fontSize:10,color:"var(--text3)"}}>{ROLE_LABEL[role]}</div>
                </div>
              </div>
              <button className="sblogout" onClick={handleLogout} style={{width:"100%"}}>🚪 Đăng xuất</button>
            </div>
          </aside>

          <main className="main">
            <div className="toast-wrap">
              {toasts.map(t => <ToastItem key={t.id} t={t} onDismiss={removeToast} />)}
            </div>
            <div className="topbar">
              <div className="ptitle">{NAV.find(n => n && n.id === page)?.lb || "Tổng quan"}</div>
              {role === 'admin' && (
                <button 
                  className="btn btnp" 
                  style={{ background: "#4ade80", color: "#000" }}
                  onClick={() => {
                    const phone = prompt("Nhập số điện thoại khách hàng:", "09");
                    if (!phone) return;
                    const name = prompt("Nhập tên khách hàng:", "");
                    const empList = accounts.filter(a=>a.role==='employee').map(a => a.name + ' = ' + a.id).join('\n');
                    const emp = prompt(`Chọn nhân viên phụ trách:\n${empList}`, "");
                    if (!emp) return;
                    const sla = prompt("Thời gian tối đa phải gọi (phút):", "5");
                    
                    api.post('/leads', { customerPhone: phone, customerName: name, assignedToId: emp, slaMinutes: parseFloat(sla||1) })
                      .then(() => addToast("assigned", `✅ Đã giao SĐT ${phone} cho ${emp}!\nHệ thống sẽ tự động quét và báo chuông "Quá Hạn" nếu NV chưa gọi.`))
                      .catch(e => addToast("overdue", "Lỗi: " + (e.response?.data?.message || e.message)));
                  }}
                >📋 Giao số điện thoại</button>
              )}
              <NotificationBell />
            </div>

            {!can("viewDashboard") && page === "dashboard" ? <AccessDenied requiredRole="manager" /> : page === "dashboard" && <DashPage allCalls={calls} />}
            {page === "my_kpi" && <MyKPIPage account={session} calls={calls} employees={employees} assignments={assignments} />}
            {page === "my_tasks" && <MyTasksPage account={session} assignments={assignments} employees={employees} calls={calls} onUpdateTask={(id, data) => setAssignments(p => p.map(a => a.id === id ? {...a, ...data} : a))} />}
            {page === "my_calls" && <MyCallsPage account={session} calls={calls} openTr={openTr} setOpenTr={setOpenTr} transcripts={transcripts} setEditCall={setEditCall} can={can} onDeleteCall={setDeleteCallId} />}
            
            {!can("viewAllCalls") && page === "all_calls" ? <AccessDenied requiredRole="manager" /> : page === "all_calls" && <AllCallsPage calls={calls} employees={employees} openTr={openTr} setOpenTr={setOpenTr} transcripts={transcripts} onAdd={()=>setShowCallLog(true)} setEditCall={setEditCall} can={can} onDeleteCall={setDeleteCallId} />}
            {!can("viewAllEmployees") && page === "employees" ? <AccessDenied requiredRole="manager" /> : page === "employees" && <EmpPage employees={employees} allCalls={calls} onSel={setSelEmp} onAdd={()=>setShowEmpWizard(true)} onApprove={async(emp) => {
              try { await api.patch(`/auth/users/${emp.id}/status`, {status:'online'}); addToast("called", `Đã phê duyệt tài khoản ${emp.name}`); fetchAllData(); } catch(e){ addToast('overdue', "Lỗi duyệt: " + (e.response?.data?.message || e.message)); }
            }} />}
            
            {!can("manageAccounts") && page === "accounts" ? <AccessDenied requiredRole="admin" /> : page === "accounts" && <AccountsPage accounts={accounts} employees={employees} />}
            {!can("manageAccounts") && page === "permissions" ? <AccessDenied requiredRole="admin" /> : page === "permissions" && <PermMatrixPage permissions={permissions} onUpdate={setPermissions} />}
            {!can("viewReports") && page === "reports" ? <AccessDenied requiredRole="manager" /> : page === "reports" && <ReportsPage />}
            
          </main>
        </div>

        {selEmp && <EmpDetailModal emp={selEmp} calls={calls} onClose={() => setSelEmp(null)} openTr={openTr} setOpenTr={setOpenTr} transcripts={transcripts} />}

        {showCallLog && <CallLogModal employees={employees} onClose={()=>setShowCallLog(false)} onSave={handleNewCall} sessionLogs={sessionLogs} addToast={addToast} />}
        {showEmpWizard && <EmployeeWizard onClose={()=>setShowEmpWizard(false)} onSave={handleNewEmp} addToast={addToast} />}
        {editCall && <EditCallModal call={editCall} employees={employees} onClose={() => setEditCall(null)} addToast={addToast} onSave={async (updates) => {
          setCalls(prev => prev.map(c => c.id === editCall.id ? { ...c, notes: updates.note, note: updates.note, status: updates.status } : c));
          setEditCall(null);
        }} />}
      </>
    );
  } catch (err) {
    return (
      <div style={{color:"red",padding:24,background:"#fff",minHeight:"100vh"}}>
        <h1 style={{fontSize:24,marginBottom:16}}>Hệ thống gặp lỗi nghiêm trọng:</h1>
        <div style={{background:"#fef2f2",padding:16,border:"1px solid #fee2e2",borderRadius:8}}>
          <p style={{fontWeight:800,marginBottom:8}}>{err.name}: {err.message}</p>
          <pre style={{fontSize:11,lineHeight:1.6,overflowX:"auto"}}>{err.stack}</pre>
        </div>
        <p style={{marginTop:16,color:"#666"}}>Vui lòng báo lại lỗi này cho kỹ thuật.</p>
      </div>
    );
  }
}
