import { regulationExplanation } from './lib/regulation-explanations.mjs';
import { fieldIssues, alcoholDisplayProof, ageingStartExplanation } from './lib/field-integrity.mjs';
import { displayName, buildCandidates, findCandidates, searchAppellations, upsertFilter, regionBelongs, evaluateWine } from './lib/search.mjs';
import { ratioBasis, evaluateGrapeUse, grapeDutyProof, grapeUsePermissionProved } from './lib/blend.mjs';

const words = {
  ja: { back: '戻る', home: 'ホーム', title: 'ワイン呼称の探求', intro: '産地やブドウ品種を手がかりに、気になるワインの呼称を見つける。', search: '呼称・地域・品種・条件を探す', country: '国', region: '地域', appellation: '呼称', designation: '地理的名称', grape: '品種', gi: 'EU区分', traditional: '伝統的呼称', type: 'ワインのタイプ', qualifier: '公式の追加表示', countries: '国から探す', regions: '地域から探す', mainRegions: '公開済みの産地', appellations: 'この地域の呼称', include: '含む', exclude: '除外', add: '条件に追加', addExclude: '除外して追加', explore: '探索する', remove: '削除', close: '閉じる', recent: '最近見た', about: 'このアプリについて / Data & Sources', results: '件の呼称', unknown: '規定情報が不足して判定できない対象があります。', noResults: 'すべての条件に一致する呼称がありません。条件を一つ外して、探索を続けられます。', noCandidates: '一致する候補がありません。別の名称や公式原語で検索できます。', noRecent: 'まだ閲覧した呼称はありません。', noData: 'この公開版には掲載済みの呼称がありません。', original: '公式原語', parent: '所属する呼称', geoNames: 'この呼称の地理的名称', matched: '今回の条件に一致', composition: '品種構成', alcohol: 'アルコール規定', ageing: '熟成規定', sensory: '公式の色・香り・味わい', production: '生産・栽培の詳細', area: '公式生産区域', sources: '出典 / Sources', sourceLink: '公式資料を開く', agency: '出典機関', retrieved: '取得日', verified: '検証日', published: '資料の更新・公開日', version: '公開データ版', raw: '公式原文', evidence: '出典・公式原文', minimum: '最低', maximum: '最大', total: '合計', permitted: '使えるブドウ品種', includeReason: 'この品種を使用する配合が公式規定上可能', excludeReason: 'この品種なしで公式規定を満たせる', excludeHelp: '「不使用でも可」は、その品種を使わずに造れるタイプを探します。「使用可能」は使えることを示し、必須とは限りません。除外・複合条件は同時に成立する根拠がある場合だけ一致します。', changed: '品種の除外条件を「含む」に変更しました。', confirmed: '確認済み', no_obligation: 'この義務がないことを公式に確認しています。', not_applicable: 'このワインには適用されません。', not_found: 'この項目はまだ確認できていません。規定がないことを意味しません。', unverified: 'この項目の確認が完了していません。', retry: '再読み込み', loadFailed: '公開データを読み込めませんでした。', regionSearch: 'この地域を条件に追加', detailInfo: '公式規定を Appellation Explorer が検索・参照用に整理した情報です。', allRules: 'その他の規定', header: '公式規定からワインを探索', sourcesEmpty: '参照できる出典情報がありません。', state: '確認状況', share: '条件をURLで共有できます。', regionContext: '地域の探索経路', aboutText: 'Appellation Explorerは、ワインの公式規定を検索・探索しやすく整理したサービスです。公的機関が運営・保証する公式サービスではありません。', aboutProcess: '公式ウェブページ・登録情報・生産規定等を取得し、項目の抽出、名称・比率・適用条件の整理、検証を行っています。表示名や翻訳と公式原文は区別して保持します。', aboutSearch: '品種の検索は規定上使えることを示し、販売中のボトルの配合や生産の実態を保証しません。根拠を確認できた比率や必須条件を詳細に示します。必須性が未確認でも、任意とは断定しません。条件はすべて同じワイン・同じ適用範囲・一つの配合で評価します。', aboutUpdate: '取得・検証・必要な人間判断を経て、明示的に承認された版だけを公開します。取得失敗や確認不足を「規定なし」に置き換えません。各呼称のSourcesから資料・取得日を確認できます。', noRegion: 'この階層に掲載済みの地域がありません。', recentHelp: '閲覧履歴はこの端末にだけ保存されます。', noTranslations: '確認済みの翻訳がない項目は公式原語を表示しています。' },
  en: { back: 'Back', home: 'Home', title: 'Start with a place. Follow a grape.', intro: 'Explore wine appellations and permitted grapes through official regulations.', search: 'Find appellations, regions, grapes or conditions', country: 'Country', region: 'Region', appellation: 'Appellation', designation: 'Geographic designation', grape: 'Grape', gi: 'EU category', traditional: 'Traditional term', type: 'Wine type', qualifier: 'Official additional term', countries: 'Explore by country', regions: 'Explore regions', mainRegions: 'Published wine regions', appellations: 'Appellations in this region', include: 'Include', exclude: 'Exclude', add: 'Add condition', addExclude: 'Exclude', explore: 'Explore', remove: 'Remove', close: 'Close', recent: 'Recently viewed', about: 'About / Data & Sources', results: 'appellations', unknown: 'Some appellations cannot be evaluated because regulation information is incomplete.', noResults: 'No appellation meets every condition. Remove a condition to continue exploring.', noCandidates: 'No matching suggestions. Try another name or an official original name.', noRecent: 'No appellations viewed yet.', noData: 'This data version contains no published appellations.', original: 'Official original name', parent: 'Appellation', geoNames: 'Geographic names within this appellation', matched: 'Matches your conditions', composition: 'Grape composition', alcohol: 'Alcohol requirements', ageing: 'Ageing requirements', sensory: 'Official colour, aroma and taste', production: 'Production and cultivation', area: 'Official production area', sources: 'Sources', sourceLink: 'Open official source', agency: 'Authority', retrieved: 'Retrieved', verified: 'Verified', published: 'Document update / publication', version: 'Published data version', raw: 'Official original text', evidence: 'Evidence and original text', minimum: 'Minimum', maximum: 'Maximum', total: 'Combined', permitted: 'Permitted grapes', includeReason: 'An officially permitted composition can use this grape', excludeReason: 'A compliant composition can omit this grape', excludeHelp: 'Excluding a grape finds wines that can be made without it. Include means permitted, not necessarily required. Exclusion and combined conditions match only when proved simultaneously possible.', changed: 'The grape condition has changed from exclude to include.', confirmed: 'Confirmed', no_obligation: 'Officially confirmed that this obligation does not apply.', not_applicable: 'Not applicable to this wine.', not_found: 'This requirement has not yet been confirmed. This does not establish that no requirement exists.', unverified: 'Verification of this item is incomplete.', retry: 'Reload', loadFailed: 'Unable to load the published data.', detailInfo: 'Official regulations organised by Appellation Explorer for search and reference.', allRules: 'Other requirements', header: 'Explore wine through official regulations', sourcesEmpty: 'No source information is available.', state: 'Verification', share: 'Share these conditions through the URL.', regionContext: 'Geographic exploration path', aboutText: 'Appellation Explorer organises official wine regulations for search and exploration. It is not an official service operated or endorsed by a public authority.', aboutProcess: 'We retrieve official web pages, registration records and product specifications, extract fields, organise names, ratios and applicability, and validate the results. Display names and translations are stored separately from the original text.', aboutSearch: 'Grape search describes what the regulations permit. It does not guarantee the composition of a bottle or actual production practice. Details show evidenced ratios and obligations. Unconfirmed mandatory use is not treated as optional. All conditions are evaluated for the same wine, scope and single composition.', aboutUpdate: 'A version is published only after retrieval, validation, any necessary human decisions and an explicit release. Retrieval failures and missing information never become “no requirement”. Each appellation’s Sources lists documents and retrieval dates.', noRegion: 'No published regions at this level.', recentHelp: 'Viewing history is stored only on this device.', noTranslations: 'Fields without verified translations use the official original language.' }
};

Object.assign(words.ja, {
  aboutPersonal: 'このアプリは、営利を目的とせず、個人の趣味として制作・運営しています。',
  aboutAccuracy: '公式資料をもとに情報を整理していますが、読み取り・翻訳・更新の過程で、誤りや古い情報が含まれる場合があります。正確な内容は、掲載している公式資料をご確認ください。',
  aboutFeedback: 'お気づきの点やご意見は、制作者へ直接お知らせください。'
});
Object.assign(words.en, {
  aboutPersonal: 'This app is created and maintained as a personal hobby, without a commercial purpose.',
  aboutAccuracy: 'The information is organised from official sources, but reading, translation and updates may introduce errors or leave information out of date. Please consult the linked official documents for accurate information.',
  aboutFeedback: 'Please contact the creator directly with anything you notice or any feedback.'
});

Object.assign(words.ja, { archiveDocument: 'アーカイブ内文書', documentHash: '文書の SHA-256', archiveHash: 'アーカイブの SHA-256', originalIdentity: '原本を識別する情報' });
Object.assign(words.en, { archiveDocument: 'Document in archive', documentHash: 'Document SHA-256', archiveHash: 'Archive SHA-256', originalIdentity: 'Identify the original document' });
Object.assign(words.ja, { conditionalChanges: '条件付きの変更', ageingLocation: '熟成場所', actDate: '法令の日付', commencement: '開始の基準', applicabilityUnknown: 'この条件の現在の適用状態は未確認です。公示日を基準とする条件を保持しています。', applicabilityActive: 'この条件が適用されることを確認しています。', applicabilityExpired: 'この条件の適用期間が終了したことを確認しています。' });
Object.assign(words.en, { conditionalChanges: 'Conditional amendments', ageingLocation: 'Ageing location', actDate: 'Act date', commencement: 'Commencement', applicabilityUnknown: 'Current applicability of this condition is unverified. Its publication-relative conditions are retained.', applicabilityActive: 'This condition is confirmed to apply.', applicabilityExpired: 'This condition is confirmed to have expired.' });

Object.assign(words.ja, { basis_vineyard: '栽培するブドウ品種の割合', basis_grapes: '使用するブドウ品種の割合', basis_must: '果汁・果醪に使う品種の割合', basis_wine: 'ワインに使う品種の割合', basis_mixed: '複数の段階に関わる割合', basis_unknown: '割合の対象は未確認', basisNotice: '畑・原料葡萄・果汁・完成ワインの比率は同じものではありません。この規定では、品種の使用可否を判定できない条件が残っています。', sourceUseNotice: '品種の使用可否は、規定されたブドウの由来から判定します。表示比率を完成ワインの配合へ換算していません。植栽上の必須性だけでは、その品種の使用が必須とは断定しません。', listedGrapes: '規定に記載された品種' });
Object.assign(words.en, { basis_vineyard: 'Source-vineyard variety composition', basis_grapes: 'Raw grape composition', basis_must: 'Must composition', basis_wine: 'Finished-wine composition', basis_mixed: 'Rules covering multiple production stages', basis_unknown: 'Ratio basis not yet verified', basisNotice: 'Vineyard, raw grape, must and finished-wine proportions are distinct. Some grape-use conditions remain unresolved under these rules.', sourceUseNotice: 'Grape-use permission follows the stated fruit sources. Displayed ratios are not converted into a finished-wine recipe. Required planting alone does not establish mandatory fruit use.', listedGrapes: 'Grapes listed in the regulation' });

