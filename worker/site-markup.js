export const familySiteLink='<a class="replica-family-link" href="https://m.blog.naver.com/glorymagic1" target="_blank" rel="noopener noreferrer">패밀리사이트 · 글로리매직 네이버 블로그 ↗</a>';
export const footerContact='남양주시 미금로 103 3층<br>전화번호 : <a href="tel:0317957021">031-795-7021</a>';

// Apply current business information to all archived pages at render time.
// The archived post bodies remain intact.
export function prepareSiteMarkup(markup){
 return markup.replace(/<footer\b[\s\S]*?<\/footer>/gi,footer=>footer
  .replace(/<i\b[^>]*class="fa fa-map-marker"[^>]*><\/i>&nbsp;경기도 남양주시 미금로 128번길1 2층[\s\S]*?(?=<\/div>)/,footerContact)
  .replace(/<select\b[^>]*>[\s\S]*?<\/select>/gi,select=>/페밀리사이트|패밀리사이트/.test(select)?familySiteLink:select));
}
