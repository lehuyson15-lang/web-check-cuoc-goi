import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

const DISPATCH_SOURCES = [
  "Facebook Ads", "Bác Sĩ", "Khách riêng", "Trợ lý Bác Sĩ",
  "Nick phụ Bác Sĩ", "Seeding", "Cộng Tác Viên", "Hotline", "Tiktok", "Instagram"
];

const STATUS_LABEL = { PENDING: "Chờ gọi", CALLED: "Đã gọi", CANCELLED: "Đã huỷ" };
const STATUS_ICON = { PENDING: "⏳", CALLED: "✅", CANCELLED: "❌" };
const STATUS_COLOR = { PENDING: "var(--accent2)", CALLED: "var(--accent)", CANCELLED: "var(--danger)" };

// ── Queue Management Modal ──────────────────────────────────────────────────
const QueueModal = ({ queue, allUsers, onClose, onSave, api, addToast }) => {
  const isNew = !queue;
  const [name, setName] = useState(queue?.name || "");
  const [members, setMembers] = useState(
    queue?.members?.map(m => ({
      userId: m.userId,
      name: m.user.name,
      status: m.user.status,
      sortOrder: m.sortOrder,
      isActive: m.isActive
    })) || []
  );
  const [saving, setSaving] = useState(false);

  const availableUsers = allUsers.filter(u => !members.find(m => m.userId === u.id));

  const addMember = (user) => {
    setMembers(prev => [...prev, {
      userId: user.id,
      name: user.name,
      status: user.status,
      sortOrder: prev.length,
      isActive: true
    }]);
  };

  const removeMember = (userId) => {
    setMembers(prev => prev.filter(m => m.userId !== userId).map((m, i) => ({ ...m, sortOrder: i })));
  };

  const toggleMember = (userId) => {
    setMembers(prev => prev.map(m => m.userId === userId ? { ...m, isActive: !m.isActive } : m));
  };

  const moveUp = (idx) => {
    if (idx <= 0) return;
    setMembers(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr.map((m, i) => ({ ...m, sortOrder: i }));
    });
  };

  const moveDown = (idx) => {
    if (idx >= members.length - 1) return;
    setMembers(prev => {
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr.map((m, i) => ({ ...m, sortOrder: i }));
    });
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast("info", "Vui lòng nhập tên hàng đợi");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const res = await api.post('/dispatch/queues', {
          name: name.trim(),
          memberIds: members.map(m => m.userId)
        });
        onSave(res.data);
      } else {
        const res = await api.put(`/dispatch/queues/${queue.id}`, {
          name: name.trim(),
          members: members.map(m => ({
            userId: m.userId,
            sortOrder: m.sortOrder,
            isActive: m.isActive
          }))
        });
        onSave(res.data);
      }
    } catch (err) {
      addToast("overdue", "Lỗi: " + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mov" onClick={e => e.target.className === "mov" && onClose()}>
      <div className="modal md" style={{ maxWidth: 640 }}>
        <div className="mhead">
          <div className="mav" style={{ fontSize: 16 }}>{isNew ? "➕" : "⚙️"}</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800 }}>{isNew ? "Tạo hàng đợi mới" : "Chỉnh sửa hàng đợi"}</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Quản lý thứ tự nhận SĐT của nhân viên</div>
          </div>
          <button className="mcls" onClick={onClose}>×</button>
        </div>
        <div className="mbody" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          <div className="fg">
            <label className="flbl">Tên hàng đợi</label>
            <input className="finp" value={name} onChange={e => setName(e.target.value)} placeholder="VD: Đội CSKH, Đội Tư vấn..." />
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👥 Thành viên ({members.length})</span>
            <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>Kéo thả hoặc dùng nút ▲▼ để sắp thứ tự</span>
          </div>

          {members.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', background: 'var(--surface)', borderRadius: 10, marginBottom: 12 }}>
              Chưa có thành viên. Thêm nhân viên bên dưới.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {members.map((m, idx) => (
                <div key={m.userId} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                  background: m.isActive ? 'var(--surface)' : 'rgba(107,114,128,.08)',
                  border: `1px solid ${m.isActive ? 'var(--border)' : 'rgba(107,114,128,.2)'}`,
                  borderRadius: 10, opacity: m.isActive ? 1 : 0.5, transition: 'all .2s'
                }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#0a0d14', flexShrink: 0
                  }}>
                    {idx + 1}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {m.status === 'offline' ? '🔴 Offline' : m.status === 'busy' ? '🟡 Bận' : '🟢 Online'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 3 }}>
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: 'var(--text2)', fontSize: 12 }}>▲</button>
                    <button onClick={() => moveDown(idx)} disabled={idx === members.length - 1}
                      style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 6px', cursor: 'pointer', color: 'var(--text2)', fontSize: 12 }}>▼</button>
                  </div>
                  <button onClick={() => toggleMember(m.userId)}
                    style={{
                      background: m.isActive ? 'rgba(34,211,160,.1)' : 'rgba(248,113,113,.08)',
                      border: `1px solid ${m.isActive ? 'rgba(34,211,160,.25)' : 'rgba(248,113,113,.2)'}`,
                      borderRadius: 8, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', color: m.isActive ? 'var(--accent)' : 'var(--danger)',
                      whiteSpace: 'nowrap'
                    }}>
                    {m.isActive ? "✓ Bật" : "✗ Tắt"}
                  </button>
                  <button onClick={() => removeMember(m.userId)}
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>×</button>
                </div>
              ))}
            </div>
          )}

          {availableUsers.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>
                ➕ Thêm nhân viên
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {availableUsers.map(u => (
                  <button key={u.id} onClick={() => addMember(u)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                      cursor: 'pointer', color: 'var(--text)', fontSize: 12, fontWeight: 600,
                      transition: 'all .15s', fontFamily: 'var(--font)'
                    }}>
                    <span style={{ fontSize: 14 }}>+</span> {u.name}
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>
                      {u.status === 'offline' ? '🔴' : '🟢'}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="mfooter">
          <button className="btn btng" onClick={onClose}>Huỷ</button>
          <button className="btn btnp" onClick={handleSave} disabled={saving}>
            {saving ? "⏳ Đang lưu..." : isNew ? "✨ Tạo hàng đợi" : "💾 Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Dispatch Page ──────────────────────────────────────────────────────
const DispatchPage = ({ api, addToast, can }) => {
  const [queues, setQueues] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [showQueueModal, setShowQueueModal] = useState(false);
  const [editQueue, setEditQueue] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Form
  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [source, setSource] = useState(DISPATCH_SOURCES[0]);
  const [dispatching, setDispatching] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkText, setBulkText] = useState("");

  const phoneRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [qRes, uRes, hRes] = await Promise.all([
        api.get('/dispatch/queues'),
        api.get('/dispatch/users'),
        api.get('/dispatch/history?limit=30')
      ]);
      setQueues(qRes.data);
      setAllUsers(uRes.data);
      setHistory(hRes.data);
      if (qRes.data.length > 0 && !selectedQueue) {
        setSelectedQueue(qRes.data[0].id);
      }
    } catch (err) {
      console.error("Dispatch fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentQueue = queues.find(q => q.id === selectedQueue);

  // ── Handle UP (single) ─────────────────────────────────────────────────
  const handleUp = async () => {
    if (!phone.trim()) {
      addToast("info", "Vui lòng nhập số điện thoại");
      phoneRef.current?.focus();
      return;
    }
    if (!selectedQueue) {
      addToast("info", "Vui lòng chọn hàng đợi");
      return;
    }

    setDispatching(true);
    try {
      const res = await api.post('/dispatch/up', {
        customerPhone: phone.trim(),
        customerName: customerName.trim() || undefined,
        source,
        queueId: selectedQueue,
        slaMinutes: 15
      });

      setLastResult(res.data);
      addToast("assigned", res.data.message);
      setPhone("");
      setCustomerName("");
      phoneRef.current?.focus();

      // Refresh data
      fetchData();
    } catch (err) {
      addToast("overdue", err.response?.data?.error || "Lỗi khi chia SĐT");
    } finally {
      setDispatching(false);
    }
  };

  // ── Handle Bulk UP ─────────────────────────────────────────────────────
  const handleBulkUp = async () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      addToast("info", "Nhập danh sách SĐT (mỗi dòng 1 số)");
      return;
    }
    if (!selectedQueue) {
      addToast("info", "Chọn hàng đợi trước");
      return;
    }

    const phones = lines.map(line => {
      const parts = line.split(/[,\t|]+/);
      return { phone: parts[0]?.trim(), name: parts[1]?.trim() || undefined };
    }).filter(p => p.phone);

    setDispatching(true);
    try {
      const res = await api.post('/dispatch/up-bulk', {
        phones,
        queueId: selectedQueue,
        source,
        slaMinutes: 15
      });

      const ok = res.data.results.filter(r => r.assignedTo);
      const fail = res.data.results.filter(r => r.error);
      addToast("assigned", `✅ Đã chia ${ok.length}/${phones.length} SĐT thành công${fail.length ? `. ${fail.length} lỗi.` : ''}`);
      setBulkText("");
      fetchData();
    } catch (err) {
      addToast("overdue", err.response?.data?.error || "Lỗi bulk dispatch");
    } finally {
      setDispatching(false);
    }
  };

  // ── Handle status update ──────────────────────────────────────────────
  const handleStatusUpdate = async (dispatchId, status) => {
    try {
      await api.patch(`/dispatch/${dispatchId}/status`, { status });
      setHistory(prev => prev.map(d => d.id === dispatchId ? { ...d, status } : d));
      addToast("called", `Cập nhật trạng thái → ${STATUS_LABEL[status]}`);
    } catch (err) {
      addToast("overdue", "Lỗi cập nhật");
    }
  };

  // ── Toggle member isActive (bật/tắt chia số) ─────────────────────────
  const handleToggleMember = async (memberId, currentIsActive) => {
    if (!currentQueue) return;
    try {
      const updatedMembers = currentQueue.members.map(m => ({
        userId: m.userId,
        sortOrder: m.sortOrder,
        isActive: m.id === memberId ? !currentIsActive : m.isActive
      }));
      await api.put(`/dispatch/queues/${currentQueue.id}`, {
        name: currentQueue.name,
        members: updatedMembers
      });
      const toggledMember = currentQueue.members.find(m => m.id === memberId);
      addToast(
        currentIsActive ? "info" : "called",
        currentIsActive
          ? `⏸ Đã tắt chia số cho ${toggledMember?.user?.name || 'NV'}`
          : `▶ Đã bật lại chia số cho ${toggledMember?.user?.name || 'NV'}`
      );
      fetchData();
    } catch (err) {
      addToast("overdue", "Lỗi cập nhật trạng thái NV");
    }
  };

  // ── Delete queue ──────────────────────────────────────────────────────
  const handleDeleteQueue = async (queueId) => {
    if (!window.confirm("Bạn chắc chắn muốn xoá hàng đợi này?")) return;
    try {
      await api.delete(`/dispatch/queues/${queueId}`);
      addToast("called", "Đã xoá hàng đợi");
      if (selectedQueue === queueId) setSelectedQueue(null);
      fetchData();
    } catch (err) {
      addToast("overdue", "Lỗi xoá hàng đợi");
    }
  };

  // ── Countdown formatter ───────────────────────────────────────────────
  const fmtCountdown = (deadline) => {
    const ms = new Date(deadline).getTime() - now;
    if (ms <= 0) return { text: "QUÁ HẠN", cls: "danger" };
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return {
      text: `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`,
      cls: m < 3 ? "warn" : "ok"
    };
  };

  if (loading) {
    return (
      <div className="content">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60, color: 'var(--text3)' }}>
          <span style={{ fontSize: 24, marginRight: 12 }}>⏳</span> Đang tải dữ liệu điều phối...
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>📲 Điều Phối SĐT Tự Động</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 3 }}>Nhập số → Bấm UP → Hệ thống tự chia đều cho nhân viên xoay vòng</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btng" onClick={() => setBulkMode(!bulkMode)}>
            {bulkMode ? "📱 Nhập lẻ" : "📋 Nhập nhiều"}
          </button>
          <button className="btn btnp" onClick={() => { setEditQueue(null); setShowQueueModal(true); }}>
            ➕ Tạo hàng đợi
          </button>
        </div>
      </div>

      {/* ── QUEUE SELECTOR ── */}
      {queues.length === 0 ? (
        <div style={{
          padding: 40, textAlign: 'center', background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 16, marginBottom: 18
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Chưa có hàng đợi nào</div>
          <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Tạo hàng đợi đầu tiên để bắt đầu chia SĐT cho nhân viên</div>
          <button className="btn btnp" onClick={() => { setEditQueue(null); setShowQueueModal(true); }}>
            ➕ Tạo hàng đợi ngay
          </button>
        </div>
      ) : (
        <>
          {/* Queue tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {queues.map(q => (
              <div key={q.id}
                onClick={() => setSelectedQueue(q.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                  background: selectedQueue === q.id ? 'rgba(212,175,55,.12)' : 'var(--bg2)',
                  border: `2px solid ${selectedQueue === q.id ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 12, cursor: 'pointer', transition: 'all .2s', minWidth: 140
                }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: selectedQueue === q.id ? 'var(--accent)' : 'var(--text)' }}>{q.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{q.members.length} NV · {q._count?.dispatches || 0} đã chia</div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={e => { e.stopPropagation(); setEditQueue(q); setShowQueueModal(true); }}
                    style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: 'var(--text3)', padding: 2 }}>⚙️</button>
                  <button onClick={e => { e.stopPropagation(); handleDeleteQueue(q.id); }}
                    style={{ background: 'none', border: 'none', fontSize: 14, cursor: 'pointer', color: 'var(--danger)', padding: 2 }}>🗑</button>
                </div>
              </div>
            ))}
          </div>

          {/* ── MAIN LAYOUT ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: 16, alignItems: 'start' }}>
            {/* LEFT PANEL — Input */}
            <div>
              {/* Input Card */}
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16,
                padding: 20, marginBottom: 14
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>📱</span>
                  <span>{bulkMode ? "Nhập nhiều SĐT" : "Nhập SĐT khách hàng"}</span>
                </div>

                {!bulkMode ? (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <input
                        ref={phoneRef}
                        className="finp"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleUp()}
                        placeholder="0912 345 678"
                        style={{
                          fontSize: 20, fontWeight: 800, fontFamily: 'var(--mono)',
                          padding: '14px 16px', textAlign: 'center', letterSpacing: 2,
                          background: 'var(--surface)', borderRadius: 12
                        }}
                        autoFocus
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <input className="finp" value={customerName} onChange={e => setCustomerName(e.target.value)}
                        placeholder="Tên khách hàng (tuỳ chọn)" style={{ fontSize: 13 }} />
                    </div>
                  </>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    <textarea
                      className="ftextarea"
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      placeholder={"Mỗi dòng 1 SĐT (có thể thêm tên sau dấu phẩy)\nVD:\n0912345678, Nguyễn Văn A\n0923456789, Trần Thị B\n0934567890"}
                      style={{ minHeight: 140, fontSize: 13, fontFamily: 'var(--mono)', lineHeight: 1.8 }}
                    />
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                      {bulkText.trim().split('\n').filter(Boolean).length} số điện thoại
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                    Nguồn số
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {DISPATCH_SOURCES.map(s => (
                      <button key={s} onClick={() => setSource(s)}
                        style={{
                          padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                          border: source === s ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                          background: source === s ? 'rgba(212,175,55,.12)' : 'var(--surface)',
                          color: source === s ? 'var(--accent)' : 'var(--text2)',
                          cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font)'
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* UP BUTTON */}
                <button
                  onClick={bulkMode ? handleBulkUp : handleUp}
                  disabled={dispatching}
                  style={{
                    width: '100%', padding: '16px 0',
                    background: dispatching ? 'var(--surface)' : 'linear-gradient(135deg, var(--accent), var(--accent2))',
                    border: 'none', borderRadius: 14,
                    color: dispatching ? 'var(--text3)' : '#0a0d14',
                    fontSize: 18, fontWeight: 900, fontFamily: 'var(--font)',
                    cursor: dispatching ? 'wait' : 'pointer',
                    transition: 'all .2s',
                    boxShadow: dispatching ? 'none' : '0 6px 20px rgba(212,175,55,.35)',
                    transform: dispatching ? 'none' : undefined,
                    letterSpacing: 1
                  }}
                  onMouseEnter={e => { if (!dispatching) e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 10px 28px rgba(212,175,55,.5)'; }}
                  onMouseLeave={e => { e.target.style.transform = 'none'; e.target.style.boxShadow = dispatching ? 'none' : '0 6px 20px rgba(212,175,55,.35)'; }}
                >
                  {dispatching ? "⏳ ĐANG CHIA..." : bulkMode ? `⬆ UP ${bulkText.trim().split('\n').filter(Boolean).length} SĐT` : "⬆ UP"}
                </button>

                {/* Last result */}
                {lastResult && (
                  <div style={{
                    marginTop: 12, padding: '12px 14px',
                    background: 'rgba(34,211,160,.08)', border: '1px solid rgba(34,211,160,.2)',
                    borderRadius: 10, animation: 'fi .3s ease'
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 4 }}>✅ Vừa chia thành công</div>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--mono)' }}>{lastResult.dispatch?.customerPhone}</div>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>→ {lastResult.assignedTo?.name}</div>
                  </div>
                )}
              </div>

              {/* ── RING VISUALIZATION ── */}
              {currentQueue && currentQueue.members.length > 0 && (
                <div style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, padding: 20
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>🔄</span> Vòng xoay — {currentQueue.name}
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400, marginLeft: 'auto' }}>
                      Vị trí #{currentQueue.currentIndex + 1}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {currentQueue.members.map((m, idx) => {
                      const isNext = idx === currentQueue.currentIndex;
                      const isOffline = m.user.status === 'offline' || m.user.status === 'pending';
                      const isDisabled = !m.isActive || isOffline;
                      return (
                        <div key={m.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                          background: isNext ? 'rgba(212,175,55,.1)' : isDisabled ? 'rgba(107,114,128,.04)' : 'var(--surface)',
                          border: `2px solid ${isNext ? 'var(--accent)' : 'var(--border)'}`,
                          borderRadius: 10, opacity: isDisabled ? 0.4 : 1, transition: 'all .3s',
                          position: 'relative', overflow: 'hidden'
                        }}>
                          {isNext && (
                            <div style={{
                              position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                              background: 'var(--accent)', borderRadius: '99px 0 0 99px'
                            }} />
                          )}
                          <span style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: isNext ? 'linear-gradient(135deg, var(--accent), var(--accent2))' : 'var(--surface2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 800, color: isNext ? '#0a0d14' : 'var(--text2)', flexShrink: 0
                          }}>
                            {isNext ? "▶" : idx + 1}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: isNext ? 800 : 600, color: isNext ? 'var(--accent)' : 'var(--text)' }}>
                              {m.user.name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                              {isDisabled ? (isOffline ? '🔴 Nghỉ — sẽ bị bỏ qua' : '⏸ Đã tắt chia số') : isNext ? '👉 Đến lượt tiếp theo' : `Thứ tự #${idx + 1}`}
                            </div>
                          </div>
                          {isNext && !isDisabled && (
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: 'var(--accent)',
                              background: 'rgba(212,175,55,.1)', padding: '3px 8px', borderRadius: 99,
                              border: '1px solid rgba(212,175,55,.25)', animation: 'livepulse 2s infinite'
                            }}>
                              TIẾP THEO
                            </span>
                          )}
                          {/* Toggle button */}
                          <button
                            onClick={() => handleToggleMember(m.id, m.isActive)}
                            title={m.isActive ? 'Tắt chia số cho NV này' : 'Bật lại chia số'}
                            style={{
                              padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                              border: `1px solid ${m.isActive ? 'rgba(248,113,113,.25)' : 'rgba(34,211,160,.25)'}`,
                              background: m.isActive ? 'rgba(248,113,113,.08)' : 'rgba(34,211,160,.1)',
                              color: m.isActive ? 'var(--danger)' : 'var(--accent)',
                              cursor: 'pointer', transition: 'all .15s', fontFamily: 'var(--font)',
                              flexShrink: 0, whiteSpace: 'nowrap'
                            }}
                          >
                            {m.isActive ? '⏸ Tắt' : '▶ Bật'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL — History */}
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden'
            }}>
              <div style={{
                padding: '14px 18px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <span style={{ fontSize: 15 }}>📋</span>
                <span style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>Lịch sử chia SĐT</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)',
                  background: 'rgba(212,175,55,.08)', padding: '3px 10px', borderRadius: 99, border: '1px solid rgba(212,175,55,.18)'
                }}>
                  {history.length} bản ghi
                </span>
              </div>
              <div style={{ maxHeight: 540, overflowY: 'auto' }}>
                {history.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📭</div>
                    <div>Chưa có SĐT nào được chia</div>
                  </div>
                ) : (
                  history.map(d => {
                    const cd = d.status === 'PENDING' ? fmtCountdown(d.slaDeadline) : null;
                    return (
                      <div key={d.id} style={{
                        padding: '12px 18px', borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: 10, transition: 'background .15s',
                        background: d.status === 'PENDING' && cd?.cls === 'danger' ? 'rgba(248,113,113,.04)' : undefined
                      }}>
                        <span style={{ fontSize: 18, flexShrink: 0 }}>{STATUS_ICON[d.status]}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 800 }}>{d.customerPhone}</span>
                            {d.customerName && <span style={{ fontSize: 12, color: 'var(--text2)' }}>({d.customerName})</span>}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span>→ {d.assignedTo?.name || "—"}</span>
                            <span>· {d.source || "—"}</span>
                            <span>· {new Date(d.assignedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                            {d.queue && <span>· 📋 {d.queue.name}</span>}
                          </div>
                        </div>

                        {/* Countdown / Status */}
                        {d.status === 'PENDING' && cd && (
                          <div style={{
                            fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 800, textAlign: 'center',
                            padding: '4px 10px', borderRadius: 8, minWidth: 56,
                            background: cd.cls === 'danger' ? 'rgba(248,113,113,.12)' : cd.cls === 'warn' ? 'rgba(251,191,36,.1)' : 'rgba(34,211,160,.09)',
                            color: cd.cls === 'danger' ? 'var(--danger)' : cd.cls === 'warn' ? 'var(--warn)' : 'var(--accent)',
                            animation: cd.cls === 'danger' ? 'blink 1s infinite' : undefined
                          }}>
                            {cd.text}
                          </div>
                        )}

                        {d.status !== 'PENDING' && (
                          <span style={{
                            fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                            background: d.status === 'CALLED' ? 'rgba(34,211,160,.1)' : 'rgba(248,113,113,.08)',
                            color: STATUS_COLOR[d.status], border: `1px solid ${d.status === 'CALLED' ? 'rgba(34,211,160,.2)' : 'rgba(248,113,113,.15)'}`
                          }}>
                            {STATUS_LABEL[d.status]}
                          </span>
                        )}

                        {/* Actions */}
                        {d.status === 'PENDING' && (
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => handleStatusUpdate(d.id, 'CALLED')}
                              style={{
                                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                background: 'rgba(34,211,160,.1)', border: '1px solid rgba(34,211,160,.2)',
                                color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)'
                              }}>✓ Đã gọi</button>
                            <button onClick={() => handleStatusUpdate(d.id, 'CANCELLED')}
                              style={{
                                padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                                background: 'rgba(248,113,113,.06)', border: '1px solid rgba(248,113,113,.15)',
                                color: 'var(--danger)', cursor: 'pointer', fontFamily: 'var(--font)'
                              }}>✗ Huỷ</button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Queue Modal ── */}
      {showQueueModal && (
        <QueueModal
          queue={editQueue}
          allUsers={allUsers}
          onClose={() => { setShowQueueModal(false); setEditQueue(null); }}
          onSave={(q) => { setShowQueueModal(false); setEditQueue(null); fetchData(); }}
          api={api}
          addToast={addToast}
        />
      )}
    </div>
  );
};

export default DispatchPage;
export { DISPATCH_SOURCES };
