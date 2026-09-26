'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '@/lib/admin-fetch';

const emptyQuestion = () => ({ question_text: '', options: ['', '', '', ''], correct_index: 0 });

export default function ManageQuizPage() {
  const { videoId } = useParams();
  const router = useRouter();

  const [quizId, setQuizId] = useState(null); // موجود = تعديل، null = إنشاء جديد
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [title, setTitle] = useState('');
  const [passPercentage, setPassPercentage] = useState(50);
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminFetch(`/api/admin/quizzes?video_id=${videoId}`).then(({ ok, body }) => {
      if (ok && body.quizzes?.length) {
        const q = body.quizzes[0];
        setQuizId(q.id);
        setTitle(q.title);
        setPassPercentage(q.pass_percentage);
        setAttemptsCount(q.quiz_attempts?.[0]?.count || 0);
        setQuestions(
          q.quiz_questions.map((qq) => ({
            question_text: qq.question_text,
            options: qq.options,
            correct_index: qq.correct_index,
          }))
        );
      }
      setLoading(false);
    });
  }, [videoId]);

  function updateQuestion(index, field, value) {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  }

  function updateOption(qIndex, oIndex, value) {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  }

  function addQuestion() {
    setQuestions([...questions, emptyQuestion()]);
  }

  function removeQuestion(index) {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setSubmitting(true);

    const payload = { title, pass_percentage: passPercentage, questions };
    const { ok, body } = quizId
      ? await adminFetch('/api/admin/quizzes', {
          method: 'PATCH',
          body: JSON.stringify({ quiz_id: quizId, ...payload }),
        })
      : await adminFetch('/api/admin/quizzes', {
          method: 'POST',
          body: JSON.stringify({ video_id: videoId, ...payload }),
        });

    setSubmitting(false);

    if (!ok) {
      setError(body.error || 'تعذر حفظ الامتحان');
      return;
    }
    if (!quizId && body.quiz) setQuizId(body.quiz.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleDelete() {
    if (!confirm('متأكد إنك ترغب في حذف هذا الامتحان بالكامل؟ ستُحذف كل محاولات الطلاب المرتبطة به ولا يمكن التراجع.')) return;
    const { ok, body } = await adminFetch(`/api/admin/quizzes?quiz_id=${quizId}`, { method: 'DELETE' });
    if (!ok) {
      setError(body.error || 'تعذر حذف الامتحان');
      return;
    }
    router.back();
  }

  if (loading) {
    return (
      <div className="container">
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2>📝 {quizId ? 'تعديل امتحان المحاضرة' : 'إنشاء امتحان جديد للمحاضرة'}</h2>
          <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
            أسئلة اختيار من متعدد مع تحديد الإجابة الصحيحة والتصحيح التلقائي الفوري
          </p>
        </div>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">
          ⬅️ رجوع
        </button>
      </div>

      {quizId && attemptsCount > 0 && (
        <div className="alert alert-warning">
          <span>⚠️</span>
          <div>
            <strong>تنبيه:</strong> قام {attemptsCount} طالب بحل هذا الامتحان بالفعل. تعديل الأسئلة سيطبق على المحاولات القادمة.
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      {saved && (
        <div className="alert alert-success">
          <span>✅</span>
          <div>تم حفظ وتحديث بيانات الامتحان بنجاح!</div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label className="form-label">عنوان الامتحان</label>
            <input
              type="text"
              className="form-input"
              placeholder="مثال: كويز تقييمي على قانون أوم والدائرة الكهربية"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">نسبة النجاح المطلوبة (%)</label>
            <input
              type="number"
              className="form-input"
              min={1}
              max={100}
              value={passPercentage}
              onChange={(e) => setPassPercentage(Number(e.target.value))}
              required
            />
          </div>
        </div>

        {/* الأسئلة */}
        <h3 style={{ marginBottom: 14 }}>قائمة الأسئلة ({questions.length} أسئلة)</h3>
        {questions.map((q, qIndex) => (
          <div key={qIndex} className="card" style={{ borderRight: '4px solid #0284c7' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span className="badge badge-info">سؤال {qIndex + 1}</span>
              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="btn btn-danger"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                >
                  حذف السؤال 🗑️
                </button>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">نص السؤال</label>
              <textarea
                className="form-textarea"
                rows={2}
                placeholder="اكتب نص السؤال بدقة..."
                value={q.question_text}
                onChange={(e) => updateQuestion(qIndex, 'question_text', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">خيارات الإجابة (اختر الإجابة الصحيحة بالضغط على الدائرة):</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, oIndex) => (
                  <div key={oIndex} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="radio"
                      name={`correct_${qIndex}`}
                      checked={q.correct_index === oIndex}
                      onChange={() => updateQuestion(qIndex, 'correct_index', oIndex)}
                      style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                      title="حدد هذا الخيار كإجابة صحيحة"
                    />
                    <input
                      type="text"
                      className="form-input"
                      placeholder={`الخيار ${oIndex + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div style={{ display: 'flex', gap: 12, marginBottom: 30, flexWrap: 'wrap' }}>
          <button type="button" onClick={addQuestion} className="btn btn-secondary">
            ➕ إضافة سؤال جديد
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'جارٍ الحفظ...' : 'حفظ الامتحان والأسئلة 💾'}
          </button>
          {quizId && (
            <button type="button" onClick={handleDelete} className="btn btn-danger" style={{ marginRight: 'auto' }}>
              حذف الامتحان بالكامل 🗑️
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