Object.assign(words.ja, { addExclude: '除外条件に追加', changeExclude: '除外条件に変更', not_found: 'この項目はまだ確認できていません。規定がないことを意味しません。', unverified: '内容の確認が未完了です。', noCandidates: '収録範囲に一致する候補がありません。未収録の名称もあります。', missingTarget: 'この対象は現在の収録データに見つかりません。', invalidLink: '共有条件の一部が壊れているか、現在のデータでは対象不明です。条件を確認・削除してください。', reset: '条件をクリアしてやり直す', coverage: '収録範囲', moreCandidates: '候補をさらに表示', grapeSearch: 'この一覧から品種を探す', commonRules: '品種構成', commonReference: '共通の品種・適用条件を見る', cultivation: '栽培・比率の根拠', totalAlcohol: '総アルコール度数', actualAlcohol: '実アルコール度数', naturalAlcohol: '天然アルコール度数', totalAgeing: '総熟成', wood: '木樽での熟成', bottle: '瓶内熟成', included_in_total: '総熟成期間の内数', varietalLabelling: 'ボトルラベルに品種名を記載する場合', unknownNames: '判定できない呼称', archiveDownload: '7zアーカイブをダウンロード', sourceDocument: '公式文書', rawOnly: '詳細は下の根拠・原文で確認できます。' });
Object.assign(words.en, { regionSearch: 'Add this region as a condition', changeExclude: 'Change to exclusion', addExclude: 'Add exclusion condition', not_found: 'This item has not been extracted. This does not mean there is no requirement.', missingTarget: 'This target is not present in the current dataset.', invalidLink: 'Some shared conditions are malformed or refer to unknown targets. Review or remove these conditions.', reset: 'Clear conditions and start again', coverage: 'Coverage', moreCandidates: 'Show more suggestions', grapeSearch: 'Find a grape in this list', commonRules: 'Grape rules shared by these types', commonReference: 'See the shared grape rules above', cultivation: 'Cultivation and ratio evidence', totalAlcohol: 'Total alcohol', actualAlcohol: 'Actual alcohol', naturalAlcohol: 'Natural alcohol', totalAgeing: 'Total ageing', wood: 'Wood ageing', bottle: 'Bottle ageing', included_in_total: 'Included in total ageing', varietalLabelling: 'Varietal label requirements', unknownNames: 'Unresolved appellations', archiveDownload: 'Download 7z archive', sourceDocument: 'Official document', rawOnly: 'Details are retained in the evidence and original text below.' });

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const button = (text, action, attributes = '', className = '') => `<button type="button" data-action="${action}" class="${className}" ${attributes}>${escape(text)}</button>`;
const t = key => words[state.lang][key] ?? key;
let data;
let candidates = [];
let state = history.state?.ae ? history.state.state : readURL();
let preferredLanguage = state.lang;
let candidateLimit = 12;
let candidatesHidden = false;
let menuFocusIndex = null;
let depth = history.state?.ae ? history.state.depth : 0;
let snapshot = history.state?.ae ? history.state.snapshot : null;
let overlay = history.state?.ae ? history.state.overlay : null;
let pendingAfterClose = null;
let scrollTimer;
let composingQuery = false;
let restoreFrame;

function readURL() {
  const params = new URLSearchParams(location.hash.slice(1));
  let filters = [], invalidLink = false;
  try { filters = JSON.parse(params.get('f') || '[]'); } catch { invalidLink = true; }
  const rawFilters = filters;
  filters = Array.isArray(filters) ? filters.filter(item => ['country', 'region', 'grape', 'gi', 'traditional', 'type', 'qualifier'].includes(item?.kind) && typeof item.id === 'string' && ['include', 'exclude'].includes(item.mode)) : [];
  invalidLink ||= params.has('invalid') || !Array.isArray(rawFilters) || rawFilters.length !== filters.length;
  return { invalidLink, route: ['home', 'country', 'region', 'appellation', 'designation', 'recent', 'about'].includes(params.get('r')) ? params.get('r') : 'home', id: params.get('id'), query: params.get('q') || '', filters, lang: params.get('lang') === 'en' ? 'en' : 'ja', matchIds: (params.get('w') || '').split(',').filter(Boolean), contextWine: params.get('cw'), originScope: ['country','region'].includes(params.get('sr')) ? {route:params.get('sr'),id:params.get('si')} : null };
}

function urlFor(next) {
  const params = new URLSearchParams();
  if (next.route !== 'home') params.set('r', next.route);
  if (next.id) params.set('id', next.id);
  if (next.invalidLink) params.set('invalid', '1');
  if (next.filters.length) params.set('f', JSON.stringify(next.filters));
  // Draft text belongs to local history, never to a shared condition URL.
  if (next.lang === 'en') params.set('lang', 'en');
  // Matching types are recomputed, not serialized as trusted search state.
  if (next.contextWine) params.set('cw', next.contextWine);
  if (next.originScope) { params.set('sr',next.originScope.route); params.set('si',next.originScope.id); }
  return `${location.pathname}${location.search}${params.size ? `#${params}` : ''}`;
}

function capture() {
  const input = $('query');
  return { scroll: window.scrollY, open: [...document.querySelectorAll('main details[open]')].map(item => item.id).filter(Boolean), focus: input === document.activeElement, selection: input ? [input.selectionStart, input.selectionEnd] : null, grapeQueries: [...document.querySelectorAll('[data-grape-search]')].map(input => [input.id, input.value]) };
}

function saveEntry() {
  snapshot = capture();
  history.replaceState({ ae: true, depth, state, snapshot, overlay }, '', urlFor(state));
}

function navigate(route, id = null, extra = {}) {
  saveEntry();
  const returnTo = { route: state.route, id: state.id, search: Boolean(state.contextualSearch || (state.route === 'home' && state.filters.length)) };
  state = { ...state, returnTo, contextualSearch: false, originScope: ['appellation','designation'].includes(route) ? ['region','country'].includes(state.route) ? {route:state.route,id:state.id} : ['appellation','designation'].includes(state.route) ? state.originScope : null : null, route, id, matchIds: [], contextWine: null, ...extra };
  depth++;
  overlay = null;
  snapshot = { scroll: 0, open: [] };
  history.pushState({ ae: true, depth, state, snapshot, overlay }, '', urlFor(state));
  closeDialog();
  render();
  window.scrollTo(0, 0);
  $('main').focus({ preventScroll: true });
}

function replace(extra, redraw = true) {
  snapshot = capture();
  state = { ...state, ...extra };
  state.filters = state.filters.filter(f=>!(f.kind===state.route && f.id===state.id && f.mode==='include'));
  history.replaceState({ ae: true, depth, state, snapshot, overlay }, '', urlFor(state));
  if (redraw) render();
  else document.querySelector('header .brand')?.setAttribute('href', homeURL());
}

function restoreSnapshot() {
  cancelAnimationFrame(restoreFrame);
  for (const [id, value] of snapshot?.grapeQueries ?? []) if ($(id)) { $(id).value = value; filterGrapeList($(id)); }
  for (const id of snapshot?.open ?? []) if ($(id)) $(id).open = true;
  restoreFrame = requestAnimationFrame(() => {
    restoreFrame = null;
    if (state.contextWine && !snapshot?.scroll) { const target = $('wine-' + state.contextWine); target?.focus({preventScroll:true}); target?.scrollIntoView({block:'start'}); } else window.scrollTo(0, snapshot?.scroll ?? 0);
    if (snapshot?.focus && $('query')) {
      $('query').focus({ preventScroll: true });
      if (snapshot.selection) $('query').setSelectionRange(...snapshot.selection);
    }
  });
}

function find(kind, id) {
  const collection = { country: 'countries', region: 'regions', grape: 'grapes', appellation: 'appellations', designation: 'designations' }[kind];
  return collection ? (data[collection] ?? []).find(item => item.id === id) : candidates.find(item => item.kind === kind && item.id === id) ?? data.candidates?.find(item => item.kind === kind && item.id === id);
}
const scopedApps = () => data.appellations.filter(app => state.route === 'country' ? app.countryId === state.id : state.route === 'region' ? regionBelongs(data, app.regionIds, state.id) : true);
const filterLabel = filter => `${state.lang === 'ja' ? filter.kind === 'grape' ? filter.mode === 'exclude' ? '不使用でも可' : '使用可能' : `${filter.mode === 'exclude' ? '除外する' : ''}${t(filter.kind)}` : `${t(filter.mode)} ${t(filter.kind)}`}: ${name(find(filter.kind, filter.id)) || filter.id}`;
const shortWine = wine => [...new Set([...(wine.type || '').split(/\s*\/\s*/), ...(wine.qualifiers || [])])].map(term => name({name:{original:term}})).join('・') || name(wine);
const coverageHTML = () => `<p class="coverage">${escape(t('coverage'))}: ${data.appellations.length} ${state.lang === 'ja' ? '呼称' : 'appellations'} / ${data.regions.length} ${state.lang === 'ja' ? '地域（限定収録）' : 'regions (limited coverage)'}</p>`;
const invalidFilters = () => state.filters.filter(filter => !find(filter.kind, filter.id));
const activeFilters = () => {
  if (!['country', 'region'].includes(state.route)) return state.filters;
  // Route scope is an additional AND constraint, never a replacement for an
  // explicit exclusion. Reuse an identical inclusion without duplicating it.
  const scope = { kind: state.route, id: state.id, mode: 'include' };
  return state.filters.some(filter => filter.kind === scope.kind && filter.id === scope.id && filter.mode === 'include') ? state.filters : [...state.filters, scope];
};
const name = entity => displayName(entity, state.lang);
const original = entity => typeof entity?.name === 'string' ? entity.name : entity?.name?.original;
const sort = entities => [...entities].sort((a, b) => name(a).localeCompare(name(b), state.lang) || a.id.localeCompare(b.id));

function returnLabel() {
  const previous = state.returnTo;
  if (previous.search) return state.lang === 'ja' ? '検索結果へ戻る' : 'Back to search results';
  if (['country','region'].includes(previous.route)) return state.lang === 'ja' ? `${name(find(previous.route,previous.id))}の一覧へ戻る` : `Back to ${name(find(previous.route,previous.id))}`;
  if (['appellation','designation'].includes(previous.route)) return state.lang === 'ja' ? `${name(find(previous.route,previous.id))}へ戻る` : `Back to ${name(find(previous.route,previous.id))}`;
  return state.lang === 'ja' ? `${t(previous.route==='recent'?'recent':previous.route==='about'?'about':'home')}へ戻る` : `Back to ${t(previous.route==='recent'?'recent':previous.route==='about'?'about':'home')}`;
}
function homeURL() { return urlFor({...state, route:'home', id:null, contextWine:null, originScope:null}); }
function renderHeader() {
  const exploring = ['country','region'].includes(state.route) && !state.contextualSearch;
  const canReturn = depth > 0 && state.returnTo;
  const brand = `<a class="brand" href="${escape(homeURL())}" data-action="brand-home" aria-label="${state.lang==='ja'?'Appellation Explorer — ホーム':'Appellation Explorer — Home'}">Appellation Explorer</a>`;
  const back = !exploring && canReturn ? button(returnLabel(), 'back', '', 'quiet header-return') : '';
  $('header').innerHTML = `${brand}<div class="lang" aria-label="Language">${['ja', 'en'].map(lang => button(lang.toUpperCase(), 'language', `data-language="${lang}" aria-pressed="${state.lang === lang}"`)).join('')}</div>${back}`;
  document.documentElement.lang = state.lang;
}

function row(entity, kind, meta = '') {
  return `<button type="button" class="row" data-action="navigate" data-kind="${kind}" data-id="${escape(entity.id)}"><span class="row-title">${escape(name(entity))}</span><span class="row-meta">${escape(meta)}</span></button>`;
}

function regionNames(app) { return (app.regionIds ?? []).map(id => name(find('region', id))).filter(Boolean).join(' · '); }
function wineNames(app) {
  const names = [...new Set((app.wines ?? []).map(wine => name(wine)).filter(Boolean))];
  return [...names.slice(0, 3), ...(names.length > 3 ? [state.lang === 'ja' ? `ほか${names.length - 3}タイプ` : `+ ${names.length - 3} types`] : [])].join(' · ');
}

