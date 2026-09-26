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
  const [unlockDays, setUnlockDays] = useState(0);
  const [videoError, setVideoError] = useState('');
  const [addingVideo, setAddingVideo] = useState(false);

  const [quantity, setQuantity] = useState(10);
  const [batchLabel, setBatchLabel] = useState('');
  const [generatedCodes, setGeneratedCodes] = useState(null);
  const [existingCodes, setExistingCodes] = useState(null);
  const [codeError, setCodeError] = useState('');
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setUnlockDays(0);
    loadVideos();
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

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>⚙️ إدارة محتوى وأكواد الكورس</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            إضافة دروس ومحاضرات، توليد أكواد الاشتراك للطلاب، وإعداد الامتحانات
          </p>
        </div>
        <Link href="/admin/courses" className="btn btn-secondary">
          ⬅️ العودة للكورسات
        </Link>
      </div>

      {/* ---------- إضافة درس جديد ---------- */}
      <section className="card">
        <h3 style={{ marginBottom: 14 }}>➕ إضافة محاضرة / درس جديد</h3>
        {videoError && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <div>{videoError}</div>
          </div>
        )}
        <form onSubmit={handleAddVideo}>
          <div className="form-group">
            <label className="form-label">عنوان الدرس</label>
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
            <label className="form-label">معرّف الفيديو (Video ID)</label>
            <input
              type="text"
              className="form-input"
              placeholder="نفس المعرف المستخدم عند تشفير ورفع الفيديو (مثال: physics-lesson-01)"
              value={storagePath}
              onChange={(e) => setStoragePath(e.target.value)}
              required
            />
            <p className="form-hint">هذا المعرف يطابق مجلد الفيديو المشفر في الـ Storage</p>
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

          <button type="submit" className="btn btn-primary" disabled={addingVideo}>
            {addingVideo ? 'جارٍ إضافة المحاضرة...' : 'إضافة المحاضرة للكورس 🚀'}
          </button>
        </form>

        <div style={{ marginTop: 24 }}>
          <h4 style={{ marginBottom: 12 }}>دروس ومحاضرات الكورس</h4>
          {videos === null && <div className="skeleton skeleton-text"></div>}
          {videos?.length === 0 && (
            <p style={{ color: '#94a3b8', fontSize: 14 }}>لم يتم إضافة دروس بعد لهذا الكورس</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {videos?.map((v) => (
              <div
                key={v.id}
                style={{
                  padding: '12px 14px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div>
                  <strong style={{ fontSize: 15 }}>
                    {v.order_index}. {v.title}
                  </strong>
                  {v.unlock_after_days > 0 ? (
                    <span className="badge badge-warning" style={{ marginRight: 8 }}>
                      يُفتح بعد {v.unlock_after_days} يوم
                    </span>
                  ) : (
                    <span className="badge badge-success" style={{ marginRight: 8 }}>
                      متاح فوراً
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: '#94a3b8', display: 'block', marginTop: 2 }}>
                    ID: {v.storage_path}
                  </span>
                </div>
                <Link href={`/admin/quizzes/${v.id}`} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }}>
                  📝 بنك امتحان الدرس
                </Link>
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
              توليد أكواد مشفرة غير قابلة للتكرار ليستخدمها الطالب في تفعيل الكورس
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-success">{unusedCount} كود متاح</span>
            <span className="badge badge-info">{usedCount} كود مستخدم</span>
          </div>
        </div>

        {codeError && (
          <div className="alert alert-danger">
            <span>⚠️</span>
            <div>{codeError}</div>
          </div>
        )}

        <form onSubmit={handleGenerateCodes}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
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
            {generatingCodes ? 'جارٍ توليد الأكواد...' : `توليد ${quantity} كود اشتراك جديد 🎟️`}
          </button>
        </form>

        {generatedCodes && (
          <div style={{ marginTop: 20, padding: 18, background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <strong style={{ color: '#0369a1', fontSize: 15 }}>
                ✅ تم توليد {generatedCodes.length} كود بنجاح:
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
      </section>
    </div>
  );
}
