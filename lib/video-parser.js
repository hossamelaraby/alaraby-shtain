/**
 * استخراج نوع ومصدر الفيديو بذكاء سواء كان يوتيوب، أو رابط مباشر، أو HLS
 */
export function parseVideoSource(storagePath) {
  if (!storagePath || typeof storagePath !== 'string') {
    return { type: 'unknown' };
  }

  const raw = storagePath.trim();

  // 1. يوتيوب بكل صيغه المعروفة
  // - https://youtu.be/q5gHTl5kdGw
  // - https://www.youtube.com/watch?v=q5gHTl5kdGw
  // - https://www.youtube.com/embed/q5gHTl5kdGw
  // - https://m.youtube.com/watch?v=q5gHTl5kdGw
  // - https://youtube.com/shorts/q5gHTl5kdGw
  const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([A-Za-z0-9_-]{11})/i;
  const ytMatch = raw.match(ytRegex);
  if (ytMatch) {
    const ytId = ytMatch[1];
    return {
      type: 'youtube',
      youtubeId: ytId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`,
    };
  }

  // إذا تم إدخال معرف يوتيوب فقط (11 حرف)
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
    return {
      type: 'youtube',
      youtubeId: raw,
      embedUrl: `https://www.youtube-nocookie.com/embed/${raw}?autoplay=1&enablejsapi=1&rel=0&modestbranding=1&playsinline=1`,
    };
  }

  // 2. روابط الفيديو المباشرة (MP4 / WebM / Cloud / Drive)
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    if (raw.includes('.m3u8')) {
      return {
        type: 'hls_url',
        url: raw,
      };
    }
    return {
      type: 'direct_url',
      url: raw,
    };
  }

  // 3. مجلد تشفير HLS داخل سوبابيز storage (encrypted-videos bucket)
  return {
    type: 'encrypted_hls',
    bucketPath: raw,
  };
}