function searchUI() {
  const scope = ['country','region'].includes(state.route) ? `<p class="search-scope">${escape(state.lang==='ja' ? `検索範囲：${name(find(state.route,state.id))}` : `Search within ${name(find(state.route,state.id))}`)}</p>` : '';
  return `<section class="search-box" aria-label="${escape(t('search'))}">${scope}<label for="query" class="search-label">${escape(state.lang === 'ja' ? '産地・品種・タイプを探す' : 'Find places, grapes or types')}</label><p id="query-help" class="sr-only">${escape(state.lang === 'ja' ? '候補を選ぶと条件に追加、または詳細へ移動します。' : 'Select a suggestion to add a filter or open details.')}</p><input type="search" id="query" value="${escape(state.query)}" placeholder="${escape(t('search'))}" autocomplete="off" aria-describedby="query-help" aria-controls="candidates" aria-expanded="${Boolean(state.query)}"><p id="candidate-status" class="sr-only" role="status"></p><div id="candidates" class="candidates"></div><section id="applied-filters" aria-label="${state.lang === 'ja' ? '適用中の条件' : 'Applied filters'}"><h2 class="filters-heading">${state.lang === 'ja' ? '適用中の条件' : 'Applied filters'}</h2><div id="chips" class="chips"></div></section></section><section id="results" tabindex="-1" aria-live="polite" aria-atomic="false"></section>`;
}

function homeHTML() {
  return `<h1 class="home-title">${escape(t('title'))}</h1><p class="intro">${escape(t('intro'))}</p>${searchUI()}<details id="browse-other"><summary>${state.lang==='ja'?'別の地域を探す':'Explore another region'}</summary><section><h2>${escape(t('countries'))}</h2><div class="country-grid">${sort(data.countries ?? []).map(entity => row(entity, 'country', t('country'))).join('')}</div></section><section><h2>${escape(t('mainRegions'))}</h2><div class="region-grid">${sort((data.regions ?? []).filter(region => !region.parentId && (data.appellations ?? []).some(app => regionBelongs(data, app.regionIds, region.id)))).map(entity => { const apps=sort(data.appellations.filter(a=>regionBelongs(data,a.regionIds,entity.id))); return `<section class="home-region">${row(entity,'region', `${name(find('country',entity.countryId))} · ${apps.length} ${state.lang==='ja'?'収録呼称':'included appellations'}`)}${apps.slice(0,4).map(a=>row(a,'appellation',a.gi)).join('')}${apps.length>4?button(state.lang==='ja'?'この地域の呼称をすべて見る':'View all appellations in this region','navigate',`data-kind="region" data-id="${escape(entity.id)}"`,'quiet'):''}</section>`; }).join('')}</div></section></details><p>${button(t('recent'), 'navigate', 'data-kind="recent"', 'quiet')}</p>${aboutLink()}`;
}

function regionHTML() {
  const entity = find(state.route, state.id);
  if (!entity) return `<p class="empty">${escape(t('noRegion'))}</p>`;
  const path = [];
  if (state.route === 'region') {
    let current = entity;
    const seen = new Set();
    while (current && !seen.has(current.id)) { path.unshift(current); seen.add(current.id); current = find('region', current.parentId); }
  }
  const country = state.route === 'country' ? entity : find('country', entity.countryId);
  const children = (data.regions ?? []).filter(region => state.route === 'country' ? region.countryId === entity.id && !region.parentId : region.parentId === entity.id);
  const apps = (data.appellations ?? []).filter(app => state.route === 'country' ? app.countryId === entity.id : regionBelongs(data, app.regionIds, entity.id));
  return `<p class="eyebrow">${escape(t(state.route))}</p><h1>${escape(name(entity))}</h1>${original(entity) !== name(entity) ? `<p class="original">${escape(original(entity))}</p>` : ''}${state.contextualSearch ? '' : `<nav class="path" aria-label="${escape(t('regionContext'))}">${button(t('home'),'home','','quiet')}${[country,...path].filter(Boolean).map(item=>{const current=item.id===entity.id;return `<span class="path-item"><span aria-hidden="true">›</span>${current ? `<span class="path-current" aria-current="page">${escape(name(item))}</span>` : button(name(item),'navigate',`data-kind="${item===country?'country':'region'}" data-id="${escape(item.id)}"`,'quiet')}</span>`;}).join('')}</nav>`}<p class="muted">${escape(state.lang === 'ja' ? 'この地域・国の範囲内で、選択した条件をすべて満たす呼称を検索します。' : 'Search within this region or country, matching every selected condition.')}</p>${children.length ? `<section id="child-regions"><h2>${escape(t('regions'))}</h2>${sort(children).map(item=>row(item,'region',t('region'))).join('')}</section>` : ''}${searchUI()}${aboutLink()}`;
}

function renderChips() {
  if (!$('chips')) return;
  $('chips').innerHTML = state.filters.map((filter, index) => {
    const label = filterLabel(filter);
    return `<span class="chip-pair">${button(label, 'chip-menu', `data-index="${index}" aria-haspopup="dialog"`, `chip ${filter.mode}`)}${button('×', 'remove-filter', `data-index="${index}" aria-label="${escape(label + (state.lang === 'ja' ? 'の条件を外す' : ': remove filter'))}"`, 'chip-remove')}</span>`;
  }).join('') + (state.filters.length ? button(state.lang === 'ja' ? '選択した条件をすべて解除' : 'Clear all selected filters', 'clear-applied', '', 'quiet') : '');
  $('applied-filters').hidden = !state.filters.length;
}

function candidateMeta(candidate) {
  if (candidate.kind === 'designation') return [candidate.qualification, name(find('appellation', candidate.appellationId))].filter(Boolean).join(' · ');
  if (candidate.kind === 'appellation') return [name(find('country', candidate.countryId)), ...(candidate.regionIds ?? []).map(id => name(find('region', id)))].filter(Boolean).join(' · ');
  if (candidate.kind === 'region') return [name(find('country', candidate.countryId)), name(find('region', candidate.parentId))].filter(Boolean).join(' · ');
  return '';
}

function renderCandidates() {
  if (!$('candidates')) return;
  const all = candidatesHidden ? [] : findCandidates(data, state.query, state.lang);
  const exact = all.filter(c=>c.rank<2);
  const found = [...exact, ...all.filter(c=>c.rank>=2)].slice(0, Math.max(candidateLimit,exact.length));
  $('candidate-status').textContent = state.query && !candidatesHidden ? `${all.length} ${state.lang === 'ja' ? '候補' : 'suggestions'}` : '';
  const groups = new Map();
  for (const candidate of found) { if (!groups.has(candidate.kind)) groups.set(candidate.kind, []); groups.get(candidate.kind).push(candidate); }
  $('candidates').innerHTML = [...groups].map(([kind, values]) => `<section class="candidate-group"><h3>${escape(t(kind))}</h3>${values.map(candidate => {
    const attributes = `data-kind="${kind}" data-id="${escape(candidate.id)}"`;
    const excludeLabel = kind === 'grape' ? (state.lang === 'ja' ? '不使用でも可で追加' : 'Can omit') : state.filters.some(f => f.kind === kind && f.id === candidate.id && f.mode === 'include') ? t('changeExclude') : t('addExclude');
    const isDetail = ['appellation', 'designation'].includes(kind);
    return `<div class="candidate"><button type="button" class="candidate-name" data-action="${isDetail || kind === 'region' ? 'candidate-navigate' : 'add-filter'}" ${attributes}><span>${escape(name(candidate))}</span>${original(candidate) !== name(candidate) ? `<small lang="it">${escape(original(candidate))}</small>` : ''}${candidateMeta(candidate) ? `<small>${escape(candidateMeta(candidate))}</small>` : ''}<small>${escape(isDetail ? state.lang === 'ja' ? '詳細を見る' : 'View details' : kind === 'region' ? t('explore') : state.lang === 'ja' ? kind === 'grape' ? '使用可能で追加' : '条件に追加' : 'Add inclusion filter')} ›</small></button><div class="candidate-actions">${isDetail ? '' : `${kind === 'region' && !(state.route === kind && state.id === candidate.id) ? button(t('add'), 'add-filter', `${attributes} aria-label="${escape(name(candidate) + ': ' + t('add'))}"`) : ''}${button(excludeLabel, 'add-filter', `${attributes} data-mode="exclude" aria-label="${escape(name(candidate) + ': ' + excludeLabel)}"`)}`}</div></div>`;
  }).join('')}</section>`).join('') || (state.query.trim() && !candidatesHidden ? `<p class="muted">${escape(t('noCandidates'))}</p>` : '');
  if (all.length > found.length) $('candidates').innerHTML += button(t('moreCandidates'), 'more-candidates');
  $('query').setAttribute('aria-expanded', String(Boolean(all.length)));
}

function applicabilityHTML(wines, id) {
  const scopes = new Map();
  for (const wine of wines) {
    const scope = wine.grapeRule?.scope || wine.scope;
    if (!scope) continue;
    if (!scopes.has(scope)) scopes.set(scope,new Set());
    scopes.get(scope).add(shortWine(wine));
  }
  if (!scopes.size) return '';
  return `<details id="applicability-${escape(id)}" class="applicability"><summary>${state.lang==='ja'?'適用条件を見る':'View applicability'}</summary>${[...scopes].map(([scope,types])=>`<p><strong>${escape([...types].join(' | '))}</strong></p><p>${escape(scopeText(scope))}</p>`).join('')}</details>`;
}
function updateTypeSeparators() {
  requestAnimationFrame(()=>document.querySelectorAll('.type-separator').forEach(separator=>{
    const before=separator.previousElementSibling?.getBoundingClientRect(), after=separator.nextElementSibling?.getBoundingClientRect();
    separator.style.visibility=before && after && Math.abs(before.top-after.top)<2 ? 'visible' : 'hidden';
  }));
}
window.addEventListener('resize',updateTypeSeparators);

