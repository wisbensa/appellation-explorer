import {textValue} from './public-display.mjs';
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels = {ja:{notice:'補足',sensory:'色・香り・味わい',alcohol:'度数の規定',composition:'ブドウ品種',ageing:'熟成',production:'生産・栽培',area:'生産区域',varietalLabelling:'ラベルの条件'},en:{notice:'Notes',sensory:'Colour, aroma and taste',alcohol:'Alcohol requirements',composition:'Grape varieties',ageing:'Ageing',production:'Production and cultivation',area:'Production area',varietalLabelling:'Labelling conditions'}};
const status = {ja:{unknown:'未確認',unverified:'未確認',not_found:'記載未確認',notApplicable:'この対象には適用されません',conflict:'資料によって記載が異なります',no_obligation:'この義務はないことが確認されています'},en:{unknown:'Not confirmed',unverified:'Unverified',not_found:'Not found in checked material',notApplicable:'Not applicable to this target',conflict:'Sources give conflicting information',no_obligation:'Officially confirmed that this obligation does not apply.'}};
const local = (text,lang) => typeof text==='string'?text:text?.[lang] || '';
const paragraph = (text,cls='') => text?`<p${cls?` class="${cls}"`:''}>${esc(text)}</p>`:'';
const paragraphs = (texts,lang) => (texts||[]).map(t=>paragraph(local(t,lang))).join('');
const disclosure = (id,title,body,cls='') => `<details id="${esc(id)}" class="${cls}" data-reading-anchor><summary>${esc(title)}</summary>${body}</details>`;

function untranslatedOriginal(text,lang,partial=false) {
 const original=typeof text?.original==='string'?text.original:'';
 if(!original)return '';
 const label=lang==='ja'?(partial?'未訳を含む原文':'原文（未訳）'):(partial?'Original including untranslated text':'Original (untranslated)');
 return `<div class="untranslated-original">${paragraph(label,'untranslated-label')}${paragraph(original)}</div>`;
}
const readingParagraph = (text,lang) => paragraph(local(text,lang)) || untranslatedOriginal(text,lang);

