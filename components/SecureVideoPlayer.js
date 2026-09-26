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
  const [videoData, setVideoData] = useState(null);
  const [error, setError] = useState('');
  const [wmPos, setWmPos] = useState({ top: '15%', left: '15%' });
  const clientFp = typeof window !== 'undefined' ? simpleFingerprint() : '';
  const studentEmail = typeof window !== 'undefined' ? (localStorage.getItem('user_name') || localStorage.getItem('user_email') || 'طالب منصة العربي شتاين') : '';

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('sb_access_token')}`,
    'X-Client-FP': clientFp,
  });

  // ---------- تسلسل البوابات الأمنية ----------
  useEffect(() => {
    async function runGates() {
      try {
        const otpRes = await fetch('/api/auth/request-otp', {
          method: 'POST',
          headers: authHeaders(),
        });
        const otpBody = await otpRes.json().catch(() => ({}));

        if (otpBody.requiresOtp) {
          setStage('needs_otp');
          return;
        }
        setStage('ready');
      } catch (err) {
        setStage('ready');
      }
    }

    runGates();
  }, [videoId]);

  // ---------- جلب تصريح وتشغيل الفيديو ----------
  useEffect(() => {
    if (stage !== 'ready') return;

    let hls;
    let refreshTimer;

    async function loadVideo() {
      try {
        const res = await fetch(`/api/videos/${videoId}/access`, {
          method: 'POST',
          headers: authHeaders(),
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (body.code === 'TOS_REQUIRED') {
            setStage('needs_tos');
            return;
          }
          setError(body.error || 'تعذر تشغيل الفيديو');
          setStage('error');
          return;
        }

        setVideoData(body);

        // إذا كان الفيديو من نوع HLS (مباشر أو مشفر)
        if (body.videoType === 'hls' && body.manifestUrl) {
          const Hls = (await import('hls.js')).default;
          if (Hls.isSupported() && videoRef.current) {
            hls = new Hls();
            hls.loadSource(body.manifestUrl);
            hls.attachMedia(videoRef.current);
          } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = body.manifestUrl;
          }

          if (body.expiresInSeconds && body.expiresInSeconds < 300) {
            refreshTimer = setTimeout(loadVideo, Math.max((body.expiresInSeconds - 15) * 1000, 5000));
          }
        }
      } catch (err) {
        setError('تعذر الاتصال بخادم تشغيل الفيديو');
        setStage('error');
      }
    }

    loadVideo();

    // تحريك العلامة المائية عشوائياً فوق الفيديو لمنع التصوير والسرقة
    const wmInterval = setInterval(() => {
      setWmPos({
        top: `${8 + Math.random() * 74}%`,
        left: `${6 + Math.random() * 68}%`,
      });
    }, 7000);

    // تسجيل إكمال المشاهدة لفتح الامتحان
    function markProgress() {
      fetch('/api/progress', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: videoId, completed: true }),
      }).catch(() => {});
    }

    // إذا كان فيديو HLS أو Direct، نسجل عند انتهائه
    const vEl = videoRef.current;
    if (vEl) {
      vEl.addEventListener('ended', markProgress);
    }

    // تسجيل تقدم تلقائي بعد فترة مشاهدة معقولة
    const autoProgressTimer = setTimeout(markProgress, 45000);

    return () => {
      if (hls) hls.destroy();
      clearTimeout(refreshTimer);
      clearTimeout(autoProgressTimer);
      clearInterval(wmInterval);
      if (vEl) {
        vEl.removeEventListener('ended', markProgress);
      }
    };
  }, [stage, videoId]);

  if (stage === 'checking') {
    return (
      <div className="card" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', padding: 48, background: '#0b132b', color: '#fff' }}>
        <span className="spinner" style={{ width: 32, height: 32, marginBottom: 16 }}></span>
        <p style={{ color: '#38bdf8', fontWeight: 700, margin: 0 }}>جارٍ فحص تصريح المشاهدة وتحميل المحاضرة...</p>
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
        <strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>تعذر تشغيل المحاضرة</strong>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        maxWidth: 900,
        margin: '0 auto',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
        background: '#000',
        aspectRatio: '16/9',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 1. مشغل يوتيوب الآمن */}
      {videoData?.videoType === 'youtube' && (
        <iframe
          src={videoData.embedUrl}
          title={videoData.title || 'محاضرة فيزياء — منصة العربي شتاين'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
        />
      )}

      {/* 2. مشغل الفيديو المباشر (MP4 / WebM) */}
      {videoData?.videoType === 'direct' && (
        <video
          ref={videoRef}
          src={videoData.videoUrl}
          controls
          autoPlay
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      )}

      {/* 3. مشغل HLS المشفر */}
      {videoData?.videoType === 'hls' && (
        <video
          ref={videoRef}
          controls
          autoPlay
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      )}

      {/* العلامة المائية الديناميكية الآمنة تطفو فوق أي نوع فيديو لمنع السرقة */}
      <div
        style={{
          position: 'absolute',
          top: wmPos.top,
          left: wmPos.left,
          color: 'rgba(255, 255, 255, 0.45)',
          fontSize: 12,
          fontWeight: 'bold',
          pointerEvents: 'none',
          userSelect: 'none',
          transition: 'top 1.2s ease, left 1.2s ease',
          textShadow: '0 0 4px rgba(0,0,0,0.85)',
          background: 'rgba(0, 0, 0, 0.35)',
          padding: '3px 10px',
          borderRadius: 6,
          backdropFilter: 'blur(2px)',
          zIndex: 30,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
        }}
      >
        ⚛️ {studentEmail} • {new Date().toLocaleDateString('ar-EG')}
      </div>
    </div>
  );
}
