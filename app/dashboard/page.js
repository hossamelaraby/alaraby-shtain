'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function DashboardPage() {
  const [courses, setCourses] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      // مزامنة والتحقق من الجلسة
      let token = localStorage.getItem('sb_access_token');
      let email = localStorage.getItem('user_email');

      if (!token) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          token = sessionData.session.access_token;
          email = sessionData.session.user.email;
          localStorage.setItem('sb_access_token', token);
          if (email) localStorage.setItem('user_email', email);
        } else {
          window.location.href = '/login';
          return;
        }
      }

      if (email) setUserEmail(email);

      const localRole = localStorage.getItem('user_role');
      if (localRole === 'admin') setIsAdmin(true);

      // فحص هل المستخدم أدمن عبر Supabase إن وجد
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userData.user.id)
            .maybeSingle();
          if (prof?.role === 'admin') setIsAdmin(true);
        }
      } catch (e) {}

      const headers = { Authorization: `Bearer ${token}` };

      try {
        const [coursesRes, annRes] = await Promise.all([
          fetch('/api/my-courses', { headers }),
          fetch('/api/announcements', { headers }),
        ]);

        const coursesBody = await coursesRes.json().catch(() => ({}));
        if (!coursesRes.ok) {
          if (coursesRes.status === 401) {
            localStorage.removeItem('sb_access_token');
            window.location.href = '/login';
            return;
          }
          setError(coursesBody.error || 'تعذر تحميل بيانات الكورسات');
          return;
        }
        setCourses(coursesBody.courses || []);

        const annBody = await annRes.json().catch(() => ({}));
        if (annRes.ok) setAnnouncements(annBody.announcements || []);
      } catch (e) {
        setError('تعذر الاتصال بالخادم، يرجى إعادة تحميل الصفحة.');
      }
    }

    load();
  }, []);

  return (
    <div className="container">
      {/* شريط الترحيب والروابط السريعة */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, #0b132b 0%, #1c2541 100%)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: '26px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(2, 132, 199, 0.25)', color: '#38bdf8', padding: '3px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
              ⚛️ لوحة الطالب — العربي شتاين
            </div>
            <h1 style={{ color: '#fff', fontSize: 22, margin: 0 }}>
              أهلاً بك يا بطل الفيزياء {userEmail ? `(${userEmail.split('@')[0]})` : ''} 👋
            </h1>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>
              تابع محاضراتك الأسبوعية، حل تدريباتك، وحقق الدرجة النهائية مع مستر محمد العربي.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/redeem" className="btn btn-primary" style={{ boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)' }}>
              🔑 تفعيل كود جديد
            </Link>
            {isAdmin && (
              <Link href="/admin" className="btn btn-secondary" style={{ background: '#f59e0b', color: '#000', borderColor: '#f59e0b', fontWeight: 800 }}>
                ⚙️ لوحة تحكم المدرس
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* تنبيهات وإعلانات المدرس */}
      {announcements.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {announcements.map((a) => (
            <div key={a.id} className="alert alert-warning" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22 }}>📢</span>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 15, display: 'block', color: '#78350f' }}>{a.title}</strong>
                {a.body && <p style={{ margin: '4px 0 0', color: '#92400e', fontSize: 13 }}>{a.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2>📚 كورساتي واشتراكاتي</h2>
        {courses && courses.length > 0 && (
          <span className="badge badge-info">{courses.length} كورس مفعّل</span>
        )}
      </div>

      {/* حالة التحميل (Skeletons) */}
      {courses === null && !error && (
        <div>
          <div className="skeleton skeleton-card"></div>
          <div className="skeleton skeleton-card"></div>
        </div>
      )}

      {/* حالة عدم وجود كورسات (Empty State) */}
      {courses && courses.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⚛️</div>
          <h3 className="empty-title">لا توجد كورسات مفعّلة حالياً</h3>
          <p className="empty-desc">
            لم تشترك في أي كورس بعد! إذا كان معك كود اشتراك من مستر محمد العربي، اضغط على الزر أدناه وفعّله فوراً لفتح المحاضرات والواجبات.
          </p>
          <Link href="/redeem" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: 15 }}>
            🔑 تفعيل كود الاشتراك الآن
          </Link>
        </div>
      )}

      {/* قائمة الكورسات المتاحة */}
      {courses?.map((course) => (
        <div key={course.id} className="course-card">
          <div className="course-card-header">
            <div>
              <h3 className="course-title">{course.title}</h3>
              {course.description && <p className="course-desc">{course.description}</p>}
            </div>
            <span className="badge badge-info">{course.videos?.length || 0} محاضرة</span>
          </div>

          <div className="lesson-list">
            {(!course.videos || course.videos.length === 0) ? (
              <p style={{ padding: '16px 10px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                سيتم رفع دروس ومحاضرات هذا الكورس قريباً
              </p>
            ) : (
              course.videos.map((v) => (
                <div key={v.id} className="lesson-row">
                  <div className="lesson-info">
                    <span className="lesson-number">{v.order_index}</span>
                    <span className="lesson-title-text">{v.title}</span>
                  </div>

                  <div>
                    {v.locked ? (
                      <span className="badge badge-warning">
                        🔒 يُفتح في {new Date(v.unlocks_at).toLocaleDateString('ar-EG')}
                      </span>
                    ) : (
                      <Link href={`/course/${v.id}`} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}>
                        ▶️ مشاهدة الدرس
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