/** A reader's field: untranslated source text is inline; source controls stay in Sources. */
export function renderDetailField(field,{lang='ja',compositionHTML,grapeHTML}={}) {
 const f=field.source,ja=lang==='ja';
 let content = f.state==='known'?'':paragraph(status[lang][f.state]||status[lang].unknown,'field-state');
 if(f.compositionView&&compositionHTML)content+=compositionHTML(f,field.id);
 else {
   if(f.translation?.text)content+=readingParagraph(f.translation.text,lang)||untranslatedOriginal(f.text,lang);
   else if(!field.readings.length)content+=readingParagraph(f.text,lang);
   content+=field.readings.map(reading=>{
     const value=reading.source,translated=local(value.translation,lang)||local(value.text,lang);
     const scoped=reading.notes.filter(n=>!['target-label','source-context'].includes(n.role));
     const partial=scoped.filter(n=>n.role==='partial-reading');
     const notes=scoped.filter(n=>n.role!=='partial-reading');
     let body=paragraph(translated);
     if(!translated&&!value.text?.original)body+=paragraph(ja?'説明は未確認です。':'Explanation not confirmed.');
     body+=partial.map(n=>`<div class="partial-reading" id="${esc(n.id)}">${readingParagraph(n.text,lang)}</div>`).join('');
     if(!translated||reading.coverage==='partial')body+=untranslatedOriginal(value.text,lang,Boolean(translated||partial.some(n=>local(n.text,lang))));
     body+=notes.map(n=>{const originalOnly=translated&&(reading.coverage==='complete'||(value.translation&&reading.coverage!=='partial'))&&n.role==='unclassified'&&!local(n.text,lang)&&n.text?.original;const body=(originalOnly?paragraph(ja?'原文の補足':'Original note','untranslated-label')+paragraph(n.text.original):readingParagraph(n.text,lang))||(n.role==='qualification'?paragraph(ja?'適用条件の訳は未確認です。':'A qualification is not available in this language.'):'');return body?`<div class="reading-qualification" id="${esc(n.id)}">${body}</div>`:'';}).join('');
     return `<div class="field-reading ${field.key==='alcohol'?'alcohol-value':''}" id="${esc(reading.id)}" data-reading-anchor>${body}</div>`;
   }).join('');
   const itemBody=(f.items||[]).map(item=>`<p>${item.grapeId&&grapeHTML?grapeHTML(item.grapeId):''}${esc(local(item.text,lang)||item.text?.original||'')}</p>`).join('');
   content+=(f.items||[]).filter(i=>i.grapeId).length>6?`<div class="grape-list"><label for="grape-query-${esc(field.id)}">${ja?'この一覧から品種を探す':'Find a grape in this list'}<input id="grape-query-${esc(field.id)}" type="search" data-grape-search></label><div class="grape-search-results" aria-live="polite"></div><details><summary>${ja?'品種の一覧を見る':'View grape list'}</summary><div class="grape-buttons">${itemBody}</div></details></div>`:itemBody;
 }
 content+=(f.calculation||[]).map(t=>readingParagraph(t,lang)).join('')+readingParagraph(f.unmappedNotice,lang);
 if(f.statusDetail)content+=disclosure(`${field.id}-status`,local(f.statusDetail.label,lang),paragraph(local(f.statusDetail.text,lang)),'field-status');
 if(f.guide)content+=disclosure(`${field.id}-guide`,local(f.guide.title,lang),paragraphs(f.guide.paragraphs,lang),field.key==='alcohol'?'alcohol-guide':'field-guide');
 if(field.key==='alcohol'&&f.state==='known')content+=`<p class="alcohol-basis">${ja?'規定値です。個々のボトルの実測値ではありません。':'These are requirements, not the measured alcohol of an individual bottle.'}</p><details id="${esc(field.id)}-metric-help"><summary>${ja?'総と実の違い':'Total and actual alcohol'}</summary><p>${ja?'実アルコール度数は含まれるアルコール、総アルコール度数は糖がアルコールになり得る分も含む値です。':'Actual alcohol is the alcohol present; total alcohol also includes potential alcohol from sugars.'}</p></details>`;
 return `<div class="detail-field" data-field="${esc(field.key)}" data-state="${esc(field.state)}">${content}</div>`;
}

/** No first-value shortcut. Every supplied eligibility flag is respected. */
export function renderSubjectOverview(subject,{lang='ja',termLabel=()=>'',typeIcon=()=>'',overviewBudget=160}={}) {
 const ja=lang==='ja';
 const typeNames=subject.types.map(termLabel).filter(Boolean),qualifiers=subject.qualifiers.map(termLabel).filter(Boolean);
 const kinds=typeNames.length?paragraph(`${ja?'種類：':'Type: '}${typeNames.join('・')}`,'overview-kind'):'';
 const additional=qualifiers.length?paragraph(`${ja?'追加区分：':'Additional designation: '}${qualifiers.join('・')}`,'overview-qualifier'):'';
 const jump=(field,text)=>`<button type="button" class="overview-entry" data-action="subject-field" data-detail="detail-${esc(subject.modelId)}" data-field="${esc(field.id)}">${esc(text)}</button>`;
 const overview=['sensory','alcohol'].map(key=>{
   const f=subject.fields.find(f=>f.key===key);if(!f)return '';
   if(f.state!=='known')return ''; // Unknown fields become visible when intentionally opened.
   const selected=f.readings.filter(r=>r.overviewEligible);
   const fullLength=selected.reduce((n,r)=>n+(local(r.source.translation,lang)||local(r.source.text,lang)).length+r.notes.filter(n=>n.role==='qualification').reduce((n,note)=>n+local(note.text,lang).length,0),0);
   if(selected.length!==f.readings.length||!selected.length||selected.some(r=>(!local(r.source.translation,lang)&&!local(r.source.text,lang))||r.notes.some(n=>n.role==='qualification'&&!local(n.text,lang)))||fullLength>overviewBudget)return jump(f,ja?(key==='sensory'?'味わいの説明を詳しく読む':'度数の条件を詳しく読む'):(key==='sensory'?'Read the description':'Read alcohol requirements'));
   return `<div class="overview-field"><span class="overview-label">${esc(labels[lang][key])}</span>${selected.map(r=>{
     const text=local(r.source.translation,lang)||local(r.source.text,lang);
     return paragraph(text)+r.notes.filter(n=>n.role==='qualification').map(n=>paragraph(local(n.text,lang),'overview-qualification')).join('');
   }).join('')}</div>`;
 }).join('');
 return `<div class="wine-overview">${subject.types.map(typeIcon).join('')}${kinds}${additional}${overview}</div>`;
}

