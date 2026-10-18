import {sourceDomainDisplay} from './source-domain.mjs';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
// The full source text belongs to the existing bottom Sources disclosure.
// Keep the visible legal conditions concise; guidance is folded separately.
export function sourceDomainPresentation(rule,language='en'){
 const display=sourceDomainDisplay(rule,language);
 return display?{display,main:`<section class="source-domain"><p>${escape(display.label)}</p>${display.summaries.map(summary=>`<p class="source-domain-condition">${escape(summary)}</p>`).join('')}</section>`,guide:`<p>${escape(display.notice)}</p>`}:{display:null,main:'',guide:''};
}
