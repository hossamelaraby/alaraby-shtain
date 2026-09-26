'use client';
import { useEffect, useRef, useState } from 'react';
import DeviceVerifyGate from './DeviceVerifyGate';
import TosGate from './TosGate';

function simpleFingerprint() {
  if (typeof navigator === 'undefined') return '';
  const data = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
  ].join('|');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return 'fp_' + Math.abs(hash);
}

export default function SecureVideoPlayer({ videoId }) {
  const videoRef = useRef(null);
  const [stage, setStage] = useState('checking'); // checking | needs_otp | needs_tos | ready | error
  const [error, setError] = useState('');
  const [wmPos, setWmPos] = useState({ top: '10%', left: '10%' });
  const clientFp = typeof window !== 'undefined' ? simpleFingerprint() : '';
  const studentEmail = typeof window !== 'undefined' ? localStorage.getItem('user_email') : '';

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('sb_access_token')}`,
    'X-Client-FP': clientFp,
  });

  // ---------- تسلسل البوابات: OTP (لو جهاز جديد) → ToS → تشغيل الفيديو ----------
  useEffect(() => {
    async function runGates() {
      const otpRes = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: authHeaders(),
      });
      const otpBody = await otpRes.json().catch(() => ({}));

      if (otpBody.requiresOtp) {
        setStage('needs_otp');
        return;
      }
      proceedToTosCheck();
    }

    function proceedToTosCheck() {
      // فحص الـ ToS بيحصل فعليًا في أول استدعاء لـ /access - لو رجع TOS_REQUIRED هننقله
      setStage('ready');
    }

    runGates();
  }, []);

  // ---------- تشغيل الفيديو الفعلي بعد اجتياز كل البوابات ----------
  useEffect(() => {
    if (stage !== 'ready') return;

    let hls;
    let refreshTimer;

    async function loadVideo() {
      const res = await fetch(`/api/videos/${videoId}/access`, {
        method: 'POST',
        headers: authHeaders(),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.code === 'TOS_REQUIRED') {
          setStage('needs_tos');
          return;
        }
        setError(body.error || 'تعذر تحميل الفيديو');
        setStage('error');
        return;
      }

      const { manifestUrl, expiresInSeconds } = await res.json();
      const Hls = (await import('hls.js')).default;
      if (Hls.isSupported() && videoRef.current) {
        hls = new Hls();
        hls.loadSource(manifestUrl);
        hls.attachMedia(videoRef.current);
      } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current.src = manifestUrl;
      }

      refreshTimer = setTimeout(loadVideo, Math.max((expiresInSeconds - 15) * 1000, 5000));
    }

    loadVideo();

    // العلامة المائية المتحركة
    const wmInterval = setInterval(() => {
      setWmPos({ top: `${5 + Math.random() * 80}%`, left: `${5 + Math.random() * 70}%` });
    }, 8000);

    // كشف تبديل التبويب أثناء التشغيل (ردع + سجل تتبع)
    function handleVisibilityChange() {
      if (document.hidden && videoRef.current && !videoRef.current.paused) {
        fetch(`/api/videos/${videoId}/access`, {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ at: new Date().toISOString() }),
        }).catch(() => {});
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // تسجيل إكمال المشاهدة تلقائيًا لما الفيديو يخلص (لازم لظهور الامتحان كخطوة تالية منطقية)
    function handleEnded() {
      fetch('/api/progress', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, completed: true }),
      }).catch(() => {});
    }
    videoRef.current?.addEventListener('ended', handleEnded);

    return () => {
      if (hls) hls.destroy();
      clearTimeout(refreshTimer);
      clearInterval(wmInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      videoRef.current?.removeEventListener('ended', handleEnded);
    };
  }, [stage, videoId]);

  if (stage === 'checking') {
    return (
      <div className="card" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', padding: 48, background: '#0b132b', color: '#fff' }}>
        <span className="spinner" style={{ width: 32, height: 32, marginBottom: 16 }}></span>
        <p style={{ color: '#38bdf8', fontWeight: 700, margin: 0 }}>جارٍ التحقق الأمني وفك تشفير المحاضرة...</p>
      </div>
    );
  }

  if (stage === 'needs_otp') {
    return <DeviceVerifyGate clientFp={clientFp} onVerified={() => setStage('ready')} />;
  }

  if (stage === 'needs_tos') {
    return <TosGate onAccepted={() => setStage('ready')} />;
  }

  if (stage === 'error') {
    return (
      <div className="card alert alert-danger" style={{ maxWidth: 900, margin: '0 auto', padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
        <strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>تعذر تشغيل الفيديو</strong>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', borderRadius: 12, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', background: '#000' }}>
      <video
        ref={videoRef}
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        style={{ width: '100%', display: 'block', maxHeight: '70vh' }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {/* العلامة المائية الديناميكية المتحركة */}
      <div
        style={{
          position: 'absolute',
          top: wmPos.top,
          left: wmPos.left,
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
          fontWeight: 'bold',
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'top 1s ease, left 1s ease',
          textShadow: '0 0 4px rgba(0,0,0,0.8)',
          background: 'rgba(0,0,0,0.25)',
          padding: '2px 8px',
          borderRadius: 4,
          backdropFilter: 'blur(2px)',
        }}
      >
        ⚛️ {studentEmail || 'العربي شتاين'} • {new Date().toLocaleDateString('ar-EG')}
      </div>
    </div>
  );
}