function renderResults() {
  updateTypeSeparators();
  if (!$('results')) return;
  const filtered = state.filters.length > 0;
  if ($('browse-other')) { $('browse-other').open = !filtered; $('browse-other').classList.toggle('initial-exploration', !filtered); }
  if ($('child-regions')) $('child-regions').hidden = filtered;
  if (state.invalidLink || invalidFilters().length) { $('results').innerHTML = `<p class="notice" role="alert">${escape(t('invalidLink'))}</p>${button(t('reset'), 'reset-filters')}`; return; }
  if (!activeFilters().length) { $('results').innerHTML = ''; return; }
  const scope = scopedApps();
  const { results, unknownCount, unknownAppellations } = searchAppellations({...data, appellations:scope}, activeFilters());
  results.sort((a,b)=>name(a.appellation).localeCompare(name(b.appellation),state.lang));
  const ja = state.lang === 'ja';
  const reason = state.filters.map(f => f.kind === 'grape' ? `${name(find('grape',f.id))}${ja ? f.mode==='exclude'?'を使わずに造れる':'を使用可能' : f.mode==='exclude'?' can be omitted':' is permitted'}` : filterLabel(f)).join(ja?' ／ ':' / ');
  const scopeName = ['region','country'].includes(state.route) ? name(find(state.route,state.id)) : ja?'全地域':'All regions';
  $('results').innerHTML = `<div class="results-count"><strong>${escape(ja ? filtered ? `条件に合う呼称：${results.length}件` : `${scopeName}の収録呼称：${results.length}件` : `${results.length} ${filtered?'matching':'included'} appellations`)}</strong><small>${escape(ja?`${scopeName}の収録${scope.length}呼称から検索（限定収録）`:`Search among ${scope.length} included appellations in ${scopeName}`)}</small></div>${filtered ? button(ja?'検索条件のリンクをコピー':'Copy search conditions link','copy-search','','quiet')+'<div id="copy-feedback" role="status"></div>' : ''}${state.filters.some(f=>f.kind==='grape') ? `<p class="meta-line">${escape(ja?'使用可能は使用必須やボトルへの含有を意味しません。不使用でも可は、その品種を使わずに造れるという意味です。':'Permitted does not mean required or present in a bottle. Can omit means a compliant wine can be made without the grape.')}</p>`:''}${unknownCount?`<p class="notice">${escape(t('unknown'))} (${unknownCount})<br>${unknownAppellations.map(a=>escape(name(a))).join(' · ')}</p>`:''}${results.map(result=>{
    const app=result.appellation;
    const matches=result.matches;
    const type = match => `<span class="result-match">${button(shortWine(match.wine)+(match.designation?` · ${name(match.designation)} (${[t('designation'),match.designation.qualification].filter(Boolean).join('・')})`:''),'open-match',`data-kind="${match.designation?'designation':'appellation'}" data-id="${escape(match.designation?.id || app.id)}" data-wine="${escape(match.wine.id)}"`,'type-link')}</span>`;
    return `<article class="result-card" id="result-${escape(app.id)}"><h2>${button(name(app),'open-match',`data-kind="appellation" data-id="${escape(app.id)}"`,'result-title')}</h2>${original(app)!==name(app)?`<p class="original">${escape(original(app))}</p>`:''}<p class="meta-line">${escape([regionNames(app),app.gi,...(app.traditionalTerms||[]),app.level].filter(Boolean).join(' · '))}</p>${filtered?`<p class="search-reason">${escape(reason)}</p>`:''}<p class="meta-line type-count">${ja?filtered?'条件に合うタイプ':'ワインのタイプ':filtered?'Matching types':'Wine types'}：${matches.length}</p><div class="result-types">${matches.slice(0,3).map(type).join('<span class="type-separator" aria-hidden="true"> | </span>')}</div>${matches.length>3?`<details id="matches-${escape(app.id)}" class="more-types"><summary><span class="when-closed">${ja?`残り${matches.length-3}タイプを表示`:`Show ${matches.length-3} more types`}</span><span class="when-open">${ja?'追加したタイプを閉じる':'Close additional types'}</span></summary><div class="result-types">${matches.slice(3).map(type).join('<span class="type-separator" aria-hidden="true"> | </span>')}</div></details>`:''}${applicabilityHTML(matches.map(m=>m.wine),app.id)}${button(ja?'詳細を見る':'View details','open-match',`data-kind="appellation" data-id="${escape(app.id)}"`,'quiet')}</article>`;
  }).join('') || `<p class="empty">${escape(ja?`現在収録している${scope.length}呼称では、条件に合うタイプが見つかりませんでした。この地域全体で使用できないという意味ではありません。`:t('noResults'))}</p>${state.filters.length===1?button(ja?`${name(find(state.filters[0].kind,state.filters[0].id))}の条件を外す`:'Remove this condition','remove-filter','data-index="0"','quiet'):''}`}${['region','country'].includes(state.route)?`<p>${button(ja?'他の地域も探す':'Search other regions','widen-scope','','quiet')}<small>${ja?'追加した条件を維持して、検索範囲を全地域に広げます。':'Keep added conditions and search all regions.'}</small></p>`:''}`;
}

function scopeText(scope) { return scope === 'senza indicazione del nome dei vitigni' && state.lang === 'ja' ? 'この判定は、ボトルのラベルに品種名を記載しない場合の規定に基づきます。品種名を記載する場合の追加条件は、この判定に含みません。' : scope; }

function aboutLink(label = t('about')) { return `<p class="footer-link">${button(label, 'navigate', 'data-kind="about"', 'quiet')}</p>`; }

let detailReferences = [];
let referenceContext = '';
function withReferenceContext(context, renderContent) {
  const previous = referenceContext;
  referenceContext = context;
  try { return renderContent(); } finally { referenceContext = previous; }
}
function deferReference(field, prefix, content) {
  if (content) detailReferences.push({ context: referenceContext, field, prefix, content });
  return '';
}

function evidenceHTML(evidence, id) {
  if (!evidence?.length) return '';
  return `<details class="evidence" id="e-${escape(id)}"><summary>${escape(t('evidence'))}</summary>${evidence.map(item => {
    const source = (data.sources ?? []).find(source => source.id === item.sourceId);
    return `<p>${escape(source?.agency ?? '')} · ${escape(source?.title ?? '')} · ${escape(item.locator ?? '')}</p>${item.conditions ? `<p>${escape(item.conditions)}</p>` : ''}<blockquote lang="it">${escape(item.quote ?? '')}</blockquote>${source ? `${sourceAnchor(source)} <a href="#source-${escape(source.id)}" data-action="section-jump" data-target="source-${escape(source.id)}">${state.lang === 'ja' ? '文書の日付・取得記録' : 'Document dates and retrieval record'}</a>` : ''}`;
  }).join('')}</details>`;
}

function sourceAnchor(source) {
  const archive = source.kind === 'official-specification-archive' ? source : (data.sources ?? []).find(item => item.kind === 'official-specification-archive' && item.url === source.url && item.sha256 === source.archiveHash);
  const isArchive = Boolean(source.archiveMember || archive);
  // Reuse the saved catalogue label only when URL and archived bytes identity
  // match. A similarly named or subsequently replaced archive is not evidence.
  const savedSize = archive?.title?.match(/\((\d+(?:[.,]\d+)?\s*(?:KB|MB|GB))\)/i)?.[1];
  const size = source.archiveBytes ? `${Math.ceil(source.archiveBytes/1024/1024)} MB` : savedSize || (state.lang === 'ja' ? '容量不明' : 'size unknown');
  try { const url = new URL(source.url); if (['https:', 'http:'].includes(url.protocol)) return `<a href="${escape(url.href)}" rel="external">${escape(isArchive ? `${t('archiveDownload')}（${size}） — ${source.archiveMember || source.title}` : `${t('sourceDocument')} — ${source.title || t('sourceLink')}`)}</a>`; } catch { /* Invalid source links are not clickable. */ }
  return '';
}

function grapeLink(id) {
  const grape = find('grape', id);
  return grape ? button(name(grape) === original(grape) ? name(grape) : `${name(grape)}（${original(grape)}）`, 'grape-link', `data-id="${escape(id)}" aria-label="${escape(name(grape) + (state.lang === 'ja' ? '：この品種を使える呼称を探す' : ': find appellations permitting this grape'))}"`, 'grape-link') : escape(id);
}

function ratioHTML(constraint) {
  if (constraint.min === constraint.max && constraint.min != null && !constraint.minExclusive) return `${escape(constraint.min)}%`;
  const minimum = constraint.min != null ? constraint.minExclusive ? `&gt; ${escape(constraint.min)}%` : `${escape(t('minimum'))} ${escape(constraint.min)}%` : '';
  const maximum = constraint.max != null ? `${escape(t('maximum'))} ${escape(constraint.max)}%` : '';
  return [minimum, maximum].filter(Boolean).join(' / ');
}

// Shared rules can appear on many types. Cache only pure, evidence-bound duties.
const requiredGrapeCache = new Map();
function requiredGrapes(rule) {
  const key=JSON.stringify(rule);
  if (!requiredGrapeCache.has(key)) requiredGrapeCache.set(key,(rule?.grapeIds || []).filter(id=>evaluateGrapeUse(rule,[id]).status==='match' && evaluateGrapeUse(rule,[],[id]).status==='no_match'));
  return requiredGrapeCache.get(key);
}

