import Link from 'next/link';
import SecureVideoPlayer from '@/components/SecureVideoPlayer';
import QuizBlock from '@/components/QuizBlock';

export default function CoursePage({ params }) {
  return (
    <div className="container-wide">
      {/* شريط التنقل العلوي للدرس */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link href="/dashboard" className="btn btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
          ⬅️ العودة للوحة التحكم
        </Link>
        <span className="badge badge-info">⚛️ مشاهدة المحاضرة وحل الامتحان</span>
      </div>

      {/* مشغل الفيديو الآمن المحمي */}
      <div style={{ marginBottom: 28 }}>
        <SecureVideoPlayer videoId={params.id} />
      </div>

      {/* بنك أسئلة وامتحان المحاضرة */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <QuizBlock videoId={params.id} />
      </div>
    </div>
  );
}
