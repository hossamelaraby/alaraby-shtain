'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

export default function ManageCoursePage() {
  const { courseId } = useParams();

  const [videos, setVideos] = useState(null);
  const [videoTitle, setVideoTitle] = useState('');
  const [storagePath, setStoragePath] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [unlockDays, setUnlockDays] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);

  // حالة تعديل المحاضرة
  const [editingVideo, setEditingVideo] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editStoragePath, setEditStoragePath] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUnlockDays, setEditUnlockDays] = useState(0);
  const [editOrderIndex, setEditOrderIndex] = useState(1);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [quantity, setQuantity] = useState(10);
  const [batchLabel, setBatchLabel] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState(null);
  const [existingCodes, setExistingCodes] = useState(null);
  const [codeError, setCodeError] = useState('');
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codesFilter, setCodesFilter] = useState('all'); // 'all' | 'available' | 'used'
  const [codesSearch, setCodesSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  function copySingle(code) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function copyAllAvailable() {
    if (!existingCodes) return;
    const available = existingCodes.filter((c) => !c.used_by).map((c) => c.code);
    if (available.length === 0) {
      alert('لا توجد أكواد متاحة للنسخ حالياً');
      return;
    }
    navigator.clipboard.writeText(available.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function loadVideos() {
    const { ok, body } = await adminFetch(`/api/admin/videos?course_id=${courseId}`);
    if (ok) setVideos(body.videos);
  }

  async function loadCodes() {
    const { ok, body } = await adminFetch(`/api/admin/codes?course_id=${courseId}`);
    if (ok) setExistingCodes(body.codes);
  }

  useEffect(() => {
    loadVideos();
    loadCodes();
  }, [courseId]);

  async function handleAddVideo(e) {
    e.preventDefault();
    setVideoError('');
    setAddingVideo(true);
    const { ok, body } = await adminFetch('/api/admin/videos', {
      method: 'POST',
      body: JSON.stringify({
        course_id: courseId,
        title: videoTitle,
        storage_path: storagePath,
        description: videoDescription,
        unlock_after_days: unlockDays,
        order_index: (videos?.length || 0) + 1,
      }),
    });
    setAddingVideo(false);
    if (!ok) {
      setVideoError(body.error || 'تعذر إضافة الدرس');
      return;
    }
    setVideoTitle('');
    setStoragePath('');
    setVideoDescription('');
    setUnlockDays(0);
    loadVideos();
  }

  function openEditModal(v) {
    setEditingVideo(v);
    setEditTitle(v.title || '');
    setEditStoragePath(v.storage_path || '');
    setEditDescription(v.description || '');
    setEditUnlockDays(v.unlock_after_days || 0);
    setEditOrderIndex(v.order_index || 1);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingVideo) return;
    setSavingEdit(true);
    const { ok, body } = await adminFetch('/api/admin/videos', {
      method: 'PUT',
      body: JSON.stringify({
        id: editingVideo.id,
        title: editTitle,
        storage_path: editStoragePath,
        description: editDescription,
        unlock_after_days: editUnlockDays,
        order_index: editOrderIndex,
      }),
    });
    setSavingEdit(false);
    if (ok) {
      setEditingVideo(null);
      loadVideos();
    } else {
      alert(body.error || 'تعذر حفظ التعديلات');
    }
  }

  async function handleDeleteVideo(v) {
    if (!confirm(`هل أنت متأكد من حذف محاضرة "${v.title}"؟`)) return;
    setDeletingId(v.id);
    const { ok, body } = await adminFetch(`/api/admin/videos?id=${v.id}`, {
      method: 'DELETE',
    });
    setDeletingId(null);
    if (ok) {
      loadVideos();
    } else {
      alert(body.error || 'تعذر حذف المحاضرة');
    }
  }

  async function handleGenerateCodes(e) {
    e.preventDefault();
    setCodeError('');
    setGeneratedCodes(null);
    setGeneratingCodes(true);
    const { ok, body } = await adminFetch('/api/admin/codes', {
      method: 'POST',
      body: JSON.stringify({ course_id: courseId, quantity, batch_label: batchLabel }),
    });
    setGeneratingCodes(false);
    if (!ok) {
      setCodeError(body.error || 'تعذر توليد الأكواد');
      return;
    }
    setGeneratedCodes(body.codes);
    loadCodes();
  }

  function copyAllCodes() {
    if (!generatedCodes) return;
    navigator.clipboard.writeText(generatedCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  const usedCount = existingCodes?.filter((c) => c.used_by).length || 0;
  const unusedCount = (existingCodes?.length || 0) - usedCount;

  const filteredCodes = (existingCodes || []).filter((c) => {
    if (codesFilter === 'available' && c.used_by) return false;
    if (codesFilter === 'used' && !c.used_by) return false;
    if (codesSearch.trim()) {
      const q = codesSearch.trim().toLowerCase();
      const codeMatch = c.code.toLowerCase().includes(q);
      const batchMatch = c.batch_label ? c.batch_label.toLowerCase().includes(q) : false;
      return codeMatch || batchMatch;
    }
    return true;
  });

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>⚙️ إدارة محتوى وأكواد الكورس</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            إضافة دروس ومحاضرات، تعديل الروابط والوصف، وتوليد أكواد الاشتراك
          </p>
        </div>
        <Link href="/admin/courses" className="btn btn-secondary">
          ⬅️ العودة للكورسات
        </Link>
      </div>

      {/* ---------- إضافة درس جديد ---------- */}
      <section className="card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 14 }}>➕ إضافة محاضرة / درس جديد</h3>
        {videoError && (
          <div className="alert alert-danger" style={{ marginBottom: 14 }}>
            <span>⚠️</span>
            <div>{videoError}</div>
          </div>
        )}
        <form onSubmit={handleAddVideo}>
          <div className="form-group">
            <label className="form-label">
              عنوان المحاضرة <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: الحصة 1 - شدة التيار وفرق الجهد الكهربي"
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              رابط أو معرّف الفيديو (URL / Video ID) <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: https://youtu.be/q5gHTl5kdGw أو رابط مباشر MP4 أو كود التشفير"
              value={storagePath}
              onChange={(e) => setStoragePath(e.target.value)}
              required
              dir="ltr"
              style={{ textAlign: 'right' }}
            />
            <p className="form-hint">
              يدعم روابط YouTube بكل صيغها (تلقائياً وبأمان)، أو روابط الفيديو المباشرة، أو معرف الفيديو المشفر.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">وصف وملاحظات المحاضرة (اختياري)</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="اكتب نبذة عن موضوع الدرس، القوانين المشروحة، أو ملاحظات للطلاب..."
              value={videoDescription}
              onChange={(e) => setVideoDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">يُفتح بعد كم يوم من الاشتراك؟ (0 = متاح فوراً)</label>
            <input
              type="number"
              className="form-input"
              min={0}
              value={unlockDays}
              onChange={(e) => setUnlockDays(Number(e.target.value))}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={addingVideo} style={{ padding: '10px 24px' }}>
            {addingVideo ? 'جارٍ إضافة المحاضرة...' : 'إضافة المحاضرة للكورس 🚀'}
          </button>
        </form>

        {/* ---------- قائمة دروس ومحاضرات الكورس مع أدوات التعديل والحذف ---------- */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
          <h4 style={{ marginBottom: 14, fontSize: 16 }}>🎬 دروس ومحاضرات الكورس الحالية</h4>
          {videos === null && <div className="skeleton skeleton-text"></div>}
          {videos?.length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>لم يتم إضافة دروس بعد لهذا الكورس</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {videos?.map((v) => (
              <div
                key={v.id}
                style={{
                  padding: '14px 16px',
                  background: '#f8fafc',
                  borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: 15 }}>
                      {v.order_index}. {v.title}
                    </strong>
                    {v.unlock_after_days > 0 ? (
                      <span className="badge badge-warning">
                        يُفتح بعد {v.unlock_after_days} يوم
                      </span>
                    ) : (
                      <span className="badge badge-success">متاح فوراً</span>
                    )}
                  </div>

                  {v.description && (
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#475569' }}>
                      {v.description}
                    </p>
                  )}

                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, wordBreak: 'break-all' }} dir="ltr">
                    🔗 {v.storage_path}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {/* زر تعديل المحاضرة */}
                  <button
                    type="button"
                    onClick={() => openEditModal(v)}
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: 13, borderColor: '#0284c7', color: '#0284c7' }}
                  >
                    ✏️ تعديل
                  </button>

                  {/* بنك امتحان الدرس */}
                  <Link
                    href={`/admin/quizzes/${v.id}`}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                  >
                    📝 بنك الامتحان
                  </Link>

                  {/* زر حذف المحاضرة */}
                  <button
                    type="button"
                    onClick={() => handleDeleteVideo(v)}
                    disabled={deletingId === v.id}
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: 13 }}
                  >
                    {deletingId === v.id ? 'جارٍ الحذف...' : '🗑️ حذف'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- توليد وإدارة أكواد الاشتراك ---------- */}
      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3>🎟️ توليد وتوزيع أكواد الاشتراك</h3>
            <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
              توليد أكواد مشفرة غير قابلة للتكرار ليستخدمها الطالب في تفعيل الكورس فورياً
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-success">{unusedCount} كود متاح</span>
            <span className="badge badge-info">{usedCount} كود مستخدم</span>
          </div>
        </div>

        {codeError && (
          <div className="alert alert-danger" style={{ marginBottom: 14 }}>
            <span>⚠️</span>
            <div>{codeError}</div>
          </div>
        )}

        <form onSubmit={handleGenerateCodes}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">عدد الأكواد المطلوبة (حتى 500 كود)</label>
              <input
                type="number"
                className="form-input"
                min={1}
                max={500}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">تسمية الدفعة (مثال: سنتر السرايا - أكتوبر)</label>
              <input
                type="text"
                className="form-input"
                placeholder="تسمية اختيارية لتمييز الدفعة"
                value={batchLabel}
                onChange={(e) => setBatchLabel(e.target.value)}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={generatingCodes}>
            {generatingCodes ? 'جارٍ توليد الأكواد في قاعدة البيانات...' : 'توليد الأكواد الآن 🚀'}
          </button>
        </form>

        {generatedCodes && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: '#f0f9ff',
              borderRadius: 8,
              border: '1px solid #bae6fd',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ color: '#0369a1' }}>
                🎉 تم توليد {generatedCodes.length} كود جديد بنجاح:
              </strong>
              <button
                type="button"
                onClick={copyAllCodes}
                className="btn btn-secondary"
                style={{ padding: '6px 14px', fontSize: 13, background: '#fff' }}
              >
                {copied ? '✅ تم النسخ إلى الحافظة' : '📋 نسخ جميع الأكواد'}
              </button>
            </div>
            <div
              style={{
                maxHeight: 180,
                overflowY: 'auto',
                background: '#fff',
                padding: 12,
                borderRadius: 8,
                border: '1px solid #e0f2fe',
                fontFamily: 'monospace',
                fontSize: 14,
                lineHeight: 1.8,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 6,
              }}
            >
              {generatedCodes.map((code) => (
                <span key={code} style={{ background: '#f8fafc', padding: '3px 8px', borderRadius: 4, textAlign: 'center' }}>
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* قائمة جميع الأكواد السابقة وإمكانية استعراضها ونسخها */}
        <div style={{ marginTop: 26, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
            <div>
              <h4 style={{ margin: 0, fontSize: 16, color: '#f8fafc' }}>
                📋 سجل الأكواد المنشأة سابقاً لهذا الكورس ({existingCodes?.length || 0})
              </h4>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                يمكنك استعراض الأكواد، ومعرفة المستخدم منها والمتاح، ونسخ كود فردي أو نسخ جميع الأكواد المتاحة دفعة واحدة
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={copyAllAvailable}
                className="btn btn-primary"
                style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700 }}
              >
                {copied ? '✅ تم نسخ الأكواد المتاحة!' : `📋 نسخ كل الأكواد المتاحة (${unusedCount})`}
              </button>
            </div>
          </div>

          {/* فلاتر وبحث الأكواد */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.06)', padding: 3, borderRadius: 8 }}>
              <button
                type="button"
                onClick={() => setCodesFilter('all')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: codesFilter === 'all' ? '#0284c7' : 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                الكل ({existingCodes?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setCodesFilter('available')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: codesFilter === 'available' ? '#16a34a' : 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                متاح فقط ({unusedCount})
              </button>
              <button
                type="button"
                onClick={() => setCodesFilter('used')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  cursor: 'pointer',
                  background: codesFilter === 'used' ? '#dc2626' : 'transparent',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                مستخدم ({usedCount})
              </button>
            </div>

            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 بحث في الأكواد أو اسم الدفعة..."
                value={codesSearch}
                onChange={(e) => setCodesSearch(e.target.value)}
                style={{ padding: '6px 12px', fontSize: 13 }}
              />
            </div>
          </div>

          {/* جدول الأكواد */}
          {(!existingCodes || existingCodes.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8', fontSize: 13, background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
              لم يتم توليد أي أكواد لهذا الكورس بعد.
            </div>
          ) : (
            <div style={{ maxHeight: 380, overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}>
              <table className="table" style={{ margin: 0, width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>الكود</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>الدفعة / السنتر</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>الحالة</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>تاريخ التوليد</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>نسخ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((c) => {
                    const isUsed = !!c.used_by;
                    return (
                      <tr key={c.code} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: isUsed ? '#94a3b8' : '#38bdf8' }}>
                          {c.code}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#cbd5e1' }}>
                          {c.batch_label || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {isUsed ? (
                            <span className="badge badge-danger" style={{ fontSize: 11 }}>
                              مستخدم {c.used_at ? `(${new Date(c.used_at).toLocaleDateString('ar-EG')})` : ''}
                            </span>
                          ) : (
                            <span className="badge badge-success" style={{ fontSize: 11 }}>
                              جاهز ومتاح
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                          {c.created_at ? new Date(c.created_at).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => copySingle(c.code)}
                            className="btn btn-secondary"
                            style={{ padding: '4px 12px', fontSize: 12, background: 'rgba(255,255,255,0.08)' }}
                            title="نسخ الكود"
                          >
                            {copiedCode === c.code ? '✅ تم النسخ' : '📋 نسخ'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredCodes.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
                        لا توجد نتائج مطابقة لبحثك
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ---------- نافذة تعديل إعدادات المحاضرة (Modal) ---------- */}
      {editingVideo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 550,
              width: '100%',
              margin: 0,
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18 }}>✏️ تعديل بيانات المحاضرة</h3>
              <button
                type="button"
                onClick={() => setEditingVideo(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label className="form-label">
                  عنوان المحاضرة <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  رابط أو معرّف الفيديو (URL / Video ID) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={editStoragePath}
                  onChange={(e) => setEditStoragePath(e.target.value)}
                  required
                  dir="ltr"
                  style={{ textAlign: 'right' }}
                />
                <p className="form-hint">
                  يدعم روابط YouTube أو روابط MP4 المباشرة أو معرّف الفيديو المشفر
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">وصف وملاحظات المحاضرة</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="ملاحظات حول القوانين المشروحة والواجب..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">ترتيب المحاضرة</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    value={editOrderIndex}
                    onChange={(e) => setEditOrderIndex(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">يُفتح بعد كم يوم؟</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    value={editUnlockDays}
                    onChange={(e) => setEditUnlockDays(Number(e.target.value))}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 18 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEdit}
                  style={{ padding: 10, fontSize: 15 }}
                >
                  {savingEdit ? 'جارٍ الحفظ...' : 'حفظ التعديلات ✅'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingVideo(null)}
                  className="btn btn-secondary"
                  style={{ padding: 10, fontSize: 15 }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