function grapeHTML(rule, prefix) {
  if (!rule) return `<p class="muted">${escape(t('unverified'))}</p>`;
  const ids = [...new Set(rule.grapeIds || [])].sort((a,b)=>name(find('grape',a)).localeCompare(name(find('grape',b)),state.lang));
  const ja = state.lang === 'ja';
  const wording = (rule.evidence?.[0]?.quote || rule.original || '').replace(/\s+/g, ' ');
  const region = wording.match(/idonei alla coltivazione nella regione ([\p{L}]+)[.;]/u)?.[1];
  const regional = ids.length > 6 && region && !rule.alternatives && rule.constraints?.length === 1 && rule.constraints[0].min === 100 && rule.constraints[0].max === 100;
  const oneOrMore = regional && /da uno o più vitigni/i.test(wording);
  const regionName = region ? name({ name: { original: region } }) : '';
  const scoped = rule.scope === 'senza indicazione del nome dei vitigni';
  const scope = scoped ? `<details id="grape-scope-${escape(prefix)}"><summary>${ja?'適用条件を見る':'View applicability'}</summary><p>${escape(ja ? 'ボトルのラベルに品種名を記載しない場合の規定です。ラベルに品種名を記載する場合には、別の原料・栽培条件があります。' : 'These rules cover wines without a grape name on the label. Varietal labelling has separate conditions.')}</p></details>` : '';
  const summary = regional ? ja
    ? `${regionName}州で栽培が認められた品種${oneOrMore ? 'から1品種または複数品種を使用できます' : 'で構成される畑から収穫したブドウを使用します'}。実際のボトルの配合を示すものではありません。`
    : `Permitted varieties from ${regionName} supply these wines. This is an authorised list, not a list of representative grapes or a bottle recipe.`
    : '';
  const list = ids.length <= 6 ? `<p>${ids.map(grapeLink).join(' · ')}</p>` : `<div class="grape-list"><label>${escape(ja?`規定に列挙された${ids.length}品種から探す`:`Search ${ids.length} listed grapes`)}<input id="grape-query-${escape(prefix)}" type="search" data-grape-search autocomplete="off"></label><div class="grape-search-results" aria-live="polite"></div><details id="grapes-${escape(prefix)}"><summary>${escape(ja?`全${ids.length}品種の一覧を開く`:`Open all ${ids.length} grapes`)}</summary><p class="meta-line">${escape(ja?'日本語は参考の読みです。原語のみの品種は読み未確認です。':'Japanese readings are editorial aids; untranslated names have no verified reading.')}</p><div class="grape-buttons">${ids.map(grapeLink).join('')}</div></details></div>`;
  // Show only proved usage duties, never a positive planting minimum alone.
  const required = requiredGrapes(rule);
  const soleSource = ids.length === 1 && grapeDutyProof(rule, ids[0])?.kind === 'sole-source';
  const duties = required.map(id => {
    const proof = grapeDutyProof(rule, id);
    const explanations = ja ? {
      direct: '原料葡萄またはワインへの使用を明記した条件が根拠です。',
      'sole-source': '規定されたブドウの由来がこの1品種に限られるためです。畑の割合をボトルの配合へ換算したものではありません。',
      'remainder-cap': '他の許可品種を合わせても原料葡萄またはワインの全量を満たせない上限があるためです。畑の割合から使用義務を推定していません。',
      combined: '同じ適用範囲の許可品種と制約を合わせると、この品種を使わない構成が成立しないためです。'
    } : {direct:'An explicit raw-grape or wine requirement establishes this duty.', 'sole-source':'The permitted fruit source is limited to this single variety; planting percentages are not converted into a bottle recipe.', 'remainder-cap':'The combined cap on the other permitted varieties cannot supply the entire raw-grape or wine amount.', combined:'The permitted varieties and constraints in this same scope cannot be satisfied without this grape.'};
    deferReference('composition', `${prefix}-required-${id}`, `<section class="duty-proof"><h4>${escape(name(find('grape', id)))} · ${ja ? '使用が必要な理由' : 'Why required'}</h4><p>${escape(explanations[proof.kind])}</p>${evidenceHTML(proof.evidence, `${prefix}-required-${id}`)}</section>`);
    return soleSource ? '' : `<p>${escape(name(find('grape', id)))}${ja ? 'は使用が必要です。' : ' must be used. '}</p>`;
  }).join('');
  const uncertain = ids.some(id => evaluateGrapeUse(rule, [], [id]).status === 'unknown') ? `<p>${escape(ja ? '使えることと、必ず使うことは別です。使用が必須か確認できていない品種は、使わずに造れるとも断定していません。' : 'Permission and mandatory use differ. Unproved mandatory use does not prove a grape can be omitted.')}</p>` : '';
  const visibleConstraints = alternative => (alternative.constraints ?? []).filter(c => !required.some(id => c.grapeIds.length === 1 && c.grapeIds[0] === id && c.minExclusive && c.min === 0 && ratioBasis(alternative, c) !== 'vineyard'));
  const ratioBases = new Set((rule.alternatives ?? [rule]).flatMap(alternative => visibleConstraints(alternative).map(c => ratioBasis(alternative, c))));
  const constraints = (rule.alternatives ?? [rule]).map(alternative => {
    const groups = new Map();
    visibleConstraints(alternative).forEach((constraint, index) => {
      const basis = ratioBasis(alternative, constraint);
      const scope = constraint.scope ?? alternative.scope ?? rule.scope ?? '';
      // Never merge alternatives, different scopes, or unverified/conditional denominators.
      const key = JSON.stringify([basis, scope, ['unknown','mixed'].includes(basis) || constraint.conditions || constraint.applicability ? index : null]);
      if (!groups.has(key)) groups.set(key, {basis, scope, constraints:[]});
      groups.get(key).constraints.push(constraint);
    });
    return [...groups.values()].map(group => {
      if (regional) return `<p>${escape(ja ? '対象の畑は、この認可品種の範囲で構成されます。各品種をすべて植えるという意味ではありません。' : 'The source vineyards use varieties from this permitted list; not every variety must be planted.')}</p>`;
      const rows = group.constraints.map(constraint => {
        const outside = (alternative.grapeIds || ids).filter(id=>!constraint.grapeIds.includes(id));
        const multiple = constraint.grapeIds.length > 1;
        const groupLabel = ja ? `${outside.length?'その他の':'対象の'}認可品種${constraint.grapeIds.length}種${outside.length ? `（${outside.map(id=>name(find('grape',id))).join('・')}を除く）` : ''}` : `${constraint.grapeIds.length} permitted varieties${outside.length ? ` (excluding ${outside.map(id=>name(find('grape',id))).join(', ')})` : ''}`;
        const label = constraint.grapeIds.length > 6 ? escape(groupLabel) : multiple ? escape(ja ? `${outside.length ? 'その他の' : ''}使用可能品種` : `${outside.length ? 'Other permitted' : 'Permitted'} varieties`) : grapeLink(constraint.grapeIds[0]);
        const members = multiple && constraint.grapeIds.length <= 6 ? `<ul class="ratio-varieties">${constraint.grapeIds.map(id=>`<li>${grapeLink(id)}</li>`).join('')}</ul>` : '';
        return `<div class="ratio-row"><p>${label}${multiple ? ja ? '（合わせて）' : ' (combined)' : ''}: <strong>${multiple ? escape(t('total')) + ' ' : ''}${ratioHTML(constraint)}</strong></p>${members}</div>${constraint.grapeIds.length > 6 && outside.length ? `<details class="ratio-members" id="members-${escape(prefix)}-${escape(constraint.grapeIds.join('-'))}"><summary>${ja?'この比率の対象品種を見る':'View varieties covered by this ratio'}</summary><div class="grape-buttons">${constraint.grapeIds.map(grapeLink).join('')}</div></details>` : ''}`;
      }).join('');
      const basisLabel = ratioBases.size > 1 || ['unknown','mixed'].includes(group.basis) ? t('basis_' + group.basis) : '';
      const groupScope = group.scope && group.scope !== rule.scope ? scopeText(group.scope) : '';
      const note = [basisLabel,groupScope].filter(Boolean).join(' · ');
      return `<section class="ratio-group" data-ratio-basis="${escape(group.basis)}">${note ? `<p class="ratio-basis">${escape(note)}</p>` : ''}${rows}</section>`;
    }).join('');
  }).join('<hr>');
  const estate = /(?:nell['’]ambito|in ambito) aziendale/i.test(wording);
  const vineyard = (rule.constraints || []).some(c => ratioBasis(rule, c) === 'vineyard');
  const explanation = vineyard ? ja ? `栽培する畑の品種構成について定めた規定を含みます。${estate ? '対象は生産者がこの呼称のために栽培する畑全体です。1枚の畑に、この割合で混植するという意味ではありません。' : ''}割合の適用は関連条文も含めて確認してください。ここでは原料重量・ワイン容量などへの換算はしていません。` : 'These rules include conditions on source vineyards. Read the related provisions when interpreting the proportions; no conversion to grape weight or wine volume is made here.' : t('sourceUseNotice');
  deferReference('composition', prefix, `<p>${escape(scopeText(rule.scope || ''))}</p><p>${escape(summary)}</p><p>${escape(explanation)}</p>${constraints.replaceAll('id="members-', 'id="source-members-')}${rule.original ? `<details id="raw-${escape(prefix)}"><summary>${escape(t('raw'))}</summary><p lang="it">${escape(rule.original)}</p></details>` : ''}${evidenceHTML(rule.evidence, `${prefix}-grapes`)}`);
  const covered = new Set((rule.alternatives ?? [rule]).flatMap(r=>(r.constraints ?? []).flatMap(c=>c.grapeIds)));
  const composition = regional ? '' : soleSource ? `<p class="grape-composition">${grapeLink(ids[0])}：100%</p>` : `<div class="grape-composition">${constraints}</div>`;
  const remaining = ids.filter(id=>!covered.has(id));
  return `${grapeConclusion(rule)}${summary ? `<p>${escape(summary)}</p>` : ''}${composition}${duties}${scope}${ids.length > 6 ? list : remaining.length ? `<p>${remaining.map(grapeLink).join(' · ')}</p>` : ''}<details class="grape-guide" id="ratios-${escape(prefix)}"><summary>${escape(ja ? '品種の見方' : 'Understanding grape rules')}</summary>${uncertain}${soleSource ? `<p>${escape(ja ? '100%は、原料の由来がこの1品種に限られる規定の要約です。畑の割合を原料重量やワイン容量へ換算した値ではありません。' : '100% summarises the exclusive permitted fruit source, not a conversion of vineyard percentages to grape weight or wine volume.')}</p>` : ''}<p>${escape(explanation)}</p>${regional ? constraints : ''}</details>`;
}

function valueText(value) {
  if (typeof value === 'string') return value;
  if (value?.original) return value.original;
  if (value?.text) return typeof value.text === 'string' ? value.text : value.text[state.lang] || value.text.original || '';
  return '';
}

function conditionText(value) {
  if (!value || state.lang !== 'ja') return value || '';
  const text=value.replace(/\s+/g,' ').trim();
  if (/^sui lieviti$/i.test(text)) return '澱とともに';
  return `追加条件（公式原文）：${text}`;
}
function optionalHTML(field, fieldKey, prefix) {
  const label = ['sensory','ageing','alcohol'].includes(fieldKey) ? `<h3 class="rule-label regulation-heading">${escape(t(fieldKey))}</h3>` : `<span class="rule-label">${escape(t(fieldKey))}</span>`;
  const needsReprocessing = fieldIssues(field, fieldKey).length > 0;
  const current = needsReprocessing ? { ...field, state: 'unverified', values: [] } : field ?? { state: 'unverified' };
  const evidence = new Map((current.evidence ?? []).map(item => [JSON.stringify(item), item]));
  const explanation = state.lang === 'ja' && current.state === 'confirmed' ? regulationExplanation(current, fieldKey) : null;
  if (explanation) {
    const translation = `<p>${escape(explanation.ja)}</p><p class="meta-line">${explanation.coverage === 'summary' ? '日本語の要約です。細部・例外を含む条文全体の訳ではありません。' : '公式記述の参考訳'}</p>`;
    deferReference(fieldKey, prefix, `${translation}${current.original && !current.evidence?.some(e => e.quote === current.original) ? `<details><summary>${escape(t('raw'))}</summary><p lang="it">${escape(current.original)}</p></details>` : ''}${evidenceHTML(current.evidence, `${prefix}-${fieldKey}`)}`);
    return `<div class="rule translated-rule">${label}<p>${escape(explanation.ja)}</p></div>`;
  }

  const missing = ['not_found','unverified'].includes(current.state);
  const missingLabel = current.state==='not_found' ? state.lang==='ja'?'記載未確認':'No statement found' : state.lang==='ja'?'未確認':'Unverified';
  const missingExplanation = current.state==='not_found' ? state.lang==='ja'?'確認資料では記載を見つけられていません。規定なしとは限りません。':'No statement was found in the checked material. This does not establish that no requirement exists.' : t('unverified');
  let body = missing ? `<p class="muted">${escape(missingLabel)}</p><details id="state-${escape(prefix)}-${fieldKey}" class="field-status"><summary>${escape(t(fieldKey))}：${state.lang==='ja'?'確認状況の説明':'About this status'}</summary><p>${escape(missingExplanation)}</p></details>` : current.state !== 'confirmed' ? `<p class="muted">${escape(t(current.state ?? 'unverified'))}</p>` : '';
  if (current.values?.length) body += current.values.map(value => {
    let text = valueText(value);
    if (fieldKey === 'alcohol' && value.value != null) {
      const proof = alcoholDisplayProof(current, value);
      text = state.lang === 'ja' ? `${t(value.metric + 'Alcohol')}は${value.value}%${proof.minimum ? '以上' : '（上下限の日本語説明は未確認）'}です。` : `${proof.minimum ? t('minimum') + ' ' : ''}${t(value.metric + 'Alcohol')}: ${value.value} ${value.unit || '% vol'}`;
      const conditions = value.applicability || value.conditions;
      if (conditions) {
        const known = conditions.match(/^\s*\d+(?:[,.]\d+)?\s*%\s*(?:vol\.?)?\s*per\s+(?:la\s+)?tipologia\s+(bianco|rosso|rosato)(\s+(?:novello|frizzante|passito|abboccato|dolce))?\s*$/i);
        text += state.lang === 'ja' ? known ? `適用対象は${name({name:{original:[known[1], known[2]?.trim()].filter(Boolean).join(' ')}})}です。` : '追加の適用条件の日本語説明は未対応です。公式原文の条件を確認してください。' : ` · ${conditions}`;
      }
    }
    if (fieldKey === 'ageing') {
      const start = value.start && state.lang==='ja' ? ageingStartExplanation(value.start) || `起算日の日本語説明は未確認（${value.start}）` : value.start;
      text = state.lang==='ja' ? `${start || ''}${value.conditions ? conditionText(value.conditions) : ''}${value.container==='wood'?'木樽で':value.container==='bottle'?'瓶内で':value.container==='total'?'合計で':`${t(value.container)}：`}${value.months != null ? `${value.months}か月${value.minimum?'以上':''}` : '期間未確認'}熟成${value.relation ? `（${t(value.relation)}）` : ''}。` : [value.minimum?'Minimum':'',t(value.container),value.months!=null?`${value.months} months`:'',value.relation?t(value.relation):'',start,conditionText(value.conditions)].filter(Boolean).join(' · ');
    }
    for (const item of value.evidence ?? []) evidence.set(JSON.stringify(item), item);
    return text ? `<p>${escape(text)}</p>` : '';
  }).join('');
  if (fieldKey === 'alcohol' && current.values?.length && state.lang === 'ja') {
    const translated = current.values.map((value, index) => {
      const proof = alcoholDisplayProof(current, value);
      const sentence = `${t(value.metric + 'Alcohol')}は${value.value}%${proof.minimum ? '以上' : '（上下限は未確認）'}です。`;
      return `<section><p>日本語の説明：${escape(sentence)}</p>${proof.evidence.length ? evidenceHTML(proof.evidence, `${prefix}-alcohol-value-${index}`) : '<p>値に対応する条文は下の公式原文をご確認ください。</p>'}</section>`;
    }).join('');
    let references = `<section class="alcohol-translation">${translated}</section>${evidenceHTML([...evidence.values()], `${prefix}-${fieldKey}`)}`;
    // Keep the full saved source available, but never use sensory/acidity text
    // as the normal alcohol explanation.
    if (current.original) references += `<details><summary>関連条文の公式原文（未翻訳）</summary><p lang="it">${escape(current.original)}</p></details>`;
    deferReference(fieldKey, prefix, references);
    return `<div class="rule alcohol-rule">${label}${body}</div>`;
  }
  if (fieldKey === 'varietalLabelling' && current.state === 'confirmed') body += `<p>${escape(state.lang === 'ja' ? 'ボトルのラベルに品種名を記載する場合には、その品種に対応した別の原料・栽培条件があります。ラベルに品種名を記載しない場合の規定とは区別してください。' : 'Naming grape varieties on the label has separate fruit and cultivation conditions tied to those varieties. These differ from the rules for wines without a varietal name.')}</p>`;
  if (current.state === 'confirmed' && !current.values?.length) body += `<p class="muted">${escape(state.lang === 'ja' ? 'この項目は公式原文でご確認ください。日本語の説明はまだありません。' : 'The source is retained, but a translated explanation is not available.')}</p>`;
  const references = `${current.original && ![...evidence.values()].some(item => item.quote === current.original) ? `<details id="original-${escape(prefix)}-${fieldKey}"><summary>${escape(t('raw'))}</summary><p lang="it">${escape(current.original)}</p></details>` : ''}${evidenceHTML([...evidence.values()], `${prefix}-${fieldKey}`)}`;
  deferReference(fieldKey, prefix, `${body.replaceAll('id="state-', 'id="source-state-')}${references}`);
  return `<div class="rule">${label}${body}</div>`;
}

function grapeConclusion(rule) {
  const selected = state.filters.filter(f=>f.kind==='grape');
  if (!selected.length) return '';
  const result = evaluateGrapeUse(rule, selected.filter(f=>f.mode==='include').map(f=>f.id), selected.filter(f=>f.mode==='exclude').map(f=>f.id));
  return `<p class="grape-conclusion">${escape(selected.map(filterLabel).join(' ／ '))}：${escape(state.lang==='ja' ? result.status==='match'?'この品種規定では同時に成立します。':result.status==='unknown'?'規定情報が不足して判定できません。':'この品種規定では同時に成立しません。' : result.status==='match'?'Possible together under these grape rules.':result.status==='unknown'?'Insufficient information.':'Not possible together under these grape rules.')}</p>`;
}
// Route only explicit saved production statements; never infer mixed planting
// or co-fermentation from a reference to vineyards or from permitted varieties.
function grapeProductionConditions(wine) {
  const field = wine.production;
  if (field?.state !== 'confirmed' || fieldIssues(field, 'production').length) return '';
  const values = (field.values ?? []).filter(value => /混植|混醸|co[ -]?(?:ferment|vinific)|complant|coltura promiscua|vigneti misti/i.test([valueText(value), value.conditions, value.applicability].filter(Boolean).join(' ')));
  if (!values.length) return '';
  deferReference('production', `${wine.id}-grape-conditions`, evidenceHTML(values.flatMap(value=>value.evidence || field.evidence || []), `${wine.id}-grape-conditions`));
  return `<div class="grape-conditions"><strong>${state.lang==='ja'?'品種に関する生産条件（公式記述）':'Production conditions for these grapes (official wording)'}</strong>${values.map(value=>`<p>${escape([...new Set([valueText(value), value.conditions, value.applicability].filter(Boolean))].join(' · '))}</p>`).join('')}</div>`;
}

function wineHTML(wine, matched, common = false, sharedFields = [], hasIndex = true) {
  return withReferenceContext(`${t('type')}: ${name(wine)}`, () => `<article class="wine ${matched ? 'matched' : ''}" id="wine-${escape(wine.id)}" tabindex="-1" data-wine-id="${escape(wine.id)}">${matched ? `<span class="matched-label">${escape(t('matched'))}</span>` : ''}<h2>${escape(shortWine(wine))}</h2><p class="meta-line">${escape(original(wine))}</p>${common ? `<p><a href="#common-grapes" data-action="common-jump">${escape(t('commonReference'))}</a></p>` : `<div class="rule"><h3 class="regulation-heading">${escape(t('composition'))}</h3>${grapeHTML(wine.grapeRule,wine.id)}</div>`}${grapeProductionConditions(wine)}${applicabilityHTML([wine],wine.id)}${optionalHTML(wine.sensory,'sensory',wine.id)}${optionalHTML(wine.ageing,'ageing',wine.id)}${optionalHTML(wine.alcohol,'alcohol',wine.id)}<details id="long-${escape(wine.id)}"><summary>${escape(t('allRules'))}</summary>${['varietalLabelling','production','area'].filter(k=>!sharedFields.includes(k)&&(k!=='varietalLabelling'||wine[k])).map(k=>optionalHTML(wine[k],k,wine.id)).join('')}${sharedFields.length?'<a href="#shared-regulations" data-action="section-jump" data-target="shared-regulations">'+(state.lang==='ja'?'共通の区域・栽培・ラベル条件':'Shared conditions')+'</a>':''}${deferReference('type',wine.id,evidenceHTML(wine.evidence,`${wine.id}-identity`))}</details>${wine.alcohol?.values?.length ? `<a class="meta-line" href="#alcohol-guide" data-action="section-jump" data-target="alcohol-guide">${state.lang==='ja'?'度数の読み方':'Reading alcohol requirements'}</a>` : ''}${hasIndex ? `<a class="meta-line" href="#type-index" data-action="section-jump" data-target="type-index">${state.lang==='ja'?'タイプ目次へ':'Back to wine types'}</a>` : ''}</article>`);
}

function alcoholGuideHTML() {
  const definition = state.lang === 'ja' ? '実アルコール度数は20℃での製品100体積に含まれる純アルコールの体積、潜在アルコール度数は同じ条件で残る糖の完全発酵から生じ得る純アルコールの体積です。' : 'Actual alcohol is the volume of pure alcohol per 100 volumes of product at 20°C. Potential alcohol is the corresponding volume from complete fermentation of remaining sugar.';
  deferReference('alcohol', 'definitions', `<p>${escape(definition)}</p><a href="https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=celex%3A32013R1308" rel="external">EU規則1308/2013 附属書II 第IV部</a>`);
  return `<details id="alcohol-guide" tabindex="-1"><summary>${state.lang==='ja'?'度数の読み方':'Reading alcohol requirements'}</summary><p>${state.lang==='ja'?'実アルコール度数は実際に含まれるアルコール分です。総アルコール度数は、それに残る糖がすべて発酵した場合に生じ得る分を加えた値で、ボトルの実際の度数とは異なります。総と実の両方が示される場合は、両方の条件を満たします。':'Actual alcohol is the alcohol present. Total alcohol adds the potential alcohol from complete fermentation of remaining sugar; it is not the actual alcohol in a bottle. Both requirements apply where both are stated.'}</p><p id="guide-return"></p></details>`;
}

function sourceDate(value) { if (!value) return state.lang==='ja'?'この記録では未確認':'Not recorded'; const date=new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(state.lang,{dateStyle:'medium',timeZone:'UTC',...(String(value).includes('T')?{timeStyle:'short'}:{})}).format(date)+(String(value).includes('T')?' UTC':''); }

function sourcesHTML(entity) {
  const sourceIds = new Set();
  const collect = item => {
    if (!item || typeof item !== 'object') return;
    if (item.sourceId) sourceIds.add(item.sourceId);
    for (const id of item.sourceIds ?? []) sourceIds.add(id);
    for (const child of Object.values(item)) if (child && typeof child === 'object') Array.isArray(child) ? child.forEach(collect) : collect(child);
  };
  collect(entity);
  const sources = (data.sources ?? []).filter(item => sourceIds.has(item.id));
  const primary = source => source.kind === 'consolidated' || source.kind === 'register' && /\/id\//.test(source.url || '');
  deferReference(state.route, entity.id, evidenceHTML(entity.evidence, `${entity.id}-sources`));
  const groups = new Map();
  for (const item of detailReferences) {
    if (!groups.has(item.context)) groups.set(item.context, []);
    groups.get(item.context).push(item);
  }
  const references = [...groups].sort(([a], [b]) => Number(b === name(entity)) - Number(a === name(entity))).map(([context, items]) => `<section class="reference-group"><h3>${escape(context)}</h3>${items.map(item => `<section class="reference-field" data-field="${escape(item.field)}" data-prefix="${escape(item.prefix)}"><h4>${escape(t(item.field))}</h4>${item.content.replaceAll(escape(t('evidence')),escape(`${t(item.field)}：${state.lang==='ja'?'根拠と原文':'evidence and original'}`))}</section>`).join('')}</section>`).join('');
  const sourceCard = source => `<article class="source" id="source-${escape(source.id)}" tabindex="-1"><p class="eyebrow">${escape(source.kind==='consolidated' ? state.lang==='ja'?'この呼称の規定本文':'Product specification' : source.kind==='register' ? state.lang==='ja'?'EU登録情報':'EU registration' : state.lang==='ja'?'取得・確認に用いた資料':'Retrieval and verification record')}</p><strong>${escape(source.title)}</strong><dl><dt>${escape(t('agency'))}</dt><dd>${escape(source.agency)}</dd>${source.archiveMember ? `<dt>${escape(t('archiveDocument'))}</dt><dd>${escape(source.archiveMember)}</dd>` : ''}<dt>${escape(t('published'))}</dt><dd>${escape(sourceDate(source.publishedAt))}</dd><dt>${state.lang === 'ja' ? '施行日' : 'Effective from'}</dt><dd>${escape(sourceDate(source.effectiveFrom))}</dd><dt>${escape(t('retrieved'))}</dt><dd>${escape(sourceDate(source.retrievedAt))}</dd>${source.verifiedAt ? `<dt>${escape(t('verified'))}</dt><dd>${escape(sourceDate(source.verifiedAt))}</dd>` : ''}</dl>${sourceAnchor(source)}${sourceIdentityHTML(source)}</article>`;
  return `<details id="sources" class="sources-disclosure"><summary>${state.lang === 'ja' ? '出典・公式原文' : 'Sources and official originals'}</summary><p>${escape(state.lang === 'ja' ? '取得日は資料を保存した日、検証日は記録を確認した日です。施行日や、今日現在も改正がないことの保証ではありません。' : 'Retrieval and verification dates are not effective dates or a guarantee of no subsequent amendments.')}</p>${sources.filter(primary).map(sourceCard).join('')}${sources.some(source=>!primary(source))?`<details id="source-records"><summary>${state.lang==='ja'?'取得・検証の詳しい記録':'Detailed retrieval and verification records'}</summary>${sources.filter(source=>!primary(source)).map(sourceCard).join('')}</details>`:''}${!sources.length?`<p class="muted">${escape(t('sourcesEmpty'))}</p>`:''}${references}</details>`;
}

function sourceIdentityHTML(source) {
  return `<details id="source-identity-${escape(source.id)}"><summary>${escape(t('originalIdentity'))}</summary><dl><dt>${escape(t('documentHash'))}</dt><dd>${escape(source.sha256)}</dd>${source.archiveHash ? `<dt>${escape(t('archiveHash'))}</dt><dd>${escape(source.archiveHash)}</dd>` : ''}</dl></details>`;
}

function conditionalAmendmentsHTML(entity) {
  if (!entity.conditionalAmendments?.length) return '';
  return `<section class="conditional-amendments"><h2>${escape(t('conditionalChanges'))}</h2>${entity.conditionalAmendments.map((amendment, index) => {
    const applicability = typeof amendment.applicability === 'object' ? amendment.applicability.state : amendment.applicability;
    const stateLabel = applicability === 'active' ? 'applicabilityActive' : applicability === 'expired' ? 'applicabilityExpired' : 'applicabilityUnknown';
    const duration = amendment.conditions?.maximumDuration;
    const durationText = duration?.years != null && duration.reference === 'publication of this decree' ? state.lang === 'ja' ? `この法令の公示から最大${duration.years}年` : `At most ${duration.years} year${duration.years === 1 ? '' : 's'} from publication of this decree` : duration?.original || '';
    const articleText = amendment.article != null ? state.lang === 'ja' ? `第${amendment.article}条${amendment.afterParagraph ? `・第${amendment.afterParagraph}段落の後` : ''}` : `Article ${amendment.article}${amendment.afterParagraph ? `, after paragraph ${amendment.afterParagraph}` : ''}` : '';
    deferReference('conditionalChanges', `${entity.id}-${index}`, `<details id="conditional-${escape(entity.id)}-${index}"><summary>${escape(t('raw'))}</summary><p>${escape(amendment.original)}</p>${amendment.conditions?.original ? `<p>${escape(amendment.conditions.original)}</p>` : ''}${amendment.contextOriginal ? `<p>${escape(amendment.contextOriginal)}</p>` : ''}</details>${evidenceHTML(amendment.evidence, `${entity.id}-conditional-${index}`)}`);
    return `<article class="rule"><h3>${escape(amendment.affectedField === 'ageing.location' ? t('ageingLocation') : t('conditionalChanges'))}</h3>${articleText ? `<p class="meta-line">${escape(articleText)}</p>` : ''}<p class="notice">${escape(t(stateLabel))}</p>${amendment.actDate ? `<p>${escape(t('actDate'))}: ${escape(amendment.actDate)}</p>` : ''}${amendment.conditions?.commencement ? `<p>${escape(t('commencement'))}: ${escape(amendment.conditions.commencement)}</p>` : ''}${durationText ? `<p>${escape(durationText)}</p>` : ''}</article>`;
  }).join('')}</section>`;
}

function detailsHTML() {
  const entity = find(state.route, state.id);
  if (!entity) return `<h1>${escape(t('missingTarget'))}</h1>${button(t('home'), 'home')}`;
  const parent = state.route === 'designation' ? find('appellation', entity.appellationId) : entity;
  detailReferences = []; referenceContext = name(entity);
  recordRecent(state.route, entity.id);
  state.matchIds = state.filters.length && !state.invalidLink && !invalidFilters().length ? (entity.wines ?? []).filter(wine => evaluateWine(data, parent, wine, state.filters).status === 'match').map(wine => wine.id) : [];
  const wines = [...(entity.wines ?? [])].sort((a, b) => Number(state.matchIds.includes(b.id)) - Number(state.matchIds.includes(a.id)));
  const common = wines.length > 1 && wines.every(wine => JSON.stringify(wine.grapeRule) === JSON.stringify(wines[0].grapeRule));
  const sharedFields = ['production','area','varietalLabelling'].filter(k=>wines.length>1 && wines[0][k] && wines.every(w=>JSON.stringify(w[k])===JSON.stringify(wines[0][k])));
  const commonContext = `${name(entity)} · ${state.lang === 'ja' ? '各タイプに共通する条文（タイプ限定条件を含む）' : 'Shared paragraphs, including type-specific conditions'}`;
  const sharedGrapes = common ? withReferenceContext(commonContext, () => `<section id="common-grapes" tabindex="-1"><h2 class="regulation-heading">${escape(t('commonRules'))} <small>${state.lang==='ja'?'（全タイプ共通）':'(all types)'}</small></h2>${grapeHTML(wines[0].grapeRule, entity.id)}</section>`) : '';
  const indexLinks = entries => `<div class="type-links">${entries.map(w=>`<a href="#wine-${escape(w.id)}" data-action="section-jump" data-target="wine-${escape(w.id)}">${escape(shortWine(w))}</a>`).join('')}</div>`;
  const matching = wines.filter(w=>state.matchIds.includes(w.id)), others = wines.filter(w=>!state.matchIds.includes(w.id));
  const typeIndex = wines.length === 1 ? '' : `<nav id="type-index" tabindex="-1" aria-label="${state.lang==='ja'?'ワインのタイプ':'Wine types'}"><h2>${state.lang==='ja'?'タイプ別の規定':'Rules by wine type'}</h2>${state.filters.length?`<h3>${state.lang==='ja'?`今回の条件に合う${matching.length}タイプ`:`${matching.length} matching types`}</h3>${indexLinks(matching)}${others.length?`<details id="other-type-index"><summary>${state.lang==='ja'?`その他${others.length}タイプ`:`${others.length} other types`}</summary>${indexLinks(others)}</details>`:''}`:indexLinks(wines)}</nav><p class="meta-line">${state.lang==='ja'?'公式記述の日本語は参考訳・要約です。個々のボトルの味を保証するものではありません。':'Japanese descriptions are reference translations or summaries, not a guarantee of every bottle’s taste.'}</p>`;
  return `<p class="eyebrow">${escape(t(state.route))}${entity.qualification ? ` · ${escape(entity.qualification)}` : ''}</p><h1>${escape(name(entity))}</h1>${original(entity) !== name(entity) ? `<p class="original">${escape(original(entity))}</p>` : ''}<p class="meta-line">${escape([name(find('country', parent?.countryId)), regionNames(parent ?? {}), state.route === 'appellation' ? parent?.gi : '', ...(state.route === 'appellation' ? parent?.traditionalTerms ?? [] : []), entity.level].filter(Boolean).join(' · '))}</p>${state.route === 'designation' && parent ? `<p>${escape(t('parent'))}: ${button(name(parent), 'navigate', `data-kind="appellation" data-id="${escape(parent.id)}"`, 'quiet')}</p>` : ''}<p class="notice">${escape(t('detailInfo'))}</p>${sharedGrapes}${typeIndex}<div class="wines">${wines.map((wine,index) => `${state.filters.length && (index===0 || state.matchIds.includes(wines[index-1].id)!==state.matchIds.includes(wine.id))?`<h2>${state.lang==='ja'?state.matchIds.includes(wine.id)?'今回の条件に合うタイプ':'その他のタイプ':state.matchIds.includes(wine.id)?'Matching types':'Other types'}</h2>`:''}${wineHTML(wine, state.matchIds.includes(wine.id), common, sharedFields, wines.length > 1)}`).join('')}</div>${sharedFields.length ? `<details id="shared-regulations" tabindex="-1"><summary>${state.lang==='ja'?'呼称全体の区域・栽培・ラベル条件':'Appellation-wide conditions'}</summary><p>${state.lang==='ja'?'タイプごとの適用条件も含む条文をまとめています。ここに書かれた条件がすべてのタイプへ一律に適用されるとは限りません。':'These shared paragraphs can contain conditions for specific wine types; not every condition applies to every type.'}</p>${withReferenceContext(commonContext, () => sharedFields.map(k=>optionalHTML(wines[0][k],k,entity.id)).join(''))}</details>` : ''}${conditionalAmendmentsHTML(entity)}${alcoholGuideHTML()}${state.route === 'appellation' ? designationList(entity) : ''}${aboutLink(state.lang === 'ja' ? 'このアプリについて' : 'About this app')}${sourcesHTML(entity)}`;
}

function designationList(entity) {
  const entries = sort((data.designations ?? []).filter(item => item.appellationId === entity.id));
  const groups = new Map();
  for (const item of entries) {
    const qualification=item.qualification || '';
    if (!groups.has(qualification)) groups.set(qualification,[]);
    groups.get(qualification).push(item);
  }
  const itemRow=item=>row(item,'designation',[t('designation'),item.qualification].filter(Boolean).join(' · '));
  return entries.length ? `<section class="designation-list"><h2>${escape(t('geoNames'))}</h2>${[...groups].map(([qualification,items],index)=>`<section>${qualification?`<h3>${escape(qualification)}</h3>`:''}${items.slice(0,6).map(itemRow).join('')}${items.length>6?`<details id="designations-${escape(entity.id)}-${index}"><summary>${state.lang==='ja'?`残り${items.length-6}件の地理的名称を表示`:`Show ${items.length-6} more geographic names`}</summary>${items.slice(6).map(itemRow).join('')}</details>`:''}</section>`).join('')}</section>` : '';
}

function getRecent() {
  try { return JSON.parse(localStorage.getItem('ae-recent-v1') ?? '[]').filter(item => item && Date.now() - item.at < 30 * 86400000 && find(item.kind, item.id)); } catch { return []; }
}
function recordRecent(kind, id) {
  try { localStorage.setItem('ae-recent-v1', JSON.stringify([{ kind, id, at: Date.now() }, ...getRecent().filter(item => item.id !== id || item.kind !== kind)].slice(0, 20))); } catch { /* Private browsing can disable storage without disabling the app. */ }
}

function recentHTML() {
  const recent = getRecent();
  return `<h1>${escape(t('recent'))}</h1><p class="muted">${escape(t('recentHelp'))}</p>${recent.length ? button(state.lang === 'ja' ? 'この端末の閲覧履歴を消去' : 'Clear history on this device', 'clear-recent', '', 'quiet') : ''}${recent.map(item => { const entity = find(item.kind, item.id); return row(entity, item.kind, [t(item.kind), item.kind === 'designation' ? name(find('appellation', entity.appellationId)) : regionNames(entity)].filter(Boolean).join(' · ')); }).join('') || `<p class="empty">${escape(t('noRecent'))}</p>`}`;
}

function aboutHTML() {
  return `<div class="about"><p class="eyebrow">Data & Sources</p><h1>${escape(t('about'))}</h1>${coverageHTML()}<p>${escape(t('aboutText'))}</p><p>${escape(t('aboutPersonal'))}</p><p>${escape(t('aboutAccuracy'))}</p><p>${escape(t('aboutFeedback'))}</p><p>${escape(t('aboutProcess'))}</p><p>${escape(t('aboutSearch'))}</p><p>${escape(t('aboutUpdate'))}</p><p class="notice">${escape(state.lang === 'ja' ? '日本語の読みは検索・表示のための編集表記です。公式な日本語名や法的同義名の認定ではありません。読みの外部根拠が未確認の品種もあり、原語名を併記します。日本語の説明がない項目は未対応と明示します。' : t('noTranslations'))}</p><dl><dt>${escape(t('version'))}</dt><dd>${escape(data.version)}</dd></dl><h2>${escape(t('sources'))}</h2>${(data.sources ?? []).map(source => `<article class="source"><p>${escape(source.agency)} · ${escape(source.title)}<br>${sourceAnchor(source)}</p>${source.archiveMember ? `<dl><dt>${escape(t('archiveDocument'))}</dt><dd>${escape(source.archiveMember)}</dd></dl>` : ''}${sourceIdentityHTML(source)}</article>`).join('')}</div>`;
}

function render() {
  if (!data) return;
  state.filters = state.filters.filter(f => !(f.kind === state.route && f.id === state.id && f.mode === 'include'));
  renderHeader();
  $('main').innerHTML = state.route === 'home' ? homeHTML() : ['country', 'region'].includes(state.route) ? regionHTML() : ['appellation', 'designation'].includes(state.route) ? detailsHTML() : state.route === 'recent' ? recentHTML() : aboutHTML();
  if (!$('results') && (state.invalidLink || invalidFilters().length)) $('main').insertAdjacentHTML('afterbegin', `<p class="notice" role="alert">${escape(t('invalidLink'))}</p>${button(t('reset'), 'reset-filters')}`);
  document.title = `${['appellation', 'designation', 'region', 'country'].includes(state.route) ? name(find(state.route, state.id)) + ' · ' : ''}Appellation Explorer`;
  renderChips(); renderCandidates(); renderResults(); restoreSnapshot();
  if (overlay) renderOverlay();
}

function openMenu(index) {
  menuFocusIndex = index;
  saveEntry();
  overlay = { type: 'chip', index };
  depth++;
  history.pushState({ ae: true, depth, state, snapshot, overlay }, '', urlFor(state));
  renderOverlay();
}

function renderOverlay() {
  if (overlay?.type !== 'chip') return;
  const filter = state.filters[overlay.index];
  if (!filter) { closeDialog(); return; }
  $('sheet').innerHTML = `<div class="sheet-head"><strong>${escape(name(find(filter.kind, filter.id)))}</strong>${button(t('close'), 'close-overlay')}</div><div class="sheet-body"><div class="menu-options">${button(filter.kind==='grape' && state.lang==='ja'?'使用可能':t('include'), 'change-filter', 'data-mode="include"')}${button(filter.kind==='grape' && state.lang==='ja'?'不使用でも可':t('exclude'), 'change-filter', 'data-mode="exclude"')}${button(t('remove'), 'change-filter', 'data-mode="remove"')}</div>${filter.kind === 'grape' ? `<p>${escape(t('excludeHelp'))}</p>` : ''}</div>`;
  if (!$('sheet').open) $('sheet').showModal();
  document.body.style.overflow = 'hidden';
}

function closeDialog() {
  if ($('sheet').open) $('sheet').close();
  document.body.style.overflow = '';
}

function toast(text) {
  $('toast').textContent = text;
  setTimeout(() => { $('toast').textContent = ''; }, 4000);
}

function addFilter(kind, id, mode = 'include') {
  const candidate = find(kind, id) ?? { kind, id };
  candidatesHidden = true;
  replace({ query: '', filters: upsertFilter(state.filters, { ...candidate, kind, id }, mode) }, false);
  if ($('query')) $('query').value = '';
  renderChips(); renderCandidates(); renderResults();
  if (matchMedia('(pointer: coarse)').matches) { $('results')?.focus({ preventScroll: true }); $('results')?.scrollIntoView({block:'nearest'}); }
  else $('query')?.focus({ preventScroll: true });
  saveEntry();
}

document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('main').focus(); return; }
  const target = event.target.closest('[data-action]');
  if (!target || !data) return;
  const { action, id, kind } = target.dataset;
  if (action === 'brand-home') {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (state.route === 'home' && !state.contextualSearch && !state.returnTo) { window.scrollTo(0,0); $('main').focus({preventScroll:true}); }
    else navigate('home', null, {returnTo:null});
  }
  else if (action === 'back') history.back();
  else if (action === 'home') navigate('home', null, {returnTo:null});
  else if (action === 'navigate' || action === 'candidate-navigate') {
    if (action === 'candidate-navigate') { replace({query:''},false); if ($('query')) $('query').value=''; candidatesHidden=true; }
    navigate(kind, id || null);
  }
  else if (action === 'open-match') navigate(kind, id, { contextWine: target.dataset.wine || null });
  else if (action === 'widen-scope') navigate('home',null,{query:'',originScope:null});
  else if (action === 'copy-search') {
    const url = new URL(urlFor({...state,query:''}),location.href).href;
    try { await navigator.clipboard.writeText(url); $('copy-feedback').textContent = state.lang==='ja'?'リンクをコピーしました':'Link copied'; }
    catch { $('copy-feedback').innerHTML = `<label>${state.lang==='ja'?'コピーできませんでした。以下のリンクを選択してコピーしてください。':'Copy failed. Select and copy this link.'}<input readonly value="${escape(url)}"></label>`; $('copy-feedback').querySelector('input').select(); }
  }
  else if (action === 'language') { preferredLanguage = target.dataset.language; replace({ lang: preferredLanguage }); document.querySelector(`[data-action=language][data-language=${preferredLanguage}]`)?.focus({preventScroll:true}); }
  else if (action === 'clear-recent') { try { localStorage.removeItem('ae-recent-v1'); render(); $('main').focus(); toast(state.lang === 'ja' ? '閲覧履歴を消去しました。検索条件は保持しています。' : 'History cleared. Search filters are retained.'); } catch { toast(state.lang === 'ja' ? 'この端末では履歴を消去できませんでした。' : 'Could not clear local history.'); } }
  else if (action === 'clear-grape-query') { const input=target.closest('.grape-list').querySelector('[data-grape-search]'); input.value=''; filterGrapeList(input); input.focus({preventScroll:true}); saveEntry(); }
  else if (action === 'more-candidates') { candidateLimit += 12; renderCandidates(); }
  else if (action === 'reset-filters') { replace({ filters: [], invalidLink: false }); }
  else if (action === 'add-filter') addFilter(kind, id, target.dataset.mode || 'include');
  else if (action === 'remove-filter' || action === 'clear-applied') {
    replace({filters: action === 'clear-applied' ? [] : state.filters.filter((_,index)=>index!==Number(target.dataset.index))},false);
    renderChips(); renderResults(); $('query')?.focus({preventScroll:true}); saveEntry();
  }
  else if (action === 'chip-menu') openMenu(Number(target.dataset.index));
  else if (action === 'close-overlay') history.back();
  else if (action === 'change-filter') {
    const index = overlay.index;
    const mode = target.dataset.mode;
    pendingAfterClose = () => {
      const filters = mode === 'remove' ? state.filters.filter((_, i) => i !== index) : state.filters.map((filter, i) => i === index ? { ...filter, mode } : filter);
      replace({ filters }, false); renderChips(); renderResults();
      const chips = document.querySelectorAll('[data-action=chip-menu]');
      (chips[Math.min(index, chips.length - 1)] || $('query'))?.focus({ preventScroll: true });
    };
    history.back();
  } else if (action === 'grape-link') {
    const wasExclude = state.filters.some(item => item.kind === 'grape' && item.id === id && item.mode === 'exclude');
    navigate(state.originScope?.route || 'home', state.originScope?.id || null, { query: '', contextualSearch: true, filters: upsertFilter(state.filters, { kind: 'grape', id }, 'include') });
    if (wasExclude) toast(t('changed'));
  } else if (action === 'section-jump') {
    event.preventDefault(); const destination=$(target.dataset.target);
    if (destination) { for (let parent=destination.parentElement; parent; parent=parent.parentElement) if (parent.tagName==='DETAILS') parent.open=true; if (target.dataset.target === 'alcohol-guide') { const wine=target.closest('.wine'); $('guide-return').innerHTML = wine ? `<a href="#${wine.id}" data-action="section-jump" data-target="${wine.id}">${state.lang==='ja'?'読んでいたタイプへ戻る':'Return to wine type'}</a>` : ''; } if (destination.tagName==='DETAILS') destination.open=true; destination.focus({preventScroll:true}); destination.scrollIntoView({block:'start'}); saveEntry(); }
  } else if (action === 'common-jump') { event.preventDefault(); $('common-grapes')?.focus(); saveEntry();

  }
});

