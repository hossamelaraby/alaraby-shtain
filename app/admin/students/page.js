'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

export default function AdminStudentsPage() {
  const [students, setStudents] = useState(null);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  async function load() {
    const { ok, body } = await adminFetch('/api/admin/students');
    if (ok) setStudents(body.students || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleLock(student) {
    setActionLoading(student.id);
    await adminFetch('/api/admin/students', {
      method: 'POST',
      body: JSON.stringify({
        action: student.locked ? 'unlock' : 'lock',
        student_id: student.id,
        reason: 'إجراء يدوي من مستر محمد العربي',
      }),
    });
    setActionLoading(null);
    load();
  }

  const filtered = students?.filter((s) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      (s.email || '').toLowerCase().includes(term) ||
      (s.phone || '').toLowerCase().includes(term) ||
      (s.full_name || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>👥 إدارة طلاب منصة العربي شتاين</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            متابعة حسابات الطلاب، الاشتراكات النشطة، وحظر أو فك حظر أي حساب
          </p>
        </div>
        <Link href="/admin" className="btn btn-secondary">
          ⬅️ لوحة الأدمن
        </Link>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <input
          type="text"
          className="form-input"
          placeholder="🔍 ابحث عن طالب بالاسم أو رقم الموبايل أو البريد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {students === null && (
        <div className="skeleton skeleton-card"></div>
      )}

      {students && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>بيانات الطالب</th>
                <th>رقم الهاتف</th>
                <th>عدد الكورسات</th>
                <th>حالة الحساب</th>
                <th>تاريخ التسجيل</th>
                <th>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#94a3b8' }}>
                    {students.length === 0 ? 'لم يتم تسجيل أي طلاب في المنصة بعد' : 'لا يوجد طلاب مطابقين للبحث'}
                  </td>
                </tr>
              ) : (
                filtered?.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong style={{ fontSize: 14, display: 'block' }}>{s.full_name || s.email?.split('@')[0] || 'طالب فيزياء'}</strong>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{s.email || '—'}</span>
                    </td>
                    <td dir="ltr" style={{ textAlign: 'right', fontWeight: 600 }}>
                      {s.phone || '—'}
                    </td>
                    <td>
                      <span className="badge badge-info">{s.enrollments_count || 0} كورس</span>
                    </td>
                    <td>
                      {s.locked ? (
                        <span className="badge badge-danger">🚫 محظور</span>
                      ) : (
                        <span className="badge badge-success">✅ نشط</span>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: '#64748b' }}>
                      {s.created_at ? new Date(s.created_at).toLocaleDateString('ar-EG') : '—'}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleLock(s)}
                        disabled={actionLoading === s.id}
                        className={`btn ${s.locked ? 'btn-success' : 'btn-danger'}`}
                        style={{ padding: '6px 12px', fontSize: 13 }}
                      >
                        {actionLoading === s.id ? 'جارٍ التنفيذ...' : s.locked ? 'فك الحظر ✅' : 'حظر الحساب 🚫'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
