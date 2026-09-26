'use client';
import { useEffect, useState } from 'react';

export default function QuizBlock({ videoId }) {
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem('sb_access_token');
      const res = await fetch(`/api/quiz/${videoId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      setQuiz(body.quiz);
      setLoading(false);
    }
    load();
  }, [videoId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem('sb_access_token');
    const res = await fetch('/api/quiz/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: quiz.id, answers }),
    });
    const body = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (res.ok) setResult(body);
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 24, textAlign: 'center' }}>
        <div className="skeleton skeleton-title" style={{ margin: '0 auto 16px' }}></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text"></div>
      </div>
    );
  }

  if (!quiz) return null; // لا يوجد امتحان لهذا الدرس

  if (result) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 50, marginBottom: 8 }}>
          {result.passed ? '🏆' : '📝'}
        </div>
        <div className={`badge ${result.passed ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: 14, padding: '6px 16px', marginBottom: 12 }}>
          {result.passed ? 'اجتزت الامتحان بنجاح' : 'تحتاج لإعادة المحاولة'}
        </div>
        <h3 style={{ fontSize: 24, marginBottom: 6 }}>
          درجتك: {result.score} من {result.total} ({result.percentage}%)
        </h3>
        <p style={{ color: result.passed ? '#059669' : '#dc2626', fontWeight: 700, fontSize: 16 }}>
          {result.passed ? 'أحسنت يا بطل! تم استيعاب المحاضرة بنجاح 🎯' : 'راجع شرح الدرس ونقاط الصعوبة وحاول مجدداً للوصول للإتقان 💡'}
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <span className="badge badge-info" style={{ marginBottom: 6 }}>اختبار تطبيقي على الدرس</span>
          <h3 style={{ margin: 0, fontSize: 18 }}>📝 {quiz.title}</h3>
        </div>
        <span className="badge badge-warning">درجة النجاح: {quiz.pass_percentage || 50}%</span>
      </div>

      <form onSubmit={handleSubmit}>
        {quiz.questions.map((q, qi) => (
          <div key={q.id} style={{ marginBottom: 24, padding: '16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <p style={{ fontWeight: 800, color: '#0f172a', fontSize: 15, marginBottom: 12 }}>
              سؤال {qi + 1}: {q.question_text}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {q.options.map((opt, i) => (
                <label
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: answers[q.id] === i ? '#e0f2fe' : '#ffffff',
                    border: answers[q.id] === i ? '1.5px solid #0284c7' : '1px solid #cbd5e1',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: answers[q.id] === i ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === i}
                    onChange={() => setAnswers({ ...answers, [q.id]: i })}
                    required
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={submitting}
          style={{ padding: 13, fontSize: 16 }}
        >
          {submitting ? 'جارٍ تصحيح الامتحان...' : 'تسليم الإجابات والحصول على النتيجة 🎯'}
        </button>
      </form>
    </div>
  );
}