// Preserve the existing native buttons and Tab order; arrows are a shortcut,
// not a fake combobox with inaccessible secondary actions.
document.addEventListener('keydown', event => {
  const query = $('query');
  if (event.isComposing || composingQuery || event.keyCode === 229) { if (event.key === 'Enter' && event.target.closest('#candidates')) event.preventDefault(); return; }
  const buttons = [...document.querySelectorAll('#candidates button:not([hidden])')];
  if (!query || !buttons.length || !(event.target === query || buttons.includes(event.target))) return;
  if (event.key === 'Escape') { event.preventDefault(); candidatesHidden=true; renderCandidates(); query.focus(); return; }
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const index = buttons.indexOf(event.target);
  const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
  if (next < 0) query.focus(); else buttons[Math.min(next, buttons.length - 1)].focus();
});

document.addEventListener('compositionstart', event => { if (event.target.id === 'query') composingQuery = true; });
document.addEventListener('compositionend', event => { if (event.target.id === 'query') composingQuery = false; });

function filterGrapeList(input) {
  const container = input.closest('.grape-list');
  container.querySelector('details').hidden = Boolean(input.value.trim());
  const found = new Set(findCandidates(data,input.value,state.lang).filter(c=>c.kind==='grape').map(c=>c.id));
  const buttons = [...container.querySelectorAll('.grape-buttons .grape-link')];
  const matching = buttons.filter(b=>found.has(b.dataset.id));
  container.querySelector('.grape-search-results').innerHTML = input.value.trim() ? `<p>${state.lang==='ja'?`この一覧内の候補：${matching.length}件`:`${matching.length} suggestions in this list`}</p>`+matching.map(b=>b.outerHTML).join('')+button(state.lang==='ja'?'入力を消して全一覧へ':'Clear to view all varieties','clear-grape-query','','quiet') : '';
}

