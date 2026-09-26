'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadCourses() {
    const { ok, body } = await adminFetch('/api/admin/courses');
    if (ok) setCourses(body.courses);
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    const { ok, body } = await adminFetch('/api/admin/courses', {
      method: 'POST',
      body: JSON.stringify({ title, description, price }),
    });
    setCreating(false);
    if (!ok) {
      setError(body.error || 'تعذر إنشاء الكورس');
      return;
    }
    setTitle('');
    setDescription('');
    setPrice(0);
    loadCourses();
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>📚 إدارة الكورسات والمحاضرات</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            أنشئ فصول وكورسات مادة الفيزياء وأضف الدروس والأكواد التابعة لها
          </p>
        </div>
        <Link href="/admin" className="btn btn-secondary">
          ⬅️ لوحة الأدمن
        </Link>
      </div>

      {/* نموذج إنشاء كورس جديد */}
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>➕ إنشاء كورس فيزياء جديد</h3>
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 14 }}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">اسم الكورس / الباب التعليمي</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: الباب الأول - التيار الكهربي وقانون أوم"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">وصف الكورس</label>
            <textarea
              className="form-textarea"
              placeholder="شرح تفصيلي لمحتويات الباب ونواتج التعلم المستهدفة"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">سعر الكورس (جنيه مصري - اختياري)</label>
            <input
              type="number"
              className="form-input"
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min={0}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={creating}>
            {creating ? 'جارٍ إنشاء الكورس...' : 'حفظ وإنشاء الكورس 🚀'}
          </button>
        </form>
      </div>

      {/* قائمة الكورسات الحالية */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3>قائمة الكورسات الحالية</h3>
        {courses && <span className="badge badge-info">{courses.length} كورس</span>}
      </div>

      {courses === null && (
        <div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
        </div>
      )}

      {courses?.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📚</div>
          <h4 className="empty-title">لا توجد كورسات مسجلة بعد</h4>
          <p className="empty-desc">
            ابدأ بإنشاء أول كورس فيزياء من النموذج أعلاه لإضافة المحاضرات وتوليد الأكواد
          </p>
        </div>
      )}

      {courses?.map((c) => (
        <div key={c.id} className="card card-interactive" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h4 style={{ fontSize: 17, marginBottom: 4 }}>{c.title}</h4>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              {c.videos?.[0]?.count || 0} درس ومحاضرة • {c.enrollments?.[0]?.count || 0} طالب مشترك {c.price > 0 ? `• السعر: ${c.price} ج.م` : ''}
            </p>
            {c.description && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '4px 0 0', maxWidth: 500 }}>
                {c.description}
              </p>
            )}
          </div>
          <Link href={`/admin/courses/${c.id}`} className="btn btn-primary" style={{ padding: '8px 18px' }}>
            ⚙️ إدارة المحتوى والأكواد
          </Link>
        </div>
      ))}
    </div>
  );
}