function originalVersions(value,lang) {
 if(typeof value==='string')return paragraph(value);
 if(!value||typeof value!=='object')return '';
 return [...new Set([value.original,value[lang],value.en,value.ja].filter(v=>typeof v==='string'&&v))].map(v=>paragraph(v)).join('');
}
function evidenceText(evidence) {
 return (evidence||[]).map(e=>`<figure class="source-quote"><figcaption>${esc(e.locator)}</figcaption>${e.conditions?paragraph(e.conditions):''}<blockquote lang="${esc(e.language||'und')}">${esc(e.quote)}</blockquote></figure>`).join('');
}
function sourceLinks(edges,lang) {
 return edges.length?`<ul class="citation-links">${edges.map((edge,i)=>`<li><a id="${esc(edge.id)}" href="#${esc(edge.to)}" data-action="section-jump" data-target="${esc(edge.to)}">${lang==='ja'?'引用':'Citation'} ${i+1}</a></li>`).join('')}</ul>`:'';
}
function originalField(field,lang) {
 const f=field.source;
 let body=originalVersions(f.text,lang)+originalVersions(f.translation?.text,lang)+originalVersions(f.translation?.note,lang);
 if(f.original)body+=paragraph(f.original.text);
 body+=field.readings.map(r=>`<section class="source-reading" id="source-${esc(r.id)}">${originalVersions(r.source.text,lang)}${originalVersions(r.source.translation,lang)}${sourceLinks(r.citations,lang)}${r.notes.map(n=>`<div class="source-note" id="source-${esc(n.id)}">${originalVersions(n.text,lang)}</div>`).join('')}</section>`).join('');
 body+=(f.calculation||[]).map(t=>originalVersions(t,lang)).join('')+originalVersions(f.unmappedNotice,lang);
 if(f.statusDetail)body+=originalVersions(f.statusDetail.label,lang)+originalVersions(f.statusDetail.text,lang);
 if(f.guide)body+=originalVersions(f.guide.title,lang)+(f.guide.paragraphs||[]).map(t=>originalVersions(t,lang)).join('');
 body+=field.items.map(item=>`<section id="source-${esc(item.id)}">${originalVersions(item.source.text,lang)}${sourceLinks(item.citations,lang)}</section>`).join('');
 // All evidence occurrences retain their model edges; only identical quotes share display.
 const seen=new Set();
 const collect=node=>{if(!node||typeof node!=='object')return '';let html='';if(Array.isArray(node.evidence))for(const e of node.evidence){const key=JSON.stringify(e);if(!seen.has(key)){seen.add(key);html+=evidenceText([e]);}}for(const [k,v] of Object.entries(node))if(k!=='evidence'&&v&&typeof v==='object')html+=Array.isArray(v)?v.map(collect).join(''):collect(v);return html;};
 body+=sourceLinks(field.citations,lang);
 // Typed nested constraint evidence is also retained, without making new meaning.
 if(f.compositionView)body+=collect(f.compositionView);
 return `<details class="source-field" data-field="${esc(field.key)}" data-state="${esc(field.state)}" id="source-${esc(field.id)}"><summary><h4>${esc(labels[lang][field.key]||field.key)}</h4></summary>${body}</details>`;
}

