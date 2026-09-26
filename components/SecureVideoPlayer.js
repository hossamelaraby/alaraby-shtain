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

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function SecureVideoPlayer({ videoId }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const ytPlayerRef = useRef(null);

  const [stage, setStage] = useState('checking'); // checking | needs_otp | needs_tos | ready | error
  const [videoData, setVideoData] = useState(null);
  const [error, setError] = useState('');
  
  // مشغل الفيديو وأدوات التحكم الخاصة بالمنصة
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  // العلامة المائية المتحركة للأمان
  const [wmPos, setWmPos] = useState({ top: '25%', left: '25%' });
  const clientFp = typeof window !== 'undefined' ? simpleFingerprint() : '';
  const studentName = typeof window !== 'undefined' ? (localStorage.getItem('user_name') || '') : '';
  const studentPhone = typeof window !== 'undefined' ? (localStorage.getItem('user_phone') || localStorage.getItem('user_email') || '') : '';
  const studentIdentifier = studentName ? `${studentName} (${studentPhone})` : (studentPhone || 'طالب منصة العربي شتاين');

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('sb_access_token')}`,
    'X-Client-FP': clientFp,
  });

  // ---------- فحص أمني شامل: منع أدوات المطورين وكتم اختصارات النسخ ----------
  useEffect(() => {
    // 1. منع زر الفأرة الأيمن (Right Click) عالمياً في صفحة المحاضرة
    const preventContextMenu = (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };
    window.addEventListener('contextmenu', preventContextMenu);

    // 2. منع مفاتيح المطورين والنسخ والحفظ
    const preventKeys = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return false;
      }
      // Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        return false;
      }
      // Ctrl+U (عرض كود المصدر)
      if (e.ctrlKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+S (حفظ الصفحة)
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        return false;
      }
      // Ctrl+P (طباعة الصفحة)
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        return false;
      }
    };
    window.addEventListener('keydown', preventKeys);

    // 3. مراقبة تبديل التبويب أثناء تشغيل المحاضرة (الطبقة 13)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // إيقاف تشغيل الفيديو فوراً لمنع التشتت أو التسجيل بالخفاء
        if (ytPlayerRef.current?.pauseVideo) {
          try { ytPlayerRef.current.pauseVideo(); } catch (err) {}
        } else if (videoRef.current) {
          try { videoRef.current.pause(); } catch (err) {}
        }
        setIsPlaying(false);

        // تسجيل الحدث أمنياً
        fetch(`/api/videos/${videoId}/access`, {
          method: 'PATCH',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'student_switched_tabs' }),
        }).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('contextmenu', preventContextMenu);
      window.removeEventListener('keydown', preventKeys);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [videoId]);

  // ---------- فحص أمني للجهاز والاتفاقية ----------
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

  // ---------- جلب تصريح تشغيل الفيديو الآمن ----------
  useEffect(() => {
    if (stage !== 'ready') return;

    let hls;

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
          setError(body.error || 'تعذر جلب تصريح المحاضرة');
          setStage('error');
          return;
        }

        setVideoData(body);

        // إذا كان فيديو HLS مشفر
        if (body.videoType === 'hls' && body.manifestUrl) {
          const Hls = (await import('hls.js')).default;
          if (Hls.isSupported() && videoRef.current) {
            hls = new Hls();
            hls.loadSource(body.manifestUrl);
            hls.attachMedia(videoRef.current);
          } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
            videoRef.current.src = body.manifestUrl;
          }
        }
      } catch (err) {
        setError('تعذر الاتصال بخادم الفيديو');
        setStage('error');
      }
    }

    loadVideo();

    return () => {
      if (hls) hls.destroy();
    };
  }, [stage, videoId]);

  // ---------- ربط مشغل يوتيوب عبر Iframe API بأمان كامل وبدون أي عناصر يوتيوب ظاهرة ----------
  useEffect(() => {
    if (!videoData || videoData.videoType !== 'youtube') return;

    let pollTimer;
    let isMounted = true;

    function initPlayer() {
      if (!isMounted) return;
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 250);
        return;
      }

      const mountEl = document.getElementById('yt-player-mount');
      if (!mountEl) {
        setTimeout(initPlayer, 250);
        return;
      }

      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
      }

      try {
        ytPlayerRef.current = new window.YT.Player('yt-player-mount', {
          videoId: videoData.youtubeId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            iv_load_policy: 3,
            playsinline: 1,
            origin: typeof window !== 'undefined' ? window.location.origin : '',
            enablejsapi: 1,
          },
          events: {
            onReady: (e) => {
              if (!isMounted) return;
              try {
                const d = e.target.getDuration();
                if (d && !isNaN(d)) setDuration(d);
              } catch (err) {}
            },
            onStateChange: (e) => {
              if (!isMounted) return;
              // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
              if (e.data === 1) {
                setIsPlaying(true);
                setHasStarted(true);
              }
              if (e.data === 2) {
                setIsPlaying(false);
              }
              if (e.data === 0) {
                setIsPlaying(false);
                // تسجيل إتمام الطالب للمحاضرة
                fetch('/api/progress', {
                  method: 'POST',
                  headers: { ...authHeaders(), 'Content-Type': 'application/json' },
                  body: JSON.stringify({ video_id: videoId, completed: true }),
                }).catch(() => {});
              }
            },
          },
        });
      } catch (err) {
        console.error('فشل بدء مشغل يوتيوب الآمن:', err);
      }
    }

    if (!window.YT) {
      if (!document.getElementById('yt-api-script')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.id = 'yt-api-script';
        document.body.appendChild(tag);
      }
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
      setTimeout(initPlayer, 1200);
    } else {
      initPlayer();
    }

    pollTimer = setInterval(() => {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function') {
        try {
          const cur = ytPlayerRef.current.getCurrentTime();
          const dur = ytPlayerRef.current.getDuration();
          if (typeof cur === 'number' && !isNaN(cur)) setCurrentTime(cur);
          if (typeof dur === 'number' && !isNaN(dur) && dur > 0) setDuration(dur);
        } catch (e) {}
      }
    }, 500);

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch (e) {}
      }
    };
  }, [videoData, videoId]);

  // ---------- تحريك العلامة المائية عشوائياً لمنع تصوير الشاشة ----------
  useEffect(() => {
    const interval = setInterval(() => {
      setWmPos({
        top: `${12 + Math.random() * 60}%`,
        left: `${10 + Math.random() * 55}%`,
      });
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  // ---------- إخفاء شريط التحكم تلقائياً أثناء المشاهدة ----------
  useEffect(() => {
    let hideTimer;
    if (isPlaying) {
      hideTimer = setTimeout(() => setShowControls(false), 3500);
    } else {
      setShowControls(true);
    }
    return () => clearTimeout(hideTimer);
  }, [isPlaying, showControls]);

  // ---------- وظائف التحكم في التشغيل ----------
  function togglePlay() {
    if (videoData?.videoType === 'youtube') {
      if (!ytPlayerRef.current) return;
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setHasStarted(true);
        }
      } catch (e) {
        console.error('togglePlay error', e);
      }
    } else if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
          setHasStarted(true);
        }).catch(() => {});
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }

  function handleSeek(e) {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (videoData?.videoType === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(newTime, true);
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  }

  function jumpSeconds(offset) {
    const target = Math.max(0, Math.min(duration || 1000, currentTime + offset));
    setCurrentTime(target);
    if (videoData?.videoType === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        ytPlayerRef.current.seekTo(target, true);
      }
    } else if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  }

  function toggleMute() {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoData?.videoType === 'youtube') {
      if (ytPlayerRef.current) {
        if (newMuted) ytPlayerRef.current.mute();
        else ytPlayerRef.current.unMute();
      }
    } else if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  }

  function changeSpeed(speed) {
    setPlaybackSpeed(speed);
    if (videoData?.videoType === 'youtube') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setPlaybackRate === 'function') {
        ytPlayerRef.current.setPlaybackRate(speed);
      }
    } else if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  if (stage === 'checking') {
    return (
      <div className="card" style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', padding: 48, background: '#0b132b', color: '#fff' }}>
        <span className="spinner" style={{ width: 32, height: 32, marginBottom: 16 }}></span>
        <p style={{ color: '#38bdf8', fontWeight: 700, margin: 0 }}>جارٍ تأمين وفك تشفير المحاضرة بنظام العربي شتاين...</p>
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
        <strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>تعذر فتح المحاضرة</strong>
        <p style={{ margin: 0 }}>{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onMouseMove={() => setShowControls(true)}
      tabIndex={0}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); return false; }}
      style={{
        position: 'relative',
        maxWidth: 950,
        margin: '0 auto',
        borderRadius: isFullscreen ? 0 : 14,
        overflow: 'hidden',
        boxShadow: isFullscreen ? 'none' : '0 16px 40px rgba(0,0,0,0.7)',
        background: '#000',
        aspectRatio: '16/9',
        userSelect: 'none',
        outline: 'none',
      }}
    >
      {/* 1. إطار يوتيوب المقفل تماماً وبدون أي وصول للفأرة نهائياً (pointerEvents: none) */}
      {videoData?.videoType === 'youtube' && (
        <div
          style={{
            position: 'absolute',
            inset: -12,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div
            id="yt-player-mount"
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              transform: 'scale(1.05)',
            }}
          />
        </div>
      )}

      {/* 2. مشغل الفيديو المباشر أو المشفر (HTML5 / HLS) */}
      {(videoData?.videoType === 'direct' || videoData?.videoType === 'hls') && (
        <video
          ref={videoRef}
          src={videoData.videoType === 'direct' ? videoData.videoUrl : undefined}
          controls={false}
          playsInline
          style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              setDuration(videoRef.current.duration || 0);
            }
          }}
          onPlay={() => {
            setIsPlaying(true);
            setHasStarted(true);
          }}
          onPause={() => setIsPlaying(false)}
        />
      )}

      {/* درع الحماية الشامل بنسبة 100% (Click Shield): يمنع أي وصول لأي عنصر أو رابط أسفله نهائياً */}
      <div
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 20,
          cursor: 'pointer',
          background: 'transparent',
        }}
      />

      {/* العلامة المائية المتحركة للأمان لمنع تصوير الشاشة وسرقة المحتوى */}
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
          textShadow: '0 0 4px rgba(0,0,0,0.95)',
          background: 'rgba(0, 0, 0, 0.45)',
          padding: '4px 12px',
          borderRadius: 6,
          backdropFilter: 'blur(3px)',
          zIndex: 40,
          whiteSpace: 'nowrap',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        ⚛️ {studentIdentifier} • {new Date().toLocaleDateString('ar-EG')}
      </div>

      {/* زر وتشغيل بدء المشاهدة الكبير في المنتصف عند الإيقاف المؤقت أو قبل البدء */}
      {(!isPlaying || !hasStarted) && (
        <div
          onClick={togglePlay}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            zIndex: 26,
            cursor: 'pointer',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 34,
              boxShadow: '0 8px 30px rgba(2,132,199,0.6)',
              marginBottom: 12,
            }}
          >
            ▶
          </div>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
            {!hasStarted ? 'اضغط هنا لبدء مشاهدة المحاضرة' : 'استئناف المشاهدة'}
          </span>
          <span style={{ color: '#38bdf8', fontSize: 12, marginTop: 4 }}>
            🔒 محمية بنظام العربي شتاين للأمان الأكاديمي
          </span>
        </div>
      )}

      {/* شريط التحكم الاحترافي الكامل الخاص بالمنصة */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)',
          padding: '12px 16px 10px',
          zIndex: 35,
          transition: 'opacity 0.3s ease',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          direction: 'ltr',
        }}
      >
        {/* شريط التمرير (Seekbar) */}
        <div style={{ position: 'relative', width: '100%', marginBottom: 8 }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            style={{
              width: '100%',
              height: 5,
              accentColor: '#38bdf8',
              cursor: 'pointer',
              display: 'block',
            }}
          />
        </div>

        {/* أزرار التحكم */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff', fontSize: 13 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* تشغيل / إيقاف */}
            <button
              onClick={togglePlay}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: 0 }}
              title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>

            {/* تقديم وترجيع 10 ثواني */}
            <button
              onClick={() => jumpSeconds(-10)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', padding: 0 }}
              title="ترجيع 10 ثوانٍ"
            >
              ⏪ 10s
            </button>
            <button
              onClick={() => jumpSeconds(10)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, cursor: 'pointer', padding: 0 }}
              title="تقديم 10 ثوانٍ"
            >
              10s ⏩
            </button>

            {/* الوقت المنقضي / الإجمالي */}
            <span style={{ fontSize: 12, color: '#e2e8f0', fontFamily: 'monospace' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* كتم / تشغيل الصوت */}
            <button
              onClick={toggleMute}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer', marginLeft: 4 }}
              title={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
            >
              {isMuted ? '🔇' : '🔊'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* سرعة التشغيل */}
            <select
              value={playbackSpeed}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 4,
                padding: '2px 6px',
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              <option value={0.75} style={{ background: '#0b132b' }}>0.75x</option>
              <option value={1} style={{ background: '#0b132b' }}>1.0x عادي</option>
              <option value={1.25} style={{ background: '#0b132b' }}>1.25x</option>
              <option value={1.5} style={{ background: '#0b132b' }}>1.5x</option>
              <option value={1.75} style={{ background: '#0b132b' }}>1.75x</option>
              <option value={2} style={{ background: '#0b132b' }}>2.0x سريع</option>
            </select>

            {/* شارة المنصة بدلاً من شعار يوتيوب */}
            <span style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', letterSpacing: 0.5 }}>
              ⚛️ العربي شتاين
            </span>

            {/* ملء الشاشة */}
            <button
              onClick={toggleFullscreen}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, cursor: 'pointer', padding: 0 }}
              title="ملء الشاشة"
            >
              ⛶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
