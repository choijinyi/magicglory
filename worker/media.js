const escapeAttribute=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

// Archived pages used many live players as thumbnails. A local poster stays
// visible even when the visitor's browser blocks third-party video playback.
export function prepareMediaMarkup(markup){
 return markup.replace(/<iframe\b([^>]*)>[\s\S]*?<\/iframe>/gi,(original,attributes)=>{
  const source=attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1];
  const id=source?.match(/^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})(?:[?/#]|$)/i)?.[1];
  if(!id)return original;
  const title=attributes.match(/\btitle=["']([^"']+)["']/i)?.[1]||'공연영상';
  return `<span class="replica-video-preview" data-youtube-id="${id}" data-video-title="${escapeAttribute(title)}"><img src="/media/youtube/${id}.jpg" alt="${escapeAttribute(title)} 미리보기" loading="lazy" decoding="async" width="480" height="360"><span class="replica-play-icon" aria-hidden="true">▶</span><span class="replica-video-label">영상 보기</span></span>`;
 });
}