document.addEventListener('input', event => {
  if (event.target.matches('[data-grape-search]')) { filterGrapeList(event.target); saveEntry(); return; }
  if (event.target.id !== 'query') return;
  // New input supersedes a previous render's deferred scroll/focus restoration.
  cancelAnimationFrame(restoreFrame);
  restoreFrame = null;
  candidateLimit = 12; candidatesHidden = false;
  replace({ query: event.target.value }, false);
  renderCandidates();
  if (event.target.value.trim()) { const rect=event.target.getBoundingClientRect(); if (rect.top < 0 || rect.bottom + 120 > (window.visualViewport?.height || innerHeight)) event.target.scrollIntoView({block:'start'}); }
});

document.addEventListener('toggle', event => {
  if (event.target.tagName === 'DETAILS' && !overlay) { saveEntry(); updateTypeSeparators(); }
}, true);

$('sheet').addEventListener('cancel', event => { event.preventDefault(); history.back(); });
window.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { if (!overlay) saveEntry(); }, 100); }, { passive: true });
window.addEventListener('popstate', event => {
  if (event.state?.ae) {
    state = { ...event.state.state, lang: preferredLanguage }; depth = event.state.depth; snapshot = event.state.snapshot; overlay = event.state.overlay;
  } else { state = readURL(); preferredLanguage = state.lang; depth = 0; snapshot = null; overlay = null; }
  closeDialog(); render();
  if (menuFocusIndex !== null && !overlay) { document.querySelector(`[data-action=chip-menu][data-index="${menuFocusIndex}"]`)?.focus({ preventScroll: true }); menuFocusIndex = null; }
  if (pendingAfterClose) { const callback = pendingAfterClose; pendingAfterClose = null; callback(); }
});
window.addEventListener('pagehide', saveEntry);

async function start() {
  try {
    const response = await fetch('./data.json', { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
    if (data.schemaVersion !== 1 || !Array.isArray(data.appellations)) throw new Error('Unsupported data schema');
    candidates = buildCandidates(data, { facets: true });
    render();
    history.replaceState({ ae: true, depth, state, snapshot: snapshot || capture(), overlay }, '', urlFor(state));
  } catch (error) {
    renderHeader();
    $('main').innerHTML = `<h1>${escape(t('loadFailed'))}</h1><p>${state.lang === 'ja' ? '通信またはデータの読み込みに失敗しました。再試行してください。' : 'The connection or data could not be read. Please retry.'}</p>${button(t('retry'), 'reload')}`;
    document.querySelector('[data-action=reload]').addEventListener('click', () => location.reload());
  }
}

start();