/** One final source entrance; one heading per owner/field, never per deferred fragment. */
export function renderDetailSources(model,{lang='ja',ownerName=o=>textValue(o.source.name,lang),documentHTML}={}) {
 const ja=lang==='ja';
 const owners=model.owners.map(owner=>{
   let content=originalVersions(owner.source.name,lang)+originalVersions(owner.source.shortName,lang)+originalVersions(owner.source.scope,lang)+owner.fields.map(f=>originalField(f,lang)).join('');
   content+=owner.notes.map(n=>disclosure(`source-${n.id}`,ja?'対象についての記載':'Target notes',originalVersions(n.source.text||n.source,lang)+(n.source.text?originalVersions(n.source.original,lang):'')+evidenceText(n.source.evidence))).join('');
   content+=sourceLinks(owner.citations,lang);
   const source=owner.source;
   if(source.applicability)content+=originalVersions(source.applicability.text,lang)+(source.applicability.historicalSummaries||[]).map(t=>originalVersions(t,lang)).join('')+evidenceText(source.applicability.evidence);
   if(source.productionConditions)content+=originalVersions(source.productionConditions.title,lang)+(source.productionConditions.paragraphs||[]).map(t=>originalVersions(t,lang)).join('')+evidenceText(source.productionConditions.evidence);
   for(const amendment of source.conditionalAmendments||[])content+=originalVersions(amendment.title,lang)+(amendment.originals||[]).map(o=>paragraph(o.text)).join('')+evidenceText(amendment.evidence);
   if(source.grapeNonUse){for(const item of source.grapeNonUse.cases||[])content+=(item.conditions||[]).map(t=>originalVersions(t,lang)).join('')+evidenceText(item.evidence||item.witness?.evidence);for(const cell of source.grapeNonUse.domain?.cells||[])content+=evidenceText(cell.evidence);}

   return `<details class="source-owner" id="source-${esc(owner.modelId)}" data-owner-id="${esc(owner.id)}"><summary><h3>${esc(ownerName(owner))}</h3></summary>${content}</details>`;
 }).join('');
 const statements=model.documentStatements.map(s=>`<section id="source-${esc(s.id)}"><h3>${esc(textValue(s.source.label,lang))}</h3>${originalVersions(s.source.text,lang)}${originalVersions(s.source.explanationJa,lang)}${(s.source.contexts||[]).map(c=>originalVersions(c.text||c,lang)).join('')}${sourceLinks(s.citations,lang)}</section>`).join('');
 const citations=`<section class="source-citations"><h3>${ja?'引用':'Citations'}</h3>${model.citations.map(c=>`<section id="${esc(c.id)}" tabindex="-1">${evidenceText([c.source])}</section>`).join('')}</section>`;
 const grapes=model.publishedGrapes.map(entry=>`<section><h3>${ja?'掲載品種':'Listed grape'}: ${esc(textValue(entry.grape?.name,lang))}</h3>${entry.observations.map(o=>`<section id="source-${esc(o.id)}">${(o.source.conditions||[]).map(t=>originalVersions(t.text||t,lang)).join('')}${sourceLinks(o.citations,lang)}</section>`).join('')}</section>`).join('');
 const documents=model.documents.map(source=>documentHTML?documentHTML(source):`<article><h3>${esc(source.title)}</h3>${paragraph(source.agency)}</article>`).join('');
 return disclosure('sources',ja?'出典・公式原文':'Sources and official originals',owners+statements+grapes+citations+documents,'sources-disclosure');
}
