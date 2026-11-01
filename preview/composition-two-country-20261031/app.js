import { textValue, displayName, buildCandidates, findCandidates, searchAppellations, upsertFilter, navigationRegionBelongs, navigationRegionIds, navigationParentId, evaluateWine, regionalAppellationGroups, transitionForAppellation, createPublicDataLoader, countryEntries, browseRegionGroups } from './lib/public-display.mjs';
import {initialReadingGroups, createDetailModel, filterDetailSubjects, browseDetailSubjects, createReadingNavigation} from './lib/detail-model.mjs';
import {detailFieldTitle, renderDetailField, renderSubjectOverview, selectSubjectOverview, renderGrapeUseScope, renderSharedFieldGroup, renderDetailSources, renderCompositionStatements} from './lib/detail-view.mjs';
import {parseExplorationQuery, serializeExplorationQuery, upsertExplorationFilter, evaluateExplorationQuery} from './lib/exploration-query.mjs';

const words = {
  ja: { back: '戻る', home: 'ホーム', title: 'ワイン呼称の探求', intro: '産地やブドウ品種を手がかりに、気になるワインの呼称を見つける。', search: '呼称・地域・品種・条件を探す', country: '国', region: '地域', appellation: '呼称', designation: '地理的名称', grape: '品種', gi: 'EU区分', traditional: '伝統的呼称', type: 'ワインのタイプ', qualifier: '公式の追加表示', countries: '国から探す', regions: '地域から探す', mainRegions: '公開済みの産地', appellations: 'この地域の呼称', include: '含む', exclude: '除外', add: '条件に追加', addExclude: '除外して追加', explore: '探索する', remove: '削除', close: '閉じる', recent: '最近見た', about: 'このアプリについて / Data & Sources', results: '件の呼称', unknown: '規定情報が不足して判定できない対象があります。', noResults: 'すべての条件に一致する呼称がありません。条件を一つ外して、探索を続けられます。', noCandidates: '一致する候補がありません。別の名称や公式原語で検索できます。', noRecent: 'まだ閲覧した呼称はありません。', noData: 'この公開版には掲載済みの呼称がありません。', original: '公式原語', parent: '所属する呼称', geoNames: 'この呼称の地理的名称', matched: '今回の条件に一致', composition: '品種構成', alcohol: 'アルコール規定', ageing: '熟成規定', sensory: '公式の色・香り・味わい', production: '生産・栽培の詳細', area: '公式生産区域', sources: '出典 / Sources', sourceLink: '公式資料を開く', agency: '出典機関', retrieved: '取得日', verified: '検証日', published: '資料の更新・公開日', version: '公開データ版', raw: '公式原文', evidence: '出典・公式原文', minimum: '最低', maximum: '最大', total: '合計', permitted: '使えるブドウ品種', includeReason: 'この品種を使用する配合が公式規定上可能', excludeHelp: '「必須」は使用が必要と確認できるタイプを探します。「使用可能」は使えることを示し、必須も含みます。未確認は一致にしません。「使用しない」は、表示した適用対象で原料品種として認められないことを根拠で確認した場合だけ一致します。複数条件は同じ対象・枝で評価し、別の対象の根拠を混ぜたり呼称全体へ一般化したりしません。', changed: '旧条件を「使用可能」に変更しました。', confirmed: '確認済み', no_obligation: 'この義務がないことを公式に確認しています。', not_applicable: 'このワインには適用されません。', not_found: 'この項目はまだ確認できていません。規定がないことを意味しません。', unverified: 'この項目の確認が完了していません。', retry: '再読み込み', loadFailed: '公開データを読み込めませんでした。', regionSearch: 'この地域を条件に追加', detailInfo: '公式一覧・登録情報・要約で確認できた内容を整理しています。詳細な規定本文は参考リンクです。掲載情報は完全な法的手引きではありません。', allRules: 'その他の規定', header: '公式規定からワインを探索', sourcesEmpty: '参照できる出典情報がありません。', state: '確認状況', share: '条件をURLで共有できます。', regionContext: '地域の探索経路', aboutText: 'Appellation Explorerは、公式一覧・登録情報・要約をワインの検索・探索用に整理するサービスです。公的機関が運営・保証する公式サービスではありません。', aboutProcess: '項目ごとに適した公式一覧・登録情報・要約を使い、出典、取得日、記載された対象・条件を保持します。この取得経路では、詳細な規定本文は参考リンクに限り、全文解析や改正履歴の独自な全件再検証は行いません。要約の詳細が未取得の場合は、確認できた基本情報だけを表示します。日本語の表示名・訳は公式原文と区別します。', aboutSearch: '検索は収録した情報源で確認できる対象・条件の範囲に限ります。主な品種の一覧だけから、割合・必須性・「使用しない」を推測しません。根拠が不足する条件は未確認であり、不一致・禁止・規定なしとは扱いません。三つの品種条件は同じ適用対象・枝で根拠を評価し、結果の対象を明示します。「使用しない」はその対象で原料品種として認められない場合に限り、呼称全体へ一般化しません。別の対象の根拠を組み合わせて一致にしません。表示・検索は、ボトルの配合や現在の法的有効性を保証するものではありません。', aboutUpdate: '出典へのリンクと取得日を示し、公表日・更新日が確認できる場合は区別して掲載します。取得時点の掲載内容を扱うもので、現在の法的有効性を保証するものではありません。取得失敗・未取得・内容の未確認は区別し、「規定なし」に置き換えません。', noRegion: 'この階層に掲載済みの地域がありません。', recentHelp: '閲覧履歴はこの端末にだけ保存されます。', noTranslations: '確認済みの翻訳がない項目は公式原語を表示しています。' },
  en: { back: 'Back', home: 'Home', title: 'Start with a place. Follow a grape.', intro: 'Explore wine appellations and permitted grapes through official regulations.', search: 'Find appellations, regions, grapes or conditions', country: 'Country', region: 'Region', appellation: 'Appellation', designation: 'Geographic designation', grape: 'Grape', gi: 'EU category', traditional: 'Traditional term', type: 'Wine type', qualifier: 'Official additional term', countries: 'Explore by country', regions: 'Explore regions', mainRegions: 'Published wine regions', appellations: 'Appellations in this region', include: 'Include', exclude: 'Exclude', add: 'Add condition', addExclude: 'Exclude', explore: 'Explore', remove: 'Remove', close: 'Close', recent: 'Recently viewed', about: 'About / Data & Sources', results: 'appellations', unknown: 'Some appellations cannot be evaluated because regulation information is incomplete.', noResults: 'No appellation meets every condition. Remove a condition to continue exploring.', noCandidates: 'No matching suggestions. Try another name or an official original name.', noRecent: 'No appellations viewed yet.', noData: 'This data version contains no published appellations.', original: 'Official original name', parent: 'Appellation', geoNames: 'Geographic names within this appellation', matched: 'Matches your conditions', composition: 'Grape composition', alcohol: 'Alcohol requirements', ageing: 'Ageing requirements', sensory: 'Official colour, aroma and taste', production: 'Production and cultivation', area: 'Official production area', sources: 'Sources', sourceLink: 'Open official source', agency: 'Authority', retrieved: 'Retrieved', verified: 'Verified', published: 'Document update / publication', version: 'Published data version', raw: 'Official original text', evidence: 'Evidence and original text', minimum: 'Minimum', maximum: 'Maximum', total: 'Combined', permitted: 'Permitted grapes', includeReason: 'An officially permitted composition can use this grape', excludeHelp: 'Required finds types where use is proved obligatory. Permitted includes required grapes. Unknown cases do not match. Not legally usable matches only when evidence excludes the grape from the stated applicable target. Combined conditions are evaluated within the same target and branch, without combining evidence from different targets or generalizing to the entire appellation.', changed: 'The retired condition has been changed to Permitted.', confirmed: 'Confirmed', no_obligation: 'Officially confirmed that this obligation does not apply.', not_applicable: 'Not applicable to this wine.', not_found: 'This requirement has not yet been confirmed. This does not establish that no requirement exists.', unverified: 'Verification of this item is incomplete.', retry: 'Reload', loadFailed: 'Unable to load the published data.', detailInfo: 'Information confirmed in official catalogues, registers and summaries. Full regulations are reference links only in this route; this is not a complete legal guide.', allRules: 'Other requirements', header: 'Explore wine through official regulations', sourcesEmpty: 'No source information is available.', state: 'Verification', share: 'Share these conditions through the URL.', regionContext: 'Geographic exploration path', aboutText: 'Appellation Explorer organises official catalogues, registers and summaries for wine search and exploration. It is not operated or endorsed by a public authority.', aboutProcess: 'We use suitable official catalogues, registers and summaries for each field, retaining the source, retrieval date and stated targets and conditions. In this route, full regulations are reference links only: we do not parse their complete text or independently reconstruct every amendment. When detailed summaries have not been retrieved, only confirmed basic information is displayed. Editorial Japanese names and translations remain distinct from official source wording.', aboutSearch: 'Search is limited to the targets and conditions established by the included sources. A main-variety list alone does not establish proportions, required use or non-use. Insufficient evidence remains unknown, not a negative match, prohibition or absence of a rule. All three grape intents evaluate evidence within the same applicable target and branch, which is stated in the result. Non-use means the grape is not legally usable in that target, not throughout the appellation. Evidence from different targets is not combined into a match. Display and search do not guarantee bottle composition or current legal validity.', aboutUpdate: 'Sources provide links and retrieval dates, with publication or update dates shown separately when available. The data reflects the captured publications, not a guarantee of current legal validity. Retrieval failures, sources not yet retrieved and unassessed content remain distinct; none means that no rule exists.', noRegion: 'No published regions at this level.', recentHelp: 'Viewing history is stored only on this device.', noTranslations: 'Fields without verified translations use the official original language.' }
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

Object.assign(words.ja, { addExclude: '除外条件に追加', changeExclude: '除外条件に変更', not_found: 'この項目はまだ確認できていません。規定がないことを意味しません。', unverified: '内容の確認が未完了です。', noCandidates: '収録範囲に一致する候補がありません。未収録の名称もあります。', missingTarget: 'この対象は現在の収録データに見つかりません。', invalidLink: '共有条件の一部が壊れているか、現在のデータでは対象不明です。条件を確認・削除してください。', reset: '条件をクリアしてやり直す', coverage: '収録範囲', moreCandidates: '候補をさらに表示', grapeSearch: 'この一覧から品種を探す', commonRules: '品種構成', commonReference: '共通の品種・適用条件を見る', cultivation: '栽培・比率の根拠', totalAlcohol: '総アルコール度数', actualAlcohol: '実アルコール度数', naturalAlcohol: '自然アルコール度数', potentialAlcohol: '潜在アルコール度数', totalAgeing: '総熟成', wood: '木樽での熟成', bottle: '瓶内熟成', included_in_total: '総熟成期間の内数', varietalLabelling: 'ボトルラベルに品種名を記載する場合', unknownNames: '判定できない呼称', archiveDownload: '7zアーカイブをダウンロード', sourceDocument: '公式文書', rawOnly: '詳細は下の根拠・原文で確認できます。' });
Object.assign(words.en, { regionSearch: 'Add this region as a condition', changeExclude: 'Change to exclusion', addExclude: 'Add exclusion condition', not_found: 'This item has not been extracted. This does not mean there is no requirement.', missingTarget: 'This target is not present in the current dataset.', invalidLink: 'Some shared conditions are malformed or refer to unknown targets. Review or remove these conditions.', reset: 'Clear conditions and start again', coverage: 'Coverage', moreCandidates: 'Show more suggestions', grapeSearch: 'Find a grape in this list', commonRules: 'Grape rules shared by these types', commonReference: 'See the shared grape rules above', cultivation: 'Cultivation and ratio evidence', totalAlcohol: 'Total alcohol', actualAlcohol: 'Actual alcohol', naturalAlcohol: 'Natural alcohol', potentialAlcohol: 'Potential alcohol', totalAgeing: 'Total ageing', wood: 'Wood ageing', bottle: 'Bottle ageing', included_in_total: 'Included in total ageing', varietalLabelling: 'Varietal label requirements', unknownNames: 'Unresolved appellations', archiveDownload: 'Download 7z archive', sourceDocument: 'Official document', rawOnly: 'Details are retained in the evidence and original text below.' });

const $ = id => document.getElementById(id);
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const button = (text, action, attributes = '', className = '') => `<button type="button" data-action="${action}" class="${className}" ${attributes}>${escape(text)}</button>`;
const t = key => words[state.lang][key] ?? key;
let data;
const publicLoader = createPublicDataLoader();
let routeGeneration = 0, routeLoading = false;
let candidates = [];
let state = history.state?.ae ? history.state.state : readURL();
state.tab ||= ['country', 'region'].includes(state.route) ? 'places' : 'types';
let tabViews = history.state?.ae ? (history.state.tabViews || {}) : {};
let preferredLanguage = state.lang;
let candidateLimit = 12;
let overlayClosing=false, modalBackground=null;
let copyGeneration = 0;
let candidatesHidden = false;
let menuFocusIndex = null;
// Uncommitted legacy choices never enter URLs or history snapshots.
let migrationDrafts = {};
let depth = history.state?.ae ? history.state.depth : 0;
let snapshot = history.state?.ae ? history.state.snapshot : null;
let overlay = history.state?.ae ? history.state.overlay : null;
let pendingAfterClose = null;
let scrollTimer;
let composingQuery = false;
let restoreFrame;

function readURL() {
  const params = new URLSearchParams(location.hash.slice(1));
  const parsed=parseExplorationQuery({...(params.has('fv')?{fv:params.get('fv')}:{}),...(params.has('f')?{f:params.get('f')}: {})});
  const filters=parsed.filters;
  const invalidLink=params.has('invalid')||parsed.status==='invalid';
  return { queryVersion:params.has('f')?parsed.version:3, tab: params.get('tab') === 'places' || (!params.has('tab') && ['country','region'].includes(params.get('r'))) ? 'places' : 'types', invalidLink, route: ['home', 'country', 'region', 'appellation', 'designation', 'recent', 'about'].includes(params.get('r')) ? params.get('r') : 'home', id: params.get('id'), query: params.get('q') || '', filters, lang: params.get('lang') === 'en' ? 'en' : 'ja', matchIds: (params.get('w') || '').split(',').filter(Boolean), contextWine: params.get('cw'), originScope: ['country','region'].includes(params.get('sr')) ? {route:params.get('sr'),id:params.get('si')} : null };
}

function urlFor(next) {
  const params = new URLSearchParams();
  if (next.tab === 'places' || (next.tab === 'types' && ['country','region'].includes(next.route))) params.set('tab', next.tab);
  if (next.route !== 'home') params.set('r', next.route);
  if (next.id) params.set('id', next.id);
  if (next.invalidLink) params.set('invalid', '1');
  if (next.filters.length) {
    try {if(next.queryVersion===null)throw new Error('Preserve unversioned legacy condition');const encoded=serializeExplorationQuery(next.filters,{version:next.queryVersion??3});params.set('fv',encoded.fv);params.set('f',encoded.f);}
    catch {params.set('f',JSON.stringify(next.filters));} // Preserve unresolved legacy meaning, never relabel it.
  }
  // Draft text belongs to local history, never to a shared condition URL.
  if (next.lang === 'en') params.set('lang', 'en');
  // Matching types are recomputed, not serialized as trusted search state.
  if (next.contextWine) params.set('cw', next.contextWine);
  if (next.originScope) { params.set('sr',next.originScope.route); params.set('si',next.originScope.id); }
  return `${location.pathname}${location.search}${params.size ? `#${params}` : ''}`;
}

function capture() {
  if (routeLoading) return snapshot || { scroll: 0, open: [] };
  const input = $('query');
  const anchors = [...document.querySelectorAll('main [data-reading-anchor]')];
  const anchor = anchors.map(element => ({ element, top: element.getBoundingClientRect().top }))
    .filter(item => item.top <= window.innerHeight && item.element.getClientRects().length)
    .sort((a,b) => Math.abs(a.top) - Math.abs(b.top))[0];
  return { version: data?.version, scroll: window.scrollY,
    anchor: anchor ? {id:anchor.element.id, offset:anchor.top} : null,
    activeId: document.activeElement?.id || null,
    open: [...document.querySelectorAll('main details[open]')].map(item => item.id).filter(Boolean),
    focus: input === document.activeElement, selection: input ? [input.selectionStart, input.selectionEnd] : null,
    grapeQueries: [...document.querySelectorAll('[data-grape-search]')].map(input => [input.id, input.value]),
    subjectSearchBase, detailBrowse,
    subjectQueries: [...document.querySelectorAll('[data-subject-search]')].map(input => [input.id,input.value]) };
}

function saveEntry() {
  if(Number.isFinite(restoreFrame))return; // Restoration is not a new reading position.
  snapshot = capture();
  history.replaceState({ ae: true, depth, state, snapshot, overlay, tabViews }, '', urlFor(state));
}

function navigate(route, id = null, extra = {}) {
  saveEntry();
  const returnEntry = { state, snapshot };
  const returnTo = { route: state.route, id: state.id, search: Boolean(state.contextualSearch || (state.route === 'home' && state.filters.length)) };
  // Returning through a traversed ancestor keeps its actual prefix, not a
  // reconstructed geographic path. Direct URLs still have no inferred trail.
  const traversed=state.route==='region'?(state.navigationTrail||[]):[];
  const ancestorIndex=traversed.indexOf(id);
  const navigationTrail=data.schemaVersion===10&&route==='region'?state.route==='region'&&navigationParentId(data,find('region',id))===state.id?[...traversed,state.id]:ancestorIndex>=0?traversed.slice(0,ancestorIndex):[]:['appellation','designation'].includes(route)&&['region','appellation','designation'].includes(state.route)?state.navigationTrail:undefined;
  state = { ...state, navigationTrail, returnEntry, tabRestored: false, grapeIntent:null, returnTo, contextualSearch: false, originScope: ['appellation','designation'].includes(route) ? ['region','country'].includes(state.route) ? {route:state.route,id:state.id} : ['appellation','designation'].includes(state.route) ? state.originScope : null : null, route, id, matchIds: [], contextWine: null, ...extra };
  depth++;
  overlay = null;
  snapshot = { scroll: 0, open: [] };
  history.pushState({ ae: true, depth, state, snapshot, overlay, tabViews }, '', urlFor(state));
  closeDialog();
  render();
  window.scrollTo(0, 0);
  $('main').focus({ preventScroll: true });
}

function replace(extra, redraw = true) {
  snapshot = capture();
  state = { ...state, ...extra };
  if(data.schemaVersion!==10) state.filters = state.filters.filter(f=>!(f.kind===state.route && f.id===state.id && f.mode==='include'));
  history.replaceState({ ae: true, depth, state, snapshot, overlay, tabViews }, '', urlFor(state));
  if (redraw) render({restorePosition:false});
  else document.querySelector('header .brand')?.setAttribute('href', homeURL());
}

function restoreSnapshot({restorePosition=true}={}) {
  cancelAnimationFrame(restoreFrame);
  clearTimeout(scrollTimer);
  const sameVersion = !snapshot?.version || snapshot.version === data?.version;
  if (!sameVersion) {
    // Keep the route and filters, never substitute a same-caption or first record.
    snapshot = { version: data?.version, scroll: 0, open: [] };
    toast(state.lang==='ja'?'データが更新されたため、詳しい読書位置は復元していません。':'The data changed; the detailed reading position was not restored.');
  }
  const restoredSnapshot=snapshot; // Keep the incoming entry fixed across queued toggle events.
  if(restoredSnapshot?.open?.includes('sources'))materializeDetailSources();
  for (const [id, value] of restoredSnapshot?.grapeQueries ?? []) if ($(id)) { $(id).value = value; filterGrapeList($(id)); }
  subjectSearchBase=restoredSnapshot?.subjectSearchBase||null;
  filterSubjectList($('subject-query')||{value:''});
  for (const [id,value] of restoredSnapshot?.subjectQueries??[])if($(id)){$(id).value=value;filterSubjectList($(id));}
  for (const id of restoredSnapshot?.open ?? []) if ($(id)) $(id).open = true;
  restoreFrame = requestAnimationFrame(() => {
    restoreFrame = null;
    if(!restorePosition)return;
    const anchor = sameVersion && restoredSnapshot?.anchor ? $(restoredSnapshot.anchor.id) : null;
    if (anchor) {
      window.scrollTo(0, window.scrollY + anchor.getBoundingClientRect().top - restoredSnapshot.anchor.offset);
      if (restoredSnapshot.activeId) $(restoredSnapshot.activeId)?.focus({preventScroll:true});
    } else if (sameVersion && state.contextWine && !restoredSnapshot?.scroll) {
      const target = $('wine-' + state.contextWine);
      if (target) { for(let parent=target;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true; }
      target?.focus({preventScroll:true}); target?.scrollIntoView({block:'start'});
    } else window.scrollTo(0, restoredSnapshot?.scroll ?? 0);
    if (restoredSnapshot?.focus && $('query')) {
      $('query').focus({ preventScroll: true });
      if (restoredSnapshot.selection) $('query').setSelectionRange(...restoredSnapshot.selection);
    }
  });
}

function find(kind, id) {
  if (kind === 'appellation' && transitionForAppellation(data,id)) return transitionForAppellation(data,id);
  const collection = { country: 'countries', region: 'regions', grape: 'grapes', appellation: 'appellations', designation: 'designations' }[kind];
  return collection ? (data[collection] ?? []).find(item => item.id === id) : candidates.find(item => item.kind === kind && item.id === id) ?? data.candidates?.find(item => item.kind === kind && item.id === id);
}
const scopedApps = () => [...new Map(data.appellations.filter(app => state.route === 'country' ? app.countryId === state.id : state.route === 'region' ? navigationRegionBelongs(data, navigationRegionIds(data,app), state.id) : true).map(app => [app.id,app])).values()];
const grapeModeLabel = mode => ({ja:{listed:'資料に掲載',permitted:'使用可能',include:'意味の選択が必要',required:'必須','non-use':'使用しない',exclude:'廃止条件：不使用でも可'},en:{listed:'Listed in documents',permitted:'Permitted',include:'Choose meaning',required:'Required','non-use':'Not legally usable',exclude:'Retired: Can omit'}}[state.lang][mode]||mode);
const retiredFilters = () => state.filters.filter(f=>f.kind==='grape' && f.mode==='exclude');
const retiredMessage = () => state.lang==='ja'?'旧条件「不使用でも可」は廃止しました。条件を解除するか、「必須」「使用可能」を選び直してください。条件を自動で読み替えず、検索結果は表示していません。':'The old Can omit condition has been retired. Remove it or explicitly choose Required or Permitted. It has not been converted and search results are paused.';
const filterLabel = filter => filter.kind==='grape'?`${name(find('grape',filter.id))||filter.id}${state.lang==='ja'?'：':': '}${grapeModeLabel(filter.mode)}`:`${state.lang==='ja'?`${filter.mode==='exclude'?'除外する':''}${t(filter.kind)}`:`${t(filter.mode)} ${t(filter.kind)}`}: ${name(find(filter.kind, filter.id)) || filter.id}`;
function shortWine(wine) { const reading=data?.readerPresentation?.records.find(r=>r.recordId===wine.id);return reading?textValue(reading.title,state.lang):textValue(wine.shortName,state.lang)||name(wine); }
const coverageHTML = () => `<p class="coverage">${escape(t('coverage'))}: ${data.appellations.length} ${state.lang === 'ja' ? '呼称' : 'appellations'} / ${data.regions.length} ${state.lang === 'ja' ? '地域（限定収録）' : 'regions (limited coverage)'}</p>`;
const invalidFilters = () => state.filters.filter(filter => !find(filter.kind, filter.id));
const activeFilters = () => {
  if (data.schemaVersion===10 || !['country', 'region'].includes(state.route)) return state.filters;
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
function initialView(tab=state.tab) { return {grapeIntent:null,queryVersion:3,tab,route:'home',id:null,query:'',filters:[],lang:preferredLanguage,matchIds:[],contextWine:null,originScope:null,invalidLink:false}; }
function homeURL() { return urlFor(initialView()); }
function resetHome() {
  if(overlay){pendingAfterClose=resetHome;requestOverlayClose();return;}
  if(state.route==='home'&&!state.query&&!state.filters.length&&!state.invalidLink&&!state.grapeIntent)return;
  saveEntry(); const tab=state.tab;delete migrationDrafts[tab];state=initialView(tab);tabViews={...tabViews};delete tabViews[tab];snapshot={scroll:0,open:[]};
  depth++; overlay=null; pendingAfterClose=null; menuFocusIndex=null;
  candidatesHidden=false; candidateLimit=12;
  history.pushState({ae:true,depth,state,snapshot,overlay,tabViews},'',urlFor(state));
  closeDialog(); render(); window.scrollTo(0,0); $('main').focus({preventScroll:true});
}
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

function regionNames(app) { return (navigationRegionIds(data,app) ?? []).map(id => name(find('region', id))).filter(Boolean).join(' · '); }
function wineNames(app) {
  const names = [...new Set((app.wines ?? []).map(wine => name(wine)).filter(Boolean))];
  return [...names.slice(0, 3), ...(names.length > 3 ? [state.lang === 'ja' ? `ほか${names.length - 3}タイプ` : `+ ${names.length - 3} types`] : [])].join(' · ');
}

function searchUI() {
  const scope = ['country','region'].includes(state.route) ? `<p class="search-scope">${escape(state.lang==='ja' ? `検索範囲：${name(find(state.route,state.id))}` : `Search within ${name(find(state.route,state.id))}`)}</p>` : '';
  return `<section id="search-controls" tabindex="-1" class="search-box" aria-label="${escape(t('search'))}">${scope}<label for="query" class="search-label">${escape(state.lang === 'ja' ? '産地・品種・タイプを探す' : 'Find places, grapes or types')}</label><p id="query-help" class="sr-only">${escape(state.lang === 'ja' ? '候補を選ぶと条件に追加、または詳細へ移動します。' : 'Select a suggestion to add a filter or open details.')}</p><input type="search" id="query" value="${escape(state.query)}" placeholder="${escape(t('search'))}" autocomplete="off" aria-describedby="query-help" aria-controls="candidates" aria-expanded="${Boolean(state.query)}"><p id="candidate-status" class="sr-only" role="status"></p><div id="candidates" class="candidates"></div><section id="applied-filters" aria-label="${state.lang === 'ja' ? '適用中の条件' : 'Applied filters'}"><h2 class="filters-heading">${state.lang === 'ja' ? '適用中の条件' : 'Applied filters'}</h2><div id="chips" class="chips"></div></section><div id="grape-intent"></div></section><section id="results" tabindex="-1" aria-live="polite" aria-atomic="false"></section>`;
}

const includedCount = count => state.lang === 'ja' ? `収録呼称：${count}件` : `${count} included appellations`;
// Decorative icons share one neutral line style; the adjacent text names the action.
function explorationIcon(kind) {
  const drawing=kind==='places'?'<path d="M19.2 10c0 6-7.2 11-7.2 11S4.8 16 4.8 10a7.2 8 0 1 1 14.4 0Z"/><circle cx="12" cy="10" r="2"/>':'<path d="M7 3h10l1 6a6 6 0 0 1-12 0Z M6.3 8h11.4 M12 15v6 M8 21h8"/>';
  return `<svg class="exploration-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawing}</svg>`;
}
// Only explicit public type identities select a pictogram; names/qualifiers do not.
function wineTypeIcon(id) {
  const kinds={'published-heading:red':'red','published-heading:white':'white','published-heading:rose':'rose','published-heading:sparkling':'sparkling'};
  const kind=Object.hasOwn(kinds,id)?kinds[id]:null;
  if(!kind)return '';
  const liquid=['red','rose'].includes(kind)?`<path d="M6.1667 8h11.6666L18 9a6 6 0 0 1-12 0Z" fill="currentColor" stroke="none"${kind==='rose'?' opacity="0.25"':''}/>`:'';
  const glass=kind==='sparkling'?'<path d="M9 2h6v9c0 3-1.3 5-3 5s-3-2-3-5Z M9 6h6 M12 16v5 M8 21h8"/>':'<path d="M7 3h10l1 6a6 6 0 0 1-12 0Z M6.3 8h11.4 M12 15v6 M8 21h8"/>';
  return `<svg class="exploration-icon wine-type-icon" data-wine-type="${kind}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${liquid}${glass}</svg>`;
}
function withLeadingIcon(html,icon) {return icon?html.replace('>',`>${icon}`):html;}
function homeHTML() {
  const ja = state.lang === 'ja';
  if (state.tab === 'places') {
    const countries = countryEntries(data);
    return `<h1 class="home-title">${ja?'産地から探す':'Explore by place'}</h1>${searchUI()}<section id="country-entrances"><h2>${escape(t('countries'))}</h2><div class="country-grid">${sort(countries.map(item=>item.entity)).map(entity=>row(entity,'country',includedCount(countries.find(item=>item.entity.id===entity.id).count))).join('')}</div></section>${aboutLink()}`;
  }
  // These are existing public contract identities, never inferred from wine names.
  const shortcuts = [['red','赤','Red'],['white','白','White'],['rose','ロゼ','Rosé'],['sparkling','泡','Sparkling']];
  return `<h1 class="home-title">${ja?'ワインの種類から探す':'Explore by wine type'}</h1>${searchUI()}<section id="type-entrances" aria-label="${ja?'色・タイプから探す':'Explore colours and types'}"><div class="type-shortcuts">${shortcuts.map(([key,label,en])=>{
    const candidate=candidates.find(c=>c.kind==='type'&&c.id==='published-heading:'+key);
    const icon=wineTypeIcon('published-heading:'+key);
    return `<button type="button" ${candidate?`data-action="add-filter" data-kind="type" data-id="${escape(candidate.id)}"`:'disabled'}>${icon}<span>${ja?label:en}</span>${candidate?'':`<small>${ja?'直接選択は未対応':'Shortcut unavailable'}</small>`}</button>`;
  }).join('')}</div></section><p>${button(t('recent'),'navigate','data-kind="recent"','quiet')}</p>${aboutLink()}`;
}

function renderTabs() {
  const nav = $('explore-tabs');
  if (!nav) return;
  nav.setAttribute('aria-label', state.lang==='ja'?'探索の入口':'Explore');
  nav.innerHTML = [['types','ワインの種類から探す','By wine type'],['places','産地から探す','By place']].map(([tab,ja,en])=>`<button type="button" data-action="switch-tab" data-tab="${tab}" aria-pressed="${state.tab===tab}">${explorationIcon(tab)}<span>${state.lang==='ja'?ja:en}</span></button>`).join('');
}
function switchTab(tab) {
  if (!['types','places'].includes(tab) || tab === state.tab) return;
  saveEntry();
  tabViews = {...tabViews, [state.tab]: {state, snapshot}};
  const saved = tabViews[tab];
  state = saved ? {...saved.state, lang:preferredLanguage, tabRestored:true} : {queryVersion:3,tab,route:'home',id:null,query:'',filters:[],lang:preferredLanguage,matchIds:[],contextWine:null,originScope:null,invalidLink:false};
  snapshot = saved?.snapshot || {scroll:0,open:[]};
  depth++; overlay=null; pendingAfterClose=null; menuFocusIndex=null;
  candidatesHidden=false; candidateLimit=12;
  history.pushState({ae:true,depth,state,snapshot,overlay,tabViews},'',urlFor(state));
  closeDialog(); render();
  document.querySelector(`[data-action="switch-tab"][data-tab="${tab}"]`)?.focus({preventScroll:true});
}
function returnFromTab() {
  const entry = state.returnEntry;
  if (!state.tabRestored || !entry) { history.back(); return; }
  saveEntry();
  state={...entry.state,lang:preferredLanguage,tabRestored:true}; snapshot=entry.snapshot;
  depth++; overlay=null;
  history.pushState({ae:true,depth,state,snapshot,overlay,tabViews},'',urlFor(state));
  closeDialog(); render();
}

function regionGroupsHTML(countryId, parentId) {
  const groups = browseRegionGroups(data, countryId, parentId);
  if (!groups.length) return '';
  return `<section id="child-regions"><h2>${escape(t('regions'))}</h2>${groups.map(group=>`<section class="browse-region-group" data-browse-group="${escape(group.id)}">${group.label?`<h3>${escape(textValue(group.label,state.lang))}</h3>`:''}<div class="browse-region-list">${sort(group.entries.map(item=>item.entity)).map(entity=>row(entity,'region',includedCount(group.entries.find(item=>item.entity.id===entity.id).count))).join('')}</div></section>`).join('')}</section>`;
}


// Group only the already evaluated regional results. Headings never enter route
// state or filters, and each public appellation ID contributes once.
function resultsCountHTML(filtered, count, total, scopeName) {
  const ja=state.lang==='ja',compact=data.schemaVersion===10&&!filtered;
  const heading=ja?filtered?`条件に合う呼称：${count}件`:compact?`収録呼称：${count}件`:`${scopeName}の収録呼称：${count}件`:`${count} ${filtered?'matching':'included'} appellations`;
  const denominator=compact?'':`<small>${escape(ja?`${scopeName}の収録${total}呼称から検索（限定収録）`:`Search among ${total} included appellations in ${scopeName}`)}</small>`;
  return `<div class="results-count"><strong>${escape(heading)}</strong>${denominator}</div>`;
}

function groupedResultsHTML(results, renderCard) {
  const unique = [...new Map(results.map(result => [result.appellation.id, result])).values()];
  const ordered = entries => [...entries].sort((a,b) => name(a.appellation).localeCompare(name(b.appellation),state.lang) || a.appellation.id.localeCompare(b.appellation.id));
  if (state.route !== 'region') return ordered(unique).map(renderCard).join('');
  const byId = new Map(unique.map(result => [result.appellation.id,result]));
  return regionalAppellationGroups(data, unique.map(result => result.appellation), state.id).map(group => {
    const entries = ordered(group.appellations.map(app => byId.get(app.id)).filter(Boolean));
    if (!entries.length) return '';
    return `<section class="appellation-group" data-appellation-group="${escape(group.id)}"><h2 class="appellation-group-heading">${escape(textValue(group.label,state.lang))} <span class="appellation-group-count">${state.lang==='ja'?`${entries.length}件`:`${entries.length} appellations`}</span></h2>${entries.map(result => renderCard(result, group.id)).join('')}</section>`;
  }).join('');
}
function premierCruHTML(app) {
  return app.designationContext ? `<p class="designation-context">${escape(textValue(app.designationContext.text,state.lang))}</p>` : '';
}
function transitionHTML(transition) {
  const ja = state.lang === 'ja';
  const successors = transition.successorIds.map(id => (data.appellations || []).find(app => app.id === id)).filter(Boolean);
  detailReferences = []; referenceContext = name(transition); recordRecent('appellation',transition.id);
  return `<section class="identity-transition" data-transition-kind="${escape(transition.kind)}"><p class="eyebrow">${ja?'旧呼称のご案内':'Former appellation'}</p><h1>${escape(name(transition) || transition.id)}</h1><p class="notice">${escape(textValue(transition.message,state.lang))}</p><p>${ja?'旧規定は現行の規定として表示していません。':'Former regulations are not shown as current.'}${successors.length?(ja?' 確認済みの後継呼称を選んでください。':' Choose a verified successor appellation.'):''}</p><section class="transition-successors"><h2>${ja?'後継呼称':'Successor appellations'}</h2>${successors.length?successors.map(app=>row(app,'appellation')).join(''):`<p class="notice">${ja?'後継呼称は未確認です。':'Successor appellations have not been verified.'}</p>`}</section>${sourcesHTML(transition, { expandIdentityEvidence: true })}</section>`;
}

function regionHTML() {
  const entity = find(state.route, state.id);
  if (!entity) return `<p class="empty">${escape(t('noRegion'))}</p>`;
  const path = [];
  if (state.route === 'region') {
    let current = entity;
    const seen = new Set();
    if(data.schemaVersion===10)path.push(...(state.navigationTrail||[]).map(id=>find('region',id)).filter(r=>r&&r.countryId===entity.countryId&&r.id!==entity.id));
    while (current && !seen.has(current.id)) { if(data.schemaVersion===10)path.push(current);else path.unshift(current); seen.add(current.id); current = data.schemaVersion===10 ? null : find('region', current.parentId); }
  }
  const country = state.route === 'country' ? entity : find('country', entity.countryId);
  return `<p class="eyebrow">${escape(t(state.route))}</p><h1>${escape(name(entity))}</h1>${original(entity) !== name(entity) ? `<p class="original">${escape(original(entity))}</p>` : ''}${state.contextualSearch ? '' : `<nav class="path" aria-label="${escape(t('regionContext'))}">${button(t('home'),'home','','quiet')}${[country,...path].filter(Boolean).map(item=>{const current=item.id===entity.id;return `<span class="path-item"><span aria-hidden="true">›</span>${current ? `<span class="path-current" aria-current="page">${escape(name(item))}</span>` : button(name(item),'navigate',`data-kind="${item===country?'country':'region'}" data-id="${escape(item.id)}"`,'quiet')}</span>`;}).join('')}</nav>`}${data.schemaVersion===10?'':`<p class="muted">${escape(state.lang === 'ja' ? 'この地域・国の範囲内で、選択した条件をすべて満たす呼称を検索します。' : 'Search within this region or country, matching every selected condition.')}</p>`}${regionGroupsHTML(country.id, state.route==='region'?entity.id:null)}${searchUI()}${aboutLink()}`;
}

function migrationState() {
  const version=state.queryVersion??3;
  const unresolved=state.filters.flatMap((filter,index)=>{
    const parsed=parseExplorationQuery({...(state.queryVersion===null?{}:{fv:String(version)}),f:JSON.stringify([filter])});
    return ['migration-required','ambiguous','retired'].includes(parsed.status)?[index]:[];
  });
  if(!unresolved.length){delete migrationDrafts[state.tab];return null;}
  const key=JSON.stringify([state.queryVersion,state.filters]);
  if(migrationDrafts[state.tab]?.key!==key)migrationDrafts[state.tab]={key,choices:new Map(),additions:[]};
  return {...migrationDrafts[state.tab],unresolved};
}
function applyFilterChoice({index=null,kind,id,mode}) {
  const draft=migrationState();
  if(draft){
    if(index!=null&&mode==='remove')draft.choices.set(index,null);
    else {
      const positions=state.filters.flatMap((f,i)=>f.kind===kind&&f.id===id?[i]:[]);
      if(positions.length){draft.choices.set(positions[0],{kind,id,mode});for(const i of positions.slice(1))draft.choices.set(i,null);}
      else {const existing=draft.additions.findIndex(f=>f.kind===kind&&f.id===id);if(existing<0)draft.additions.push({kind,id,mode});else draft.additions[existing]={kind,id,mode};}
    }
    if(draft.unresolved.some(i=>!draft.choices.has(i)))return false;
    const filters=state.filters.flatMap((f,i)=>draft.choices.has(i)?draft.choices.get(i)?[draft.choices.get(i)]:[]:[f]).concat(draft.additions);
    delete migrationDrafts[state.tab];replace({filters,queryVersion:3},false);return true;
  }
  const next=mode==='remove'?state.filters.filter((_,i)=>i!==index):kind==='grape'?(()=>{
    const first=state.filters.findIndex(f=>f.kind===kind&&f.id===id),others=state.filters.filter(f=>!(f.kind===kind&&f.id===id));
    others.splice(first<0?others.length:first,0,{kind,id,mode});return others;
  })():upsertFilter(state.filters,{kind,id},mode);
  replace({filters:next,queryVersion:3},false);return true;
}
function renderChips() {
  if (!$('chips')) return;
  const draft=migrationState();
  const chip=(originalFilter,index)=>{
    const chosen=draft?.choices.get(index),filter=chosen||originalFilter;
    const pending=draft?.choices.has(index)?`<small class="pending-choice">${state.lang==='ja'?(chosen?'選び直し中':'削除を選択済み'):(chosen?'Pending choice':'Removal selected')}</small>`:'';
    const label=filterLabel(filter);
    return `<span class="chip-pair">${pending}${withLeadingIcon(button(label,'chip-menu',`id="filter-${index}" data-index="${index}"${filter.kind==='grape'?' aria-controls="grape-intent"':' aria-haspopup="dialog"'}`,'chip '+filter.mode),filter.kind==='type'?wineTypeIcon(filter.id):'')}${button('×','remove-filter',`data-index="${index}" aria-label="${escape(label+(state.lang==='ja'?'の条件を外す':': remove filter'))}"`,'chip-remove')}</span>`;
  };
  $('chips').innerHTML=state.filters.slice(0,2).map(chip).join('')+(state.filters.length>2?`<details id="more-filters"><summary>${state.lang==='ja'?'条件をすべて表示':'Show all conditions'}</summary>${state.filters.slice(2).map((f,i)=>chip(f,i+2)).join('')}</details>`:'')+(state.filters.length?button(state.lang==='ja'?'選択した条件をすべて解除':'Clear all selected filters','clear-applied','','quiet'):'');
  if(draft?.additions.length)$('chips').innerHTML+=draft.additions.map((filter,index)=>`<span class="chip-pair"><small class="pending-choice">${state.lang==='ja'?'選び直し中':'Pending choice'}</small>${button(filterLabel(filter),'choose-grape',`data-id="${escape(filter.id)}"`,'chip')}${button('×','remove-staged-filter',`data-index="${index}" aria-label="${escape(name(find(filter.kind,filter.id)))}: ${t('remove')}"`,'chip-remove')}</span>`).join('');
  $('applied-filters').hidden=!state.filters.length&&!draft?.additions.length;
}
function focusSearchControl(index=0) {
  const control=$('filter-'+index)||$('search-controls');
  if(control?.closest){const closed=control.closest('details');if(closed)closed.open=true;}
  control?.focus({preventScroll:true});
}
function renderGrapeIntent() {
  const host=$('grape-intent');if(!host)return;
  const intent=state.grapeIntent;
  if(!intent){host.innerHTML='';return;}
  const ja=state.lang==='ja',current=intent.editIndex==null?migrationState()?.additions.find(f=>f.id===intent.id)?.mode||null:(migrationState()?.choices.get(intent.editIndex)||state.filters[intent.editIndex])?.mode;
  host.innerHTML=`<section class="grape-intent"><h2 id="grape-intent-title" tabindex="-1">${escape(name(find('grape',intent.id)))}${ja?'の条件':' condition'}</h2><div role="group" aria-labelledby="grape-intent-title">${['permitted','required','non-use'].map(mode=>`<button type="button" data-action="choose-grape-intent" data-mode="${mode}" aria-pressed="${current===mode}">${escape(grapeModeLabel(mode))}${mode==='non-use'?`<small>${ja?'原料品種として認められない':'Not allowed as a raw-material variety'}</small>`:''}</button>`).join('')}</div>${button(ja?(intent.editIndex==null?'候補へ戻る':'変更せず閉じる'):(intent.editIndex==null?'Back to suggestions':'Close without changes'),'cancel-grape-intent')}</section>`;
}
function beginGrapeIntent(id,editIndex=null) {
  replace({grapeIntent:{id,editIndex}},false);
  renderCandidates();
  $('grape-intent-title')?.focus({preventScroll:true});saveEntry();
}
function cancelGrapeIntent() {
  const intent=state.grapeIntent;if(!intent)return;
  delete migrationDrafts[state.tab];renderChips();
  replace({grapeIntent:null},false);candidatesHidden=false;renderCandidates();
  if(intent.editIndex!=null)focusSearchControl(intent.editIndex);
  else (document.querySelector(`[data-action="choose-grape"][data-id="${intent.id}"]`)||$('search-controls'))?.focus({preventScroll:true});
  saveEntry();
}

function candidateMeta(candidate) {
  if(candidate.kind==='grape')return candidate.qualification??'';
  if (candidate.kind === 'designation') return [candidate.qualification, name(find('appellation', candidate.appellationId))].filter(Boolean).join(' · ');
  if (candidate.kind === 'appellation') return [name(find('country', candidate.countryId)), ...(navigationRegionIds(data,find('appellation',candidate.id)) ?? []).map(id => name(find('region', id)))].filter(Boolean).join(' · ');
  if (candidate.kind === 'region') return [name(find('country', candidate.countryId)), name(find('region', navigationParentId(data,find('region',candidate.id))))].filter(Boolean).join(' · ');
  return '';
}

function renderCandidates() {
  if (!$('candidates')) return;
  renderGrapeIntent();
  if(state.grapeIntent){$('candidates').innerHTML='';$('candidate-status').textContent='';$('query').setAttribute('aria-expanded','false');return;}
  const all = candidatesHidden ? [] : findCandidates(data, state.query, state.lang);
  const exact = all.filter(c=>c.rank<2);
  const found = [...exact, ...all.filter(c=>c.rank>=2)].slice(0, Math.max(candidateLimit,exact.length));
  $('candidate-status').textContent = state.query && !candidatesHidden ? `${all.length} ${state.lang === 'ja' ? '候補' : 'suggestions'}` : '';
  const groups = new Map();
  for (const candidate of found) { if (!groups.has(candidate.kind)) groups.set(candidate.kind, []); groups.get(candidate.kind).push(candidate); }
  $('candidates').innerHTML = [...groups].map(([kind, values]) => `<section class="candidate-group"><h3>${escape(t(kind))}</h3>${values.map(candidate => {
    const attributes = `data-kind="${kind}" data-id="${escape(candidate.id)}"`;
    const excludeLabel = kind === 'grape' ? grapeModeLabel('required') : state.filters.some(f => f.kind === kind && f.id === candidate.id && f.mode === 'include') ? t('changeExclude') : t('addExclude');
    const isDetail = ['appellation', 'designation'].includes(kind);
    return `<div class="candidate"><button type="button" class="candidate-name" data-action="${kind==='grape'?'choose-grape':isDetail || kind === 'region' ? 'candidate-navigate' : 'add-filter'}" ${attributes}><span>${escape(name(candidate))}</span>${original(candidate) !== name(candidate) ? `<small lang="und">${escape(original(candidate))}</small>` : ''}${candidateMeta(candidate) ? `<small>${escape(candidateMeta(candidate))}</small>` : ''}<small>${escape(isDetail ? state.lang === 'ja' ? '詳細を見る' : 'View details' : kind === 'region' ? t('explore') : state.lang === 'ja' ? kind === 'grape' ? '条件を選ぶ' : '条件に追加' : kind === 'grape' ? 'Choose condition' : 'Add inclusion filter')} ›</small></button><div class="candidate-actions">${isDetail || kind==='grape' ? '' : `${kind === 'region' && (data.schemaVersion===10 || !(state.route === kind && state.id === candidate.id)) ? button(t('add'), 'add-filter', `${attributes} aria-label="${escape(name(candidate) + ': ' + t('add'))}"`) : ''}${button(excludeLabel, 'add-filter', `${attributes} data-mode="${kind==='grape'?'required':'exclude'}" aria-label="${escape(name(candidate) + ': ' + excludeLabel)}"`)}`}</div></div>`;
  }).join('')}</section>`).join('') || (state.query.trim() && !candidatesHidden ? `<p class="muted">${escape(t('noCandidates'))}</p>` : '');

  if (all.length > found.length) $('candidates').innerHTML += button(t('moreCandidates'), 'more-candidates');
  $('query').setAttribute('aria-expanded', String(Boolean(all.length)));
}

function applicabilityHTML(wines, id) {
  const scopes = new Map();
  for (const wine of wines) {
    const scope = textValue(wine.scope,state.lang);
    if (!scope || scope === shortWine(wine) || scope === name(wine) || scope === original(wine)) continue;
    if (!scopes.has(scope)) scopes.set(scope,new Set());
    scopes.get(scope).add(shortWine(wine));
  }
  if (!scopes.size) return '';
  return `<details id="applicability-${escape(id)}" class="applicability"><summary>${state.lang==='ja'?'適用条件を見る':'View applicability'}</summary>${[...scopes].map(([scope,types])=>`<p><strong>${escape([...types].join(' | '))}</strong></p><p>${escape(scopeText(scope))}</p>`).join('')}</details>`;
}

function renderResults() {
  if (!$('results')) return;
  const filtered = state.filters.length > 0;
  if ($('browse-other')) { $('browse-other').open = !filtered; $('browse-other').classList.toggle('initial-exploration', !filtered); }
  if ($('child-regions')) $('child-regions').hidden = filtered;
  for (const id of ['type-entrances','country-entrances']) if ($(id)) $(id).hidden = filtered;
  if (state.invalidLink || invalidFilters().length) { $('results').innerHTML = `<p class="notice" role="alert">${escape(t('invalidLink'))}</p>${button(t('reset'), 'reset-filters')}`; return; }
  if (retiredFilters().length) { $('results').innerHTML = `<p class="notice" role="alert">${escape(retiredMessage())}</p>`; return; }
  if (!activeFilters().length && !(data.schemaVersion===10&&['country','region'].includes(state.route))) { $('results').innerHTML = ''; return; }
  const scope = scopedApps();
  const outcome = evaluateExplorationQuery({...data, appellations:scope}, activeFilters(),{version:state.queryVersion});
  if(outcome.status!=='ok'){ $('results').innerHTML=`<p role="status">${state.lang==='ja'?'品種条件の意味を選び直してください。現在の条件は保持しています。':'Choose the meaning of the grape condition. Your filters are retained.'}</p>`;return; }
  if(outcome.reason==='mixed-scope-unproved'){
    $('results').innerHTML=`<p role="status">${state.lang==='ja'?'資料への掲載とワインごとの条件を組み合わせた判定は、今の情報ではできません。条件は保持しています。':'The current information cannot establish the combination of document listing and wine-level conditions. Your conditions are retained.'}</p><div class="condition-review">${state.filters.map((filter,index)=>button(state.lang==='ja'?`${filterLabel(filter)}を変更・削除`:`Change or remove ${filterLabel(filter)}`,'chip-menu',`data-index="${index}"`)).join('')}</div>`;return;
  }
  const results = filtered ? outcome.results : scope.map(appellation => outcome.results.find(item => item.appellation.id === appellation.id) || {appellation,matches:[]});
  const unknownCount = filtered ? outcome.unknownCount : 0, unknownAppellations = outcome.unknownAppellations;
  if(!results.length&&unknownCount){$('results').innerHTML=`<p role="status">${state.lang==='ja'?'この条件での検索は現在未対応です。':'Search with these conditions is not currently supported.'}</p>`;return;}
  results.sort((a,b)=>name(a.appellation).localeCompare(name(b.appellation),state.lang));
  const ja = state.lang === 'ja';
  const scopeName = ['region','country'].includes(state.route) ? name(find(state.route,state.id)) : ja?'全地域':'All regions';
  const resultIds=new Set(results.map(r=>r.appellation.id));
  const unknownOnly=unknownAppellations.filter(a=>!resultIds.has(a.id));
  const partialMatches=unknownAppellations.filter(a=>resultIds.has(a.id));
  const uncertainty=(apps,label,id)=>apps.length?`<details id="${id}" class="result-uncertainty"><summary>${label}（${apps.length}）</summary><ul>${apps.map(a=>`<li>${button(name(a),'open-match',`data-kind="appellation" data-id="${escape(a.id)}"`,'quiet')}</li>`).join('')}</ul></details>`:'';
  const searchExplanation = `${state.filters.some(f=>f.kind==='grape') ? `<p class="meta-line">${escape(state.filters.some(f=>f.kind==='grape'&&f.mode==='non-use')?(ja?'表示された適用対象の規定で、その品種を使用できないと確認できる結果を検索します。呼称全体や実際のボトルへの含有を示すものではありません。':'Searches rules proving that the grape cannot be used in the stated applicable target. This does not generalize to the entire appellation or describe individual bottles.'):state.filters.some(f=>f.kind==='grape'&&f.mode==='listed')?(ja?'要約への掲載を検索します。割合・使用義務・各タイプへの適用・併用可能性・不使用はこの掲載だけでは確認できません。':'Searches published summary listings. Listing alone does not establish proportions, required use, per-type application, joint use or non-use.'):(ja?'必須は規定上使用が必要な品種です。使用可能は必須も含み、個々のボトルへの含有を保証しません。':'Required means obligatory under the rules. Permitted includes required grapes and does not guarantee their presence in individual bottles.'))}</p>`:''}`;
  $('results').innerHTML = `${resultsCountHTML(filtered,results.length,scope.length,scopeName)}${filtered ? button(ja?'検索条件のリンクをコピー':'Copy search conditions link','copy-search','','quiet')+'<div id="copy-feedback" role="status"></div>' : ''}${groupedResultsHTML(results,(result,groupId)=>{
    const app=result.appellation;
    const meta=[regionNames(app),app.gi,...(app.traditionalTerms||[]),app.level].filter(Boolean).join(' · ');
    const destinations=[...new Map((result.matches||[]).filter(m=>m.designation).map(m=>[m.designation.id,m.designation])).values()];
    const scopeAnswersFor=(entity,kind)=>[...new Map([...(result.matches||[]).filter(match=>kind!=='designation'||match.designation?.id===entity.id).flatMap(match=>match.scopeOutcomes||[]),...(kind==='appellation'?result.grapeUseOutcome?.scopeOutcomes||[]:[])].map(scope=>[scope.scopeId,scope])).values()];
    const useReasons=(entity,kind,subtitle)=>{
      const scopes=scopeAnswersFor(entity,kind);
      if(!scopes.length)return `<span class="meta-line">${escape(subtitle)}</span>`;
      return scopes.map((scope,index)=>`<span class="result-reason" data-use-scope="${escape(scope.scopeId)}"><span class="result-context">${index===0&&subtitle?`${escape(subtitle)} · `:''}<span class="result-target">${escape(textValue(scope.scopeLabel,state.lang))}</span></span><span class="matched-grape-facts">${state.filters.filter(f=>f.kind==='grape').map(filterLabel).map(escape).join(' ／ ')}</span>${(scope.conditions||[]).map(condition=>`<span class="result-condition">${escape(textValue(condition,state.lang))}</span>`).join('')}</span>`).join('');
    };
    const compactRow=(entity,kind,subtitle)=>`<button type="button" class="result-row" data-action="open-match" data-kind="${kind}" data-id="${escape(entity.id)}"><span class="result-content"><span class="result-heading"><strong>${escape(name(entity))}</strong>${original(entity)!==name(entity)?` <span class="original">${escape(original(entity))}</span>`:''}</span>${useReasons(entity,kind,subtitle)}</span><span class="row-chevron" aria-hidden="true">›</span></button>`;
    return `<article class="result-entry" id="result-${escape(app.id)}">${compactRow(app,'appellation',meta)}${destinations.map(d=>compactRow(d,'designation',[t('designation'),d.qualification,name(app)].filter(Boolean).join(' · '))).join('')}</article>`;
  }) || `<p class="empty">${escape(ja?`現在の条件に一致すると確認できた呼称はありません。${unknownCount?'未確認の呼称は下から確認できます。':''}`:unknownCount?'No confirmed matches. Some targets cannot be evaluated; see below.':t('noResults'))}</p>${state.filters.length===1?button(ja?`${name(find(state.filters[0].kind,state.filters[0].id))}の条件を外す`:'Remove this condition','remove-filter','data-index="0"','quiet'):''}`}${['region','country'].includes(state.route)?`<p>${button(ja?'他の地域も探す':'Search other regions','widen-scope','','quiet')}<small>${ja?'追加した条件を維持して、検索範囲を全地域に広げます。':'Keep added conditions and search all regions.'}</small></p>`:''}${filtered?uncertainty(unknownOnly,ja?'一致を確認できていない呼称':'Appellations not confirmed to match','unknown-results')+uncertainty(partialMatches,ja?'一致した呼称のうち一部は未確認':'Matching appellations with other unconfirmed targets','partial-results'):''}${searchExplanation?`<details id="search-explanation"><summary>${ja?'検索について':'About this search'}</summary>${searchExplanation}</details>`:''}`;
  if (state.route === 'country' && !filtered && $('child-regions')) {
    $('results').innerHTML = `<details id="country-appellations"><summary>${escape(ja ? `この国の収録呼称を一覧で見る（${results.length}件）` : `View included appellations in this country (${results.length})`)}</summary>${$('results').innerHTML}</details>`;
  }
}

function scopeText(scope) { return scope; }

function aboutLink(label = t('about')) { return `<p class="footer-link">${button(label, 'navigate', 'data-kind="about"', 'quiet')}</p>`; }

let detailModel = null;
let subjectSearchBase = null;
let detailBrowse = {ownerId:null,typeId:null,qualifierId:null};
let detailMatches = [];
let pendingDetailSources = null;
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

function evidenceHTML(evidence, id, expanded = false) {
  if (!evidence?.length) return '';
  return `<details class="evidence" tabindex="-1" id="e-${escape(id)}"${expanded ? ' open' : ''}><summary>${escape(t('evidence'))}</summary>${evidence.map(item => {
    const source = (data.sources ?? []).find(source => source.id === item.sourceId);
    return `<p>${escape(source?.agency ?? '')} · ${escape(source?.title ?? '')} · ${escape(item.locator ?? '')}</p>${item.conditions ? `<p>${escape(item.conditions)}</p>` : ''}<blockquote lang="${escape(item.language || 'und')}">${escape(item.quote ?? '')}</blockquote>${source ? `${sourceAnchor(source)} <details><summary>${state.lang === 'ja' ? '文書の日付・取得記録' : 'Document dates and retrieval record'}</summary><p>${escape(source.title)} · ${escape(source.agency)}</p><p>${escape(t('retrieved'))}: ${escape(sourceDate(source.retrievedAt))}</p><p>${escape(t('published'))}: ${escape(sourceDate(source.publishedAt))}</p></details>` : ''}`;
  }).join('')}</details>`;
}

function sourceAnchor(source) {
  try { const url = new URL(source.url); if (['https:', 'http:'].includes(url.protocol)) return `<a href="${escape(url.href)}" rel="external">${escape(textValue(source.linkLabel,state.lang))}</a>`; } catch { /* Missing links are not clickable. */ }
  return '';
}

function grapeLink(id) {
  const grape = find('grape', id);
  return grape ? `<span class="grape-name">${button(name(grape), 'grape-link', `data-id="${escape(id)}" aria-label="${escape(name(grape) + (state.lang === 'ja' ? '：この品種から探す' : ': explore this grape'))}"`, 'grape-link')}${name(grape)!==original(grape)?`<small class="grape-original">${escape(original(grape))}</small>`:''}</span>` : escape(id);
}

const localizedParagraphs = paragraphs => paragraphs.map(text=>`<p>${escape(textValue(text,state.lang))}</p>`).join('');
function displayDisclosure(view,className,id){return view?`<details class="${className}" id="${escape(id)}"><summary>${escape(textValue(view.title,state.lang))}</summary>${localizedParagraphs(view.paragraphs)}</details>`:'';}
function originalTextHTML(view,id){return view?`<details id="${escape(id)}"><summary>${escape(textValue(view.label,state.lang))}</summary><p lang="${escape(view.language)}">${escape(view.text)}</p></details>`:'';}
function constraintGroupHTML(group,prefix){
  const evidenceId=`${prefix}-constraint-${group.id}`;
  const target=`e-${evidenceId}`;
  deferReference('composition',evidenceId,`<h5>${escape(textValue(group.subjectLabel,state.lang))}</h5>${evidenceHTML(group.evidence,evidenceId)}`);
  const members=group.members.map(member=>{
    const label=textValue(member.label,state.lang);
    return `<li>${member.grapeId?button(label,'grape-link',`data-id="${escape(member.grapeId)}" aria-label="${escape(label+(state.lang==='ja'?'：この品種を使える呼称を探す':': find appellations permitting this grape'))}"`,'grape-link'):escape(label)}</li>`;
  }).join('');
  const combination=group.combination?(state.lang==='ja'?(group.combination==='joint'?'合算':'単独または合算'):(group.combination==='joint'?'Combined':'Alone or jointly')):'';
  return `<section class="ratio-group constraint-group" data-ratio-basis="${escape(group.basis)}" data-member-mode="${escape(group.memberMode)}"><p class="ratio-basis">${escape(textValue(group.label,state.lang))}</p><div class="constraint-quantity"><p>${escape(textValue(group.subjectLabel,state.lang))}: <strong>${escape(textValue(group.quantity.text,state.lang))}</strong>${combination?` <span class="constraint-combination">(${escape(combination)})</span>`:''}</p>${group.eachMinimum?`<p class="constraint-each-minimum">${escape(textValue(group.eachMinimum.text,state.lang))}</p>`:''}</div>${group.conditions.length?`<div class="constraint-conditions">${localizedParagraphs(group.conditions)}</div>`:''}${members?`<ul class="constraint-members">${members}</ul>`:''}${group.contexts.length?`<div class="constraint-contexts">${localizedParagraphs(group.contexts)}</div>`:''}</section>`;
}
function compositionCoreHTML(view,prefix){
  const ratios=view.ratioGroups.map(group=>group.kind==='constraint'?constraintGroupHTML(group,prefix):`<section class="ratio-group" data-ratio-basis="${escape(group.basis)}"><p class="ratio-basis">${escape(textValue(group.label,state.lang))}</p>${group.rows.map(row=>`<div class="ratio-row"><p>${escape(textValue(row.label,state.lang))}: <strong>${escape(textValue(row.ratio,state.lang))}</strong></p>${!row.expandMembers&&row.grapeIds.length?`<ul class="ratio-varieties">${row.grapeIds.map(id=>`<li>${grapeLink(id)}</li>`).join('')}</ul>`:''}</div>${row.expandMembers?`<details class="ratio-members" id="members-${escape(prefix)}-${escape(group.id)}-${escape(row.id)}"><summary>${escape(textValue(row.membersLabel,state.lang))}</summary><div class="grape-buttons">${row.grapeIds.map(grapeLink).join('')}</div></details>`:''}`).join('')}</section>`).join('');
  const duties=view.duties.map(duty=>`<div class="duty-proof">${localizedParagraphs([duty.text,duty.explanation])}</div>${deferReference('composition',`${prefix}-required-${duty.grapeId}`,`<section class="duty-proof"><h4>${escape(name(find('grape',duty.grapeId)))} · ${state.lang==='ja'?'使用が必要な理由':'Why required'}</h4>${localizedParagraphs([duty.explanation])}${evidenceHTML(duty.evidence,`${prefix}-required-${duty.grapeId}`)}</section>`)}`).join('');
  const list=view.grapeIds.length>6?`<div class="grape-list"><label>${escape(textValue(view.listLabel,state.lang)||t('grapeSearch'))}<input id="grape-query-${escape(prefix)}" type="search" data-grape-search autocomplete="off"></label><div class="grape-search-results" aria-live="polite"></div><details id="grapes-${escape(prefix)}"><summary>${escape(textValue(view.listSummary,state.lang)||t('listedGrapes'))}</summary><div class="grape-buttons">${view.grapeIds.map(grapeLink).join('')}</div></details></div>`:`<p>${view.grapeIds.map(grapeLink).join(' · ')}</p>`;
  return `${view.notice?`<p class="notice">${escape(textValue(view.notice,state.lang))}</p>`:''}${view.summary?localizedParagraphs([view.summary]):''}<div class="grape-composition">${ratios}</div>${duties}${displayDisclosure(view.applicability,'applicability',`grape-scope-${prefix}`)}${list}${displayDisclosure(view.guide,'grape-guide',`ratios-${prefix}`)}`;
}
function grapeHTML(field,prefix){
  if(!field.compositionView)return fieldHTML(field,'composition',prefix,false);
  const view=field.compositionView;
  deferReference('composition',prefix,`${originalTextHTML(field.original,`raw-${prefix}`)}${evidenceHTML(field.evidence,`${prefix}-grapes`)}`);
  const ordered=view.orderedPair?`<section class="ordered-pair-rule">${localizedParagraphs(view.orderedPair.paragraphs)}<p>${view.orderedPair.grapeIds.map(grapeLink).join(' · ')}</p>${displayDisclosure(view.orderedPair.guide,'grape-guide',`ordered-guide-${prefix}`)}</section>`:'';
  const conditional=view.conditional?`<section class="conditional-vineyard"><p>${escape(textValue(view.conditional.referenceLabel,state.lang))}</p>${view.conditional.branches.map(branch=>`<section><h4>${escape(textValue(branch.title,state.lang))} ${escape(textValue(branch.statusLabel,state.lang))}</h4>${compositionCoreHTML(branch.content,`${prefix}-${branch.id}`)}</section>`).join('')}</section>`:'';
  const typed=[...view.main.ratioGroups,...(view.conditional?.branches||[]).flatMap(branch=>branch.content.ratioGroups)].some(group=>group.kind==='constraint');
  const status=typed&&field.state!=='known'?`<p class="constraint-field-status" data-field-state="${escape(field.state)}">${escape(textValue(field.text,state.lang))}</p>`:'';
  return `${status}${compositionCoreHTML(view.main,prefix)}${ordered}${conditional}`;
}
function fieldHTML(field,key,prefix,showLabel=true){
  if(!field)throw new Error(`Missing published display field: ${key}`);
  const labels={ja:{known:'確認済み',unknown:'未確認',conflict:'情報に食い違いがあります',notApplicable:'適用対象外',not_found:'記載未確認',unverified:'未確認',no_obligation:'この義務がないことを公式に確認しています。'},en:{known:'Confirmed',unknown:'Unknown',conflict:'Conflicting information',notApplicable:'Not applicable',not_found:'No statement found',unverified:'Unverified',no_obligation:'Officially confirmed that this obligation does not apply.'}};
  const label=!showLabel?'':['sensory','ageing','alcohol'].includes(key)?`<h3 class="rule-label regulation-heading">${escape(t(key))}</h3>`:`<span class="rule-label">${escape(t(key))}</span>`;
  const status=field.state==='known'?'':`<p class="muted">${escape(labels[state.lang][field.state])}</p>`;
  const statusDetail=field.statusDetail?`<details id="state-${escape(prefix)}-${key}" class="field-status"><summary>${escape(textValue(field.statusDetail.label,state.lang))}</summary><p>${escape(textValue(field.statusDetail.text,state.lang))}</p></details>`:'';
  const contexts=new Map();
  const values=(field.values||[]).map((value,index)=>{
    deferReference(key,`${prefix}-value-${index}`,`${value.translation?.[state.lang]?`<p>${escape(textValue(value.text,state.lang))}</p>`:''}${evidenceHTML(value.evidence,`${prefix}-${key}-value-${index}`)}`);
    const links=(value.contexts||[]).map(context=>{
      const text=textValue(context,state.lang);if(!text)return '';
      if(!contexts.has(text)){
        const id=`context-${prefix}-${key}-${contexts.size}`;contexts.set(text,id);
        deferReference(key,id,`<section id="${escape(id)}" tabindex="-1"><p>${escape(text)}</p></section>`);
      }
      const id=contexts.get(text);
      return `<details class="value-context"><summary>${state.lang==='ja'?'対象・条件':'Scope and conditions'}</summary><p>${escape(text)}</p></details>`;
    }).join(' ');
    return `<div class="${key==='alcohol'?'alcohol-value':'field-value'}"><p>${escape(value.translation?.[state.lang]||textValue(value.text,state.lang))}</p>${!value.translation?.[state.lang]&&!value.text?.[state.lang]?(value.contexts||[]).filter(c=>c?.[state.lang]).map(c=>`<p class="value-language-context">${escape(c[state.lang])}</p>`).join(''):''}${links?`<div class="value-context-links">${links}</div>`:''}</div>`;
  }).join('');
  const contextHTML='';

  const items=field.items.map((item,index)=>`<li>${item.grapeId?grapeLink(item.grapeId)+' · ':''}${escape(textValue(item.text,state.lang))}${deferReference(key,`${prefix}-${index}`,evidenceHTML(item.evidence,`${prefix}-${key}-${index}`))}</li>`).join('');
  const itemList=field.items.filter(i=>i.grapeId).length>6?`<div class="grape-list"><label for="grape-query-${escape(prefix)}">${escape(t('grapeSearch'))}</label><input id="grape-query-${escape(prefix)}" type="search" data-grape-search autocomplete="off"><div class="grape-search-results" aria-live="polite"></div><details id="grapes-${escape(prefix)}"><summary>${escape(t('listedGrapes'))}</summary><ul class="grape-buttons">${items}</ul></details></div>`:`<ul class="grape-buttons">${items}</ul>`;
  const translation=field.translation?`${localizedParagraphs([field.translation.text])}<p class="meta-line">${escape(textValue(field.translation.note,state.lang))}</p>`:'';
  const calculation=(field.calculation||[]).map(text=>`<p class="notice">${escape(textValue(text,state.lang))}</p>`).join('');
  const unmapped=field.unmappedNotice?`<p class="notice alcohol-unmapped">${escape(textValue(field.unmappedNotice,state.lang))}</p>`:'';
  const translatedValues=(field.values||[]).filter(v=>v.translation).map((v,index)=>`<section>${localizedParagraphs([v.translation])}${evidenceHTML(v.evidence,`${prefix}-${key}-translation-${index}`)}</section>`).join('');
  const references=`${translation}${translatedValues?`<section class="alcohol-translation">${translatedValues}</section>`:''}${originalTextHTML(field.original,`original-${prefix}-${key}`)}${evidenceHTML(field.evidence,`${prefix}-${key}`)}`;
  deferReference(key,prefix,references);
  return `<div class="rule${key==='alcohol'?' alcohol-rule':''}${field.translation?' translated-rule':''}" data-field="${escape(key)}" data-state="${escape(field.state)}">${label}${status}${statusDetail}${localizedParagraphs([field.translation?.text||field.text])}${values}${contextHTML}${items?itemList:''}${calculation}${unmapped}</div>${displayDisclosure(field.guide,key==='alcohol'?'alcohol-guide':'field-guide',`${key}-guide-${prefix}`)}`;
}
function optionalHTML(field,key,prefix){return fieldHTML(field,key,prefix);}
function grapeConclusionHTML(wine){
  if(state.filters.some(f=>f.kind==='grape'&&f.mode==='listed'))return ''; // Appellation listing is not a wine-level rule conclusion.
  if(state.filters.some(f=>f.kind==='grape'&&f.mode==='non-use')&&state.filters.every(f=>['country','region'].includes(f.kind)||f.kind==='grape'&&f.mode==='non-use'))return '';
  if(state.invalidLink||invalidFilters().length||!state.filters.some(f=>f.kind==='grape'))return '';
  if(retiredFilters().length)return `<p class="notice">${escape(retiredMessage())}</p>`;
  const entity=find(state.route,state.id),parent=state.route==='designation'?find('appellation',entity.appellationId):entity;
  const result=detailMatches.find(m=>m.wine.id===wine.id)||{status:'unknown',conditions:[]};
  const labels={ja:{match:'この条件は同時に成立します。',noMatch:'この条件は同時に成立しません。',unknown:'規定情報が不足して判定できません。',conflict:'情報に食い違いがあり判定できません。',notApplicable:'この条件の適用対象外です。'},en:{match:'These conditions are possible together.',noMatch:'These conditions are not possible together.',unknown:'Insufficient information.',conflict:'Conflicting information prevents evaluation.',notApplicable:'These conditions are not applicable.'}};
  return `<p class="grape-conclusion">${escape(state.filters.map(filterLabel).join(' ／ '))}：${escape(labels[state.lang][result.status])}</p>`;
}
function wineMatchConditionsHTML(wine){
  if(!state.filters.length||retiredFilters().length||state.invalidLink||invalidFilters().length)return '';
  const entity=find(state.route,state.id),parent=state.route==='designation'?find('appellation',entity.appellationId):entity;
  const result=detailMatches.find(m=>m.wine.id===wine.id)||{status:'unknown',conditions:[]};
  return result.status==='match'&&result.conditions.length?`<p class="conditional-use-notice">${result.conditions.map(c=>escape(textValue(c,state.lang))).join(' ')}</p>`:'';
}
function overviewHTML(wine,selection) {
  const subject=detailModel?.subjects.find(s=>s.id===wine.id);
  if(!subject)return '';
  return renderSubjectOverview(subject,{lang:state.lang,selection});
}
function wineHTML(wine,matched,common=false,sharedFields=[],useScopeHTML='',supplements=null) {
  const subject=detailModel.subjects.find(s=>s.id===wine.id),ja=state.lang==='ja';
  matched=matched&&Boolean(state.filters.length);
  if(subject.reader){
    const reading=subject.reader;
    const composition=subject.fields.find(f=>f.key==='composition');
    const initialGrapes=composition&&!composition.reader&&composition.state==='known'?renderDetailField(composition,{lang:state.lang,compositionHTML:grapeHTML,grapeHTML:grapeLink}):'';
    const sections=subject.fields.filter(f=>!sharedFields.includes(f.key)&&!(f.key==='composition'&&initialGrapes)).map(f=>{const body=renderDetailField(f,{lang:state.lang,compositionHTML:grapeHTML,grapeHTML:grapeLink});return body?`<details id="${escape(f.id)}" class="wine-section" data-reading-anchor><summary>${escape(detailFieldTitle(f,{lang:state.lang}))}</summary>${body}</details>`:'';}).join('');
    const scope=reading.scope?textValue(reading.scope,state.lang):'';
    return `<article class="wine reader-wine ${reading.titleKind==='whole-record-literal'?'reader-literal-title':''} ${matched?'matched':''}" id="wine-${escape(wine.id)}" tabindex="-1" data-wine-id="${escape(wine.id)}" data-reading-anchor><h2>${escape(textValue(reading.title,state.lang))}</h2>${scope?`<p class="reader-scope">${escape(scope)}</p>`:''}${wineMatchConditionsHTML(wine)}${grapeConclusionHTML(wine)}${useScopeHTML}${initialGrapes?`<section class="initial-grapes"><h3>${ja?'使用品種':'Grape varieties'}</h3>${initialGrapes}</section>`:''}${renderSubjectOverview({...subject,fields:subject.fields.filter(f=>!sharedFields.includes(f.key))},{lang:state.lang})}${sections}</article>`;
  }

  const overviewSelection=selectSubjectOverview({...subject,fields:subject.fields.filter(f=>!sharedFields.includes(f.key))},{lang:state.lang});
  const fieldBody=field=>renderDetailField(field,{lang:state.lang,compositionHTML:grapeHTML,grapeHTML:grapeLink,overviewSelection});
  const composition=subject.fields.find(f=>f.key==='composition');
  const grapes=data.schemaVersion!==8&&!common&&composition?.state==='known'?`<section class="initial-grapes" id="${escape(composition.id)}"><h3>${ja?'使用品種':'Grape varieties'}</h3>${fieldBody(composition)}</section>`:'';

  const fields=subject.fields.filter(f=>!sharedFields.includes(f.key)&&!(f.key==='composition'&&(common||grapes))).map(field=>{
    const body=fieldBody(field);if(!body)return '';
    // Unknown-only values stay in the source model; do not add empty reader controls.
    if(['unknown','unverified','not_found'].includes(field.state)&&!field.readings.length&&!field.items.length&&!field.source.translation&&!field.source.statusDetail&&!field.source.compositionView&&!field.source.guide&&!field.source.calculation?.length&&!field.source.unmappedNotice)return '';
    return `<details id="${escape(field.id)}" class="wine-section" data-reading-anchor><summary>${escape(detailFieldTitle(field,{lang:state.lang,selection:overviewSelection}))}</summary>${body}</details>`;
  }).join('');
  const notes=subject.notes.map(n=>{
    const translated=n.text?.[state.lang],raw=n.text?.original;
    const original=raw&&(!translated||n.role==='partial-reading')?`<div class="untranslated-original"><p class="untranslated-label">${ja?(translated?'未訳を含む原文':'原文（未訳）'):(translated?'Original including untranslated text':'Original (untranslated)')}</p><p>${escape(raw)}</p></div>`:'';
    return translated||original?`<details class="subject-note wine-section" id="${escape(n.id)}"><summary>${escape(n.fieldKey==='classificationNotice'?(ja?'対象・分類の補足':'Target and classification notes'):(ja?'この対象の補足条件':'Additional conditions for this target'))}</summary>${translated?`<p>${escape(translated)}</p>`:''}${original}</details>`:'';
  }).join('');
  const conditions=wine.productionConditions?`<section class="grape-conditions"><h3>${escape(textValue(wine.productionConditions.title,state.lang))}</h3>${localizedParagraphs(wine.productionConditions.paragraphs)}</section>`:'';
  const extra=fields+conditions+notes+applicabilityHTML([wine],wine.id);
  if(supplements&&extra)supplements.push(`<section class="record-supplements" data-record-supplement="${escape(wine.id)}" data-applies-records="${escape(JSON.stringify([wine.id]))}"${detailBrowse&& !browseDetailSubjects(detailModel.subjects,detailBrowse).some(s=>s.id===wine.id)?' hidden':''}>${browseDetailSubjects(detailModel.subjects,detailBrowse).length>1?`<h2>${escape(shortWine(wine))}</h2>`:''}${extra}</section>`);
  return `<article class="wine ${matched?'matched':''}" id="wine-${escape(wine.id)}" tabindex="-1" data-wine-id="${escape(wine.id)}" data-reading-anchor><h2>${escape(shortWine(wine))}</h2>${matched?`<p class="matched-label">${escape(t('matched'))}</p>`:''}${wineMatchConditionsHTML(wine)}${grapeConclusionHTML(wine)}${useScopeHTML}${grapes}${overviewHTML(wine,overviewSelection)}${supplements?'':extra}</article>`;
}

function sourceDate(value) { if (!value) return state.lang==='ja'?'この記録では未確認':'Not recorded'; const date=new Date(value); return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(state.lang,{dateStyle:'medium',timeZone:'UTC',...(String(value).includes('T')?{timeStyle:'short'}:{})}).format(date)+(String(value).includes('T')?' UTC':''); }

function sourcesHTML(entity, { expandIdentityEvidence = false } = {}) {

  const parent=entity.appellationId?find('appellation',entity.appellationId):null;
  const sourceIds = new Set([...entity.sourceIds,...(parent?.sourceIds||[])]);
  const sources = data.sources.filter(item => sourceIds.has(item.id));
  deferReference(state.route, entity.id, evidenceHTML(entity.evidence, `${entity.id}-sources`, expandIdentityEvidence));
  const groups = new Map();
  for (const item of detailReferences) {
    if (!groups.has(item.context)) groups.set(item.context, []);
    groups.get(item.context).push(item);
  }
  const references = [...groups].sort(([a], [b]) => Number(b === name(entity)) - Number(a === name(entity))).map(([context, items]) => `<section class="reference-group"><h3>${escape(context)}</h3>${items.map(item => `<section class="reference-field" data-field="${escape(item.field)}" data-prefix="${escape(item.prefix)}"><h4>${escape(t(item.field))}</h4>${item.content.replaceAll(escape(t('evidence')),escape(`${t(item.field)}：${state.lang==='ja'?'根拠と原文':'evidence and original'}`))}</section>`).join('')}</section>`).join('');
  const sourceCard = source => `<article class="source" id="source-${escape(source.id)}" tabindex="-1"><p class="eyebrow">${escape(textValue(source.linkLabel,state.lang))}</p><strong>${escape(source.title)}</strong><dl><dt>${escape(t('agency'))}</dt><dd>${escape(source.agency)}</dd><dt>${escape(t('published'))}</dt><dd>${escape(sourceDate(source.publishedAt))}</dd><dt>${state.lang === 'ja' ? '施行日' : 'Effective from'}</dt><dd>${escape(sourceDate(source.effectiveFrom))}</dd><dt>${escape(t('retrieved'))}</dt><dd>${escape(sourceDate(source.retrievedAt))}</dd>${source.verifiedAt ? `<dt>${escape(t('verified'))}</dt><dd>${escape(sourceDate(source.verifiedAt))}</dd>` : ''}</dl>${sourceAnchor(source)}</article>`;
  return `<details id="sources" class="sources-disclosure"><summary>${state.lang === 'ja' ? '出典・補足' : 'Sources and notes'}</summary><p>${escape(t('detailInfo'))}</p><p>${state.lang==='ja'?'公式記述の日本語は参考訳・要約です。個々のボトルの味を保証するものではありません。':'Japanese descriptions are reference translations or summaries, not a guarantee of every bottle’s taste.'}</p><p>${escape(state.lang === 'ja' ? '取得日は資料を保存した日、検証日は記録を確認した日です。施行日や、今日現在も改正がないことの保証ではありません。' : 'Retrieval and verification dates are not effective dates or a guarantee of no subsequent amendments.')}</p>${sources.map(sourceCard).join('')}${!sources.length?`<p class="muted">${escape(t('sourcesEmpty'))}</p>`:''}${references}</details>`;
}

function conditionalAmendmentsHTML(entity){
  if(!entity.conditionalAmendments?.length)return '';
  return `<section class="conditional-amendments"><h2>${escape(t('conditionalChanges'))}</h2>${entity.conditionalAmendments.map(a=>`<article class="rule"><h3>${escape(textValue(a.title,state.lang))}</h3><p class="meta-line">${escape(textValue(a.articleLabel,state.lang))}</p><p class="notice">${escape(textValue(a.statusLabel,state.lang))}</p>${localizedParagraphs([a.actDateLabel,a.commencementLabel,a.durationLabel])}${deferReference('conditionalChanges',`${entity.id}-${a.id}`,a.originals.map((o,index)=>originalTextHTML(o,`conditional-${entity.id}-${a.id}-${index}`)).join('')+evidenceHTML(a.evidence,`${entity.id}-conditional-${a.id}`))}</article>`).join('')}</section>`;
}

function regulatoryApplicabilityHTML(app,references=false) {
  if(!app?.applicability)return '';
  return `<p class="meta-line regulatory-applicability">${escape(textValue(app.applicability.text,state.lang))}</p>${references&&app.applicability.historicalSummaries?.length?`<details><summary>${state.lang==='ja'?'過去の収穫年に関する別条件':'Separate historical-harvest conditions'}</summary>${localizedParagraphs(app.applicability.historicalSummaries)}</details>`:''}${references?deferReference('state',app.id,evidenceHTML(app.applicability.evidence,`${app.id}-applicability`)):''}`;
}
function partialHTML(app){
  if(!app?.notice)return '';
  return deferReference('unverified',app.id,`<p class="partial-publication" data-state="${escape(app.notice.state)}">${escape(textValue(app.notice.text,state.lang))}</p>${evidenceHTML(app.notice.evidence,`${app.id}-notice`)}`);
}
function nonUseHTML(app) {
  // Historical whole-appellation proof belongs only to its legacy schema.
  if(data.schemaVersion!==5)return '';
  const filters = state.filters.filter(f=>f.kind==='grape'&&f.mode==='non-use');
  if (!filters.length) return '';
  const block = data.schemaVersion===5 ? app?.grapeNonUse : null;
  const ja = state.lang==='ja';
  return `<section class="appellation-non-use"><h2>${ja?'呼称全体での品種の使用可否':'Appellation-wide grape use'}</h2><p>${escape(ja?'旧保存形式の呼称全体にわたる判定です。適用対象・条件全域の証拠を保持し、他の検索条件でこの判定範囲を狭めません。':'Historical whole-appellation assessment. Its evidence covers the complete applicable domain; other search filters do not narrow this stored assessment.')}</p>${block?`<p>${ja?'判定の基準日':'Assessment reference date'}: ${escape(block.targetDate)} · ${ja?'対象範囲の確認':'Domain coverage'}: ${escape(block.domain.coverage==='complete'?(ja?'完了':'complete'):(ja?'未完了':'incomplete'))}</p>`:''}${filters.map(f=>{
    const entry=block?.cases.find(c=>c.grapeId===f.id),status=entry?.state??'unknown';
    const label=status==='match'?(ja?'呼称全体で使用できないことを確認':'Confirmed not legally usable throughout the appellation'):status==='noMatch'?(ja?'使用できる適用対象があるため不一致':'Does not match: use is possible in an applicable scope'):(ja?'未確認（使用禁止とは判定しません）':'Unknown (not a prohibition)');
    const evidence=entry?.evidence??entry?.witness?.evidence??[];
    return `<p>${escape(name(find('grape',f.id)))}: ${escape(label)}</p>${deferReference('composition',`${app.id}-non-use-${f.id}`,evidenceHTML(evidence,`${app.id}-non-use-${f.id}`))}`;
  }).join('')}</section>`;
}

function detailsHTML({materializeSources=false}={}) {
  const entity=find(state.route,state.id);
  if(!entity)return `<p>${escape(t('noData'))}</p>`;
  if(entity.successorIds)return transitionHTML(entity);
  detailReferences=[];detailModel=createDetailModel(data,entity);subjectSearchBase=null;
  const savedBrowse=snapshot?.version===data.version&&snapshot?.detailBrowse?.ownerId===entity.id?snapshot.detailBrowse:null;
  const parent=entity.appellationId?find('appellation',entity.appellationId):entity,ja=state.lang==='ja';
  recordRecent(state.route,entity.id);
  const queryOutcome=evaluateExplorationQuery(data,state.filters,{version:state.queryVersion});
  const hit=queryOutcome.results.find(r=>r.appellation.id===parent.id);
  detailMatches=hit?.matches||[];
  const listingContext=hit?.publishedGrapeOutcome?`<p class="listing-query-context">${ja?'この呼称の資料に、選んだ品種が掲載されています。個々のワインでの使用可否を示すものではありません。':'The selected grapes are listed in this appellation’s documents, not established as permitted in each wine.'}</p>`:queryOutcome.reason==='mixed-scope-unproved'?`<p class="listing-query-context">${ja?'資料への掲載とワインごとの条件を同時に満たすかは、まだ判定できません。選んだ条件は保持しています。':'The combination of document listing and wine-level conditions cannot be established. Your conditions are retained.'}</p>`:'';
  state.matchIds=detailMatches.filter(m=>state.route==='designation'?m.designation?.id===entity.id:!m.designation).map(m=>m.wine.id);
  const navigation=createReadingNavigation(detailModel,{saved:savedBrowse,contextId:state.contextWine,matchIds:state.matchIds});
  detailBrowse=navigation.browse;
  const ordered=navigation.ordered,matched=ordered.filter(s=>state.matchIds.includes(s.id));
  const showMatches=state.filters.length&&matched.some(s=>navigation.selectedIds.has(s.id));
  const leading=showMatches?ordered.filter(s=>state.matchIds.includes(s.id)):ordered,others=showMatches?ordered.filter(s=>!state.matchIds.includes(s.id)):[];
  const common=entity.sharedFields?.includes('composition'),shared=(entity.sharedFields||[]).filter(k=>k!=='composition');
  const selectedIds=navigation.selectedIds;
  const useScopeFirst=new Map(detailModel.grapeUseScopes.filter(scope=>scope.targetIds.length).map(scope=>[scope.id,ordered.find(s=>selectedIds.has(s.id)&&scope.targetIds.includes(s.id))?.id]));
  const renderSubjects=subjects=>{
   const supplements=[],sharedSelections=new Map(detailModel.sharedFieldGroups.map(g=>[g.id,selectSubjectOverview({fields:[g.field]},{lang:state.lang})]));
   const batchIds=new Set(subjects.map(s=>s.id)),comparisonByFirst=new Map(),comparisonMembers=new Set();
   for(const set of detailModel.readingSets){
    if(!set.targetIds.every(id=>batchIds.has(id))||!set.grapeScopes.length)continue;
    const members=subjects.filter(s=>set.targetIds.includes(s.id)),sharedKeys=new Set(set.fieldGroups.map(g=>g.source.field));
    if(members.some(s=>s.notes.length||s.source.productionConditions||s.source.applicability||detailModel.grapeUseScopes.some(g=>g.targetIds.includes(s.id)&&!set.grapeScopes.includes(g))||s.fields.some(f=>f.key!=='ageing'&&!sharedKeys.has(f.key)&&!['unknown','unverified','not_found'].includes(f.state))))continue;
    if(!members.every(s=>{const age=s.fields.find(f=>f.key==='ageing');return age&&selectSubjectOverview({fields:[age]},{lang:state.lang}).has(age.id);}))continue;
    comparisonByFirst.set(members[0].id,{set,members});for(const member of members)comparisonMembers.add(member.id);
   }
   const summaries=subjects.map(s=>{
    if(comparisonMembers.has(s.id)&&!comparisonByFirst.has(s.id))return '';

    const assigned=detailModel.grapeUseScopes.filter(scope=>useScopeFirst.get(scope.id)===s.id);
    const ownUse=assigned.filter(scope=>scope.source.target.recordIds.length===1).map(scope=>renderGrapeUseScope(scope,{lang:state.lang,grapeHTML:grapeLink,showTarget:false})).join('');
    const sets=detailModel.readingSets.filter(set=>ordered.find(subject=>selectedIds.has(subject.id)&&set.targetIds.includes(subject.id))?.id===s.id);
    const sharedDisplay=sets.map(set=>`<section class="shared-reading-set" data-applies-records="${escape(JSON.stringify(set.targetIds))}"><h2>${escape(set.targets.map(shortWine).join(' / '))}</h2>${set.grapeScopes.map(scope=>renderGrapeUseScope(scope,{lang:state.lang,grapeHTML:grapeLink,showTarget:false})).join('')}${set.fieldGroups.filter(group=>['sensory','alcohol'].includes(group.source.field)).map(group=>renderSharedFieldGroup(group,{lang:state.lang,targetName:shortWine,compositionHTML:grapeHTML,grapeHTML:grapeLink,showTargets:false,part:'overview',selection:sharedSelections.get(group.id)})).join('')}</section>`).join('');
    const ownedFields=detailModel.sharedFieldGroups.filter(group=>group.source.recordIds.includes(s.id)).map(group=>group.source.field);
    const comparison=comparisonByFirst.get(s.id);
    const record=comparison?(()=>{
     const rows=comparison.members.map(member=>{const age=member.fields.find(f=>f.key==='ageing'),selection=selectSubjectOverview({fields:[age]},{lang:state.lang});return {member,age,selection};});
     const primary=rows.map(({member,age,selection})=>`<article class="wine ageing-row ${state.matchIds.includes(member.id)?'matched':''}" id="wine-${escape(member.id)}" data-wine-id="${escape(member.id)}" data-reading-anchor tabindex="-1"><h3>${escape(shortWine(member.source))}</h3>${renderSubjectOverview({fields:[age]},{lang:state.lang,selection,showHeadings:false})}${wineMatchConditionsHTML(member.source)}${grapeConclusionHTML(member.source)}</article>`).join('');
     const extra=rows.map(({member,age,selection})=>{const body=renderDetailField(age,{lang:state.lang,overviewSelection:selection});return body?`<section><h4>${escape(shortWine(member.source))}</h4>${body}</section>`:'';}).join('');
     if(extra)supplements.push(`<section class="ageing-supplement" data-applies-records="${escape(JSON.stringify(comparison.set.targetIds))}"><details class="wine-section" id="ageing-${escape(comparison.set.id)}"><summary>${ja?'熟成の条件':'Ageing conditions'}</summary>${extra}</details></section>`);
     return `<section class="ageing-comparison" data-applies-records="${escape(JSON.stringify(comparison.set.targetIds))}"><h3>${ja?'熟成':'Ageing'}</h3>${primary}</section>`;
    })():wineHTML(s.source,state.matchIds.includes(s.id),common,[...shared,...ownedFields],ownUse,supplements).replace('<article ',selectedIds.has(s.id)?'<article ':'<article hidden ');
    const sharedAfter=detailModel.readingSets.filter(set=>(comparison?.set===set||ordered.filter(subject=>selectedIds.has(subject.id)&&set.targetIds.includes(subject.id)).at(-1)?.id===s.id)).map(set=>set.fieldGroups.map(group=>renderSharedFieldGroup(group,{lang:state.lang,targetName:shortWine,compositionHTML:grapeHTML,grapeHTML:grapeLink,showTargets:false,part:['sensory','alcohol'].includes(group.source.field)?'supplement':'all',selection:sharedSelections.get(group.id)})).join('')).join('');
    if(sharedAfter)supplements.push(sharedAfter);
    return sharedDisplay+record;
  }).join('');return summaries+supplements.join('');};
  const compositionStatements=renderCompositionStatements(detailModel,{lang:state.lang});
  const existentialUse=detailModel.grapeUseScopes.filter(scope=>scope.source.target.kind==='appellation-existential').map(scope=>renderGrapeUseScope(scope,{lang:state.lang,grapeHTML:grapeLink})).join('');
  // Two explicit display groups; unknown records remain independent and reachable.
  const {first:firstSubjects,rest:continuation}=initialReadingGroups(leading,detailModel.readingSets,selectedIds);
  const continuationHTML=(id,subjects)=>subjects.length?`<details id="${id}"><summary>${ja?`ほかのワイン情報（${subjects.filter(s=>selectedIds.has(s.id)).length}件）`:`Other wine information (${subjects.filter(s=>selectedIds.has(s.id)).length})`}</summary>${renderSubjects(subjects)}</details>`:'';
  const list=renderSubjects(firstSubjects)+continuationHTML('more-wines',continuation)+continuationHTML('other-wines',others);
  const typeGroups=navigation.typeGroups,qualifierIds=navigation.qualifierIds;
  const typeButton=(id,label)=>button(label,'detail-type',`id="browse-type-${escape(id||'all')}" data-id="${escape(id||'')}" aria-pressed="${(detailBrowse.typeId||'')===(id||'')}"`,'reading-choice');
  const showTypeChoice=[...typeGroups.values()].some(group=>group.length<ordered.length);
  const contents=(showTypeChoice||qualifierIds.length)?`<section class="subject-contents" id="subject-contents">${showTypeChoice?`<div class="reading-choices" aria-label="${ja?'種類':'Wine type'}">${typeButton(null,ja?'すべて':'All')}${[...typeGroups.keys()].map(id=>typeButton(id,name(find('type',id)))).join('')}</div>`:''}${qualifierIds.length?`<section class="qualifier-choices"><div class="reading-choices" aria-label="${ja?'追加区分':'Additional designation'}">${button(ja?'すべて':'All','detail-qualifier',`id="browse-qualifier-all" data-id="" aria-pressed="${!detailBrowse.qualifierId}"`,'reading-choice')}${qualifierIds.map(id=>button(name(find('qualifier',id)),'detail-qualifier',`id="browse-qualifier-${escape(id)}" data-id="${escape(id)}" aria-pressed="${detailBrowse.qualifierId===id}"`,'reading-choice')).join('')}</div></section>`:''}</section>`:'';
  const search=ordered.length>2?`<details id="subject-name-search"><summary>${ja?'この呼称の名前で探す':'Find a record by name'}</summary><label for="subject-query" class="sr-only">${ja?'原資料の対象名':'Source record name'}</label><input type="search" id="subject-query" data-subject-search autocomplete="off"><button type="button" data-action="clear-subject-query">${ja?'入力を消す':'Clear name search'}</button><p id="subject-query-status" role="status"></p></details>`:'';
  const first=detailModel.subjects[0];
  const commonBody=common&&first?`<section id="common-grapes" data-reading-anchor><h2>${escape(t('commonRules'))}</h2>${renderDetailField(first.fields.find(f=>f.key==='composition'),{lang:state.lang,compositionHTML:grapeHTML,grapeHTML:grapeLink})}</section>`:'';
  const sharedBody=shared.length&&first?`<details id="shared-regulations" data-reading-anchor><summary>${ja?'共通する条件':'Shared conditions'}</summary>${shared.map(key=>{const f=first.fields.find(f=>f.key===key);return f?`<h3>${escape(t(key))}</h3>${renderDetailField(f,{lang:state.lang})}`:'';}).join('')}</details>`:'';
  const documentBody=detailModel.documentStatements.filter(s=>s.source.role==='substantive').map(item=>`<details class="wine-section document-statement" id="${escape(item.id)}"><summary>${escape(textValue(item.source.label,state.lang))}</summary><p>${ja?'個々のワインへの適用は未確認です。':'Application to individual wines is not confirmed.'}</p>${item.source.explanationJa&&ja?`<p>${escape(item.source.explanationJa)}</p><div class="untranslated-original"><p class="untranslated-label">未訳を含む原文</p><p>${escape(typeof item.source.text==='string'?item.source.text:item.source.text?.original||'')}</p></div>`:item.source.text?.[state.lang]?`<p>${escape(item.source.text[state.lang])}</p>`:`<div class="untranslated-original"><p class="untranslated-label">${ja?'原文（未訳）':'Original (untranslated)'}</p><p>${escape(typeof item.source.text==='string'?item.source.text:item.source.text?.original||'')}</p></div>`}</details>`).join('');
  const designationAgeing=detailModel.owner.fields.find(f=>f.key==='ageing');
  const designationAgeingBody=designationAgeing?`<details id="designation-ageing" data-reading-anchor><summary>${ja?'呼称全体を対象とする熟成・出荷規定':'Designation-level ageing and release rules'}</summary>${renderDetailField(designationAgeing,{lang:state.lang})}</details>`:'';
  const documents=documentBody?`<section id="document-explanations">${documentBody}</section>`:'';
  const sourceCard=source=>`<article id="source-${escape(source.id)}" tabindex="-1"><h3>${escape(source.title)}</h3><p>${escape(source.agency)}</p>${sourceAnchor(source)}</article>`;
  pendingDetailSources=()=>renderDetailSources(detailModel,{inlineOriginalNoteIds:new Set(detailModel.subjects.flatMap(subject=>subject.notes.filter(n=>!subject.reader&&n.text?.original&&(!n.text?.[state.lang]||n.role==='partial-reading')).map(n=>n.id))),lang:state.lang,ownerName:o=>name(o.source),termLabel:term=>name(find(term.kind,term.id)),documentHTML:sourceCard});
  const sources=materializeSources?pendingDetailSources():`<details id="sources" class="sources-disclosure"><summary>${ja?'出典・公式原文':'Sources and official originals'}</summary><div id="sources-content"></div></details>`;
  return `<h1 id="detail-heading" tabindex="-1">${escape(name(entity))}</h1>${original(entity)!==name(entity)?`<p class="original">${escape(original(entity))}</p>`:''}<p class="meta-line">${escape([name(find('country',parent.countryId)),regionNames(parent),parent.gi,...(parent.traditionalTerms||[])].filter(Boolean).join(' · '))}</p>${state.route==='designation'?`<p>${escape(t('parent'))}: ${button(name(parent),'navigate',`data-kind="appellation" data-id="${escape(parent.id)}"`,'quiet')}</p>`:''}${listingContext}${premierCruHTML(parent)}${contents}${compositionStatements}${existentialUse}${commonBody}${sharedBody}<div class="wines">${list||(compositionStatements?'':`<p>${ja?'詳しい情報はまだ確認できていません。':'Details are not confirmed.'}</p>`)}</div>${search}${designationAgeingBody}${documents}${regulatoryApplicabilityHTML(parent,true)}${conditionalAmendmentsHTML(entity)}${state.route==='appellation'?nonUseHTML(parent)+designationList(entity):''}${aboutLink(ja?'このアプリについて':'About this app')}${sources}`;
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
  try { return JSON.parse(localStorage.getItem('ae-preview-composition-two-country-20261031-recent-v1') ?? '[]').filter(item => item && Date.now() - item.at < 30 * 86400000 && find(item.kind, item.id)); } catch { return []; }
}
function recordRecent(kind, id) {
  try { localStorage.setItem('ae-preview-composition-two-country-20261031-recent-v1', JSON.stringify([{ kind, id, at: Date.now() }, ...getRecent().filter(item => item.id !== id || item.kind !== kind)].slice(0, 20))); } catch { /* Private browsing can disable storage without disabling the app. */ }
}

function recentHTML() {
  const recent = getRecent();
  return `<h1>${escape(t('recent'))}</h1><p class="muted">${escape(t('recentHelp'))}</p>${recent.length ? button(state.lang === 'ja' ? 'この端末の閲覧履歴を消去' : 'Clear history on this device', 'clear-recent', '', 'quiet') : ''}${recent.map(item => { const entity = find(item.kind, item.id); return row(entity, item.kind, [t(item.kind), item.kind === 'designation' ? name(find('appellation', entity.appellationId)) : regionNames(entity)].filter(Boolean).join(' · ')); }).join('') || `<p class="empty">${escape(t('noRecent'))}</p>`}`;
}

function aboutHTML() {
  return `<div class="about"><p class="eyebrow">Data & Sources</p><h1>${escape(t('about'))}</h1>${coverageHTML()}<p>${escape(t('aboutText'))}</p><p>${escape(t('aboutPersonal'))}</p><p>${escape(t('aboutAccuracy'))}</p><p>${escape(t('aboutFeedback'))}</p><p>${escape(t('aboutProcess'))}</p><p>${escape(t('aboutSearch'))}</p><p>${escape(t('aboutUpdate'))}</p><p class="notice">${escape(state.lang === 'ja' ? '日本語の読みは検索・表示のための編集表記です。公式な日本語名や法的同義名の認定ではありません。読みの外部根拠が未確認の品種もあり、原語名を併記します。日本語の説明がない項目は未対応と明示します。' : t('noTranslations'))}</p><dl><dt>${escape(t('version'))}</dt><dd>${escape(data.version)}</dd></dl><h2>${escape(t('sources'))}</h2>${(data.sources ?? []).map(source => `<article class="source"><p>${escape(source.agency)} · ${escape(source.title)}<br>${sourceAnchor(source)}</p></article>`).join('')}</div>`;
}

function render({restorePosition=true}={}) {
  if (!data) return;
  const generation = ++routeGeneration;
  if (!publicLoader.isReady(state.route, state.id)) {
    routeLoading = true;
    cancelAnimationFrame(restoreFrame);
    renderHeader(); renderTabs();
    $('main').innerHTML = `<p class="notice" role="status" aria-live="polite" aria-busy="true">${state.lang === 'ja' ? 'このページの公開データを読み込んでいます…' : 'Loading published data for this page…'}</p>`;
    publicLoader.ensureRoute(state.route, state.id).then(() => {
      if (generation !== routeGeneration) return;
      routeLoading = false;
      render();
    }).catch(() => {
      if (generation !== routeGeneration) return;
      $('main').innerHTML = `<p class="notice" role="alert">${escape(t('loadFailed'))} ${state.lang === 'ja' ? '未取得のデータはオフラインでは表示できません。条件は保持しています。' : 'Data not yet downloaded is unavailable offline. Your conditions are preserved.'}</p><button type="button" id="retry-route">${escape(t('retry'))}</button>`;
      $('retry-route').addEventListener('click', render);
    });
    return;
  }
  routeLoading = false;
  if(data.schemaVersion!==10) state.filters = state.filters.filter(f => !(f.kind === state.route && f.id === state.id && f.mode === 'include'));
  renderHeader(); renderTabs();
  $('main').innerHTML = state.route === 'home' ? homeHTML() : ['country', 'region'].includes(state.route) ? regionHTML() : ['appellation', 'designation'].includes(state.route) ? detailsHTML() : state.route === 'recent' ? recentHTML() : aboutHTML();
  if (!$('results') && (state.invalidLink || invalidFilters().length)) $('main').insertAdjacentHTML('afterbegin', `<p class="notice" role="alert">${escape(t('invalidLink'))}</p>${button(t('reset'), 'reset-filters')}`);
  document.title = `${['appellation', 'designation', 'region', 'country'].includes(state.route) ? name(find(state.route, state.id)) + ' · ' : ''}Appellation Explorer`;
  renderChips(); renderCandidates(); renderResults(); restoreSnapshot({restorePosition});
  if (overlay) renderOverlay();
}

function openMenu(index) {
  if(overlay)return;
  if(state.filters[index]?.kind==='grape'){beginGrapeIntent(state.filters[index].id,index);return;}
  menuFocusIndex = index;
  saveEntry();
  overlay = { type: 'chip', index, originId:document.activeElement?.id||null };
  depth++;
  history.pushState({ ae: true, depth, state, snapshot, overlay, tabViews }, '', urlFor(state));
  renderOverlay();
}

function openSourceRecord(id,originId,referenceKind='citation') {
  const collection=detailModel?.citations;
  if(overlay||!collection?.some(s=>s.id===id))return;
  saveEntry();overlay={type:'reference',referenceKind,id,originId};depth++;
  history.pushState({ae:true,depth,state,snapshot,overlay,tabViews},'',urlFor(state));
  renderOverlay();
}
function requestOverlayClose() {
  if(!overlay||overlayClosing)return;
  overlayClosing=true;history.back();
}
function citationContextHTML(citationId,originId) {
  const exact=detailModel.links.find(edge=>edge.id===originId&&edge.to===citationId);
  const edges=exact?[exact]:detailModel.links.filter(edge=>edge.to===citationId),labels=new Set();
  for(const edge of edges){
    const field=detailModel.fields.find(f=>f.id===edge.from||f.readings.some(r=>r.id===edge.from)||f.items.some(i=>i.id===edge.from));
    const owner=detailModel.owners.find(o=>o.modelId===(field?.ownerId||edge.from));
    if(owner)labels.add([name(owner.source),field?t(field.key):''].filter(Boolean).join(' · '));
    const statement=detailModel.documentStatements.find(item=>item.id===edge.from);if(statement)labels.add(textValue(statement.source.label,state.lang));
    const shared=detailModel.sharedFieldGroups.find(group=>group.id===edge.from);if(shared)labels.add(shared.targets.map(shortWine).join(' / ')+' · '+t(shared.source.field));
    const use=detailModel.grapeUseScopes.find(scope=>scope.id===edge.from);if(use)labels.add(textValue(use.source.label,state.lang));
    for(const entry of detailModel.publishedGrapes)if(entry.observations.some(o=>o.id===edge.from))labels.add(name(entry.grape));
  }
  return [...labels].map(label=>`<p class="citation-context">${escape(label)}</p>`).join('');
}
function citationRecordHTML(citation,originId=null) {
  const e=citation.source,documentSource=(data.sources||[]).find(s=>s.id===e.sourceId);
  return `${citationContextHTML(citation.id,originId)}${documentSource?`<p>${escape(documentSource.agency)} · ${escape(documentSource.title)}</p>${sourceAnchor(documentSource)}`:''}<figure class="source-quote" data-citation-id="${escape(citation.id)}"><figcaption>${escape(e.locator)}</figcaption>${e.conditions?`<p>${escape(e.conditions)}</p>`:''}<blockquote lang="${escape(e.language||'und')}">${escape(e.quote)}</blockquote></figure>`;
}
function renderOverlay() {
  if(!overlay)return;
  let title,body;
  if(overlay.type==='chip') {
    const filter=state.filters[overlay.index];if(!filter)return;
    title=name(find(filter.kind,filter.id));
    body=`<div class="menu-options">${['include','exclude'].map(mode=>button(t(mode),'change-filter',`data-mode="${mode}"`)).join('')}${button(t('remove'),'change-filter','data-mode="remove"')}</div>`;
  } else if(overlay.type==='reference') {
    const citation=detailModel?.citations.find(c=>c.id===overlay.id);if(!citation)return;
    title=state.lang==='ja'?'引用・公式原文':'Citation and official original';body=citationRecordHTML(citation,overlay.originId);
  } else return;
  $('sheet').setAttribute('aria-label',title);
  $('sheet').innerHTML=`<div class="sheet-head"><strong>${escape(title)}</strong>${button(t('close'),'close-overlay')}</div><div class="sheet-body" tabindex="0">${body}</div>`;
  if(!modalBackground){
    modalBackground={scroll:window.scrollY,style:document.body.style.cssText||'',inert:['header','main','explore-tabs'].map(id=>[id,Boolean($(id)?.inert)])};
    for(const [id] of modalBackground.inert)if($(id))$(id).inert=true;
    Object.assign(document.body.style,{position:'fixed',top:`-${modalBackground.scroll}px`,width:'100%',overflow:'hidden'});
  }
  if(!$('sheet').open)$('sheet').showModal();
}
// Mechanical cleanup never consumes history. Close/Escape use requestOverlayClose.
function closeDialog() {
  if($('sheet').open)$('sheet').close();
  if(modalBackground){
    const saved=modalBackground;modalBackground=null;
    document.body.style.cssText=saved.style;
    for(const [id,inert] of saved.inert)if($(id))$(id).inert=inert;
    window.scrollTo(0,saved.scroll);
  }
  overlayClosing=false;
}

function toast(text) {
  $('toast').textContent = text;
  setTimeout(() => { $('toast').textContent = ''; }, 4000);
}

function addFilter(kind, id, mode = null) {
  if(kind==='grape'&&!['permitted','required','non-use'].includes(mode)){beginGrapeIntent(id);return;}
  mode ||= 'include';
  const candidate = find(kind, id) ?? { kind, id };
  candidatesHidden = true;
  applyFilterChoice({kind,id,mode});
  replace({query:''},false);
  if ($('query')) $('query').value = '';
  renderChips(); renderCandidates(); renderResults();
  focusSearchControl(Math.max(0,state.filters.findIndex(f=>f.kind===kind&&f.id===id)));
  saveEntry();
}

document.addEventListener('click', async event => {
  if (event.target.closest('.skip-link')) { event.preventDefault(); $('main').focus(); return; }
  const summary=event.target.closest('summary');
  if(summary?.parentElement?.open&&summary.parentElement.contains(document.activeElement)&&document.activeElement!==summary)summary.focus({preventScroll:true});
  const target = event.target.closest('[data-action]');
  if (!target || !data) return;
  const { action, id, kind } = target.dataset;
  if (action === 'brand-home') {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    resetHome();
  }
  else if(action==='detail-type'||action==='detail-qualifier'){
    state.contextWine=null; // An explicit local choice replaces the earlier direct-record reading target, not the search.
    detailBrowse=action==='detail-type'?{ownerId:detailModel.entity.id,typeId:target.dataset.id||null,qualifierId:null}:{...detailBrowse,qualifierId:target.dataset.id||null};
    snapshot=capture();const focusId=target.id;render({restorePosition:false});$(focusId)?.focus({preventScroll:true});saveEntry();
  }
  else if(action==='clear-subject-query'){const input=$('subject-query');if(input){input.value='';filterSubjectList(input);input.focus({preventScroll:true});saveEntry();}}
  else if (action === 'switch-tab') switchTab(target.dataset.tab);
  else if (action === 'back') returnFromTab();
  else if (action === 'home') navigate('home', null, {returnTo:null});
  else if (action === 'navigate' || action === 'candidate-navigate') {
    if (action === 'candidate-navigate') { replace({query:''},false); if ($('query')) $('query').value=''; candidatesHidden=true; }
    navigate(kind, id || null);
  }
  else if (action === 'open-match') navigate(kind, id, { contextWine: target.dataset.wine || null });
  else if (action === 'widen-scope') navigate('home',null,{query:'',originScope:null});
  else if (action === 'copy-search') {
    const url = new URL(urlFor({...state,query:''}),location.href).href;
    const feedback=$('copy-feedback'),generation=++copyGeneration;
    try { await navigator.clipboard.writeText(url); if(generation===copyGeneration && $('copy-feedback')===feedback && feedback) feedback.textContent = state.lang==='ja'?'リンクをコピーしました':'Link copied'; }
    catch { if(generation===copyGeneration && $('copy-feedback')===feedback && feedback) { feedback.innerHTML = `<label>${state.lang==='ja'?'コピーできませんでした。以下のリンクを選択してコピーしてください。':'Copy failed. Select and copy this link.'}<input readonly value="${escape(url)}"></label>`; feedback.querySelector('input').select(); } }
  }
  else if (action === 'language') { preferredLanguage = target.dataset.language; replace({ lang: preferredLanguage }); document.querySelector(`[data-action=language][data-language=${preferredLanguage}]`)?.focus({preventScroll:true}); }
  else if (action === 'clear-recent') { try { localStorage.removeItem('ae-preview-composition-two-country-20261031-recent-v1'); render({restorePosition:false}); $('main').focus({preventScroll:true}); toast(state.lang === 'ja' ? '閲覧履歴を消去しました。検索条件は保持しています。' : 'History cleared. Search filters are retained.'); } catch { toast(state.lang === 'ja' ? 'この端末では履歴を消去できませんでした。' : 'Could not clear local history.'); } }
  else if (action === 'clear-grape-query') { const input=target.closest('.grape-list').querySelector('[data-grape-search]'); input.value=''; filterGrapeList(input); input.focus({preventScroll:true}); saveEntry(); }
  else if (action === 'more-candidates') { candidateLimit += 12; renderCandidates(); }
  else if (action === 'reset-filters') { replace({ filters: [], invalidLink: false }); }
  else if(action==='remove-staged-filter'){migrationState()?.additions.splice(Number(target.dataset.index),1);renderChips();focusSearchControl();}
  else if(action==='choose-grape')beginGrapeIntent(id);
  else if(action==='cancel-grape-intent')cancelGrapeIntent();
  else if(action==='choose-grape-intent'){const intent=state.grapeIntent;if(!intent)return;replace({grapeIntent:null},false);addFilter('grape',intent.id,target.dataset.mode);renderGrapeIntent();}
  else if (action === 'add-filter') addFilter(kind, id, target.dataset.mode || null);
  else if (action === 'remove-filter' || action === 'clear-applied') {
    if(action==='clear-applied'){delete migrationDrafts[state.tab];replace({grapeIntent:null,filters:[],queryVersion:3},false);}
    else {applyFilterChoice({index:Number(target.dataset.index),mode:'remove'});replace({grapeIntent:null},false);}
    renderChips(); renderGrapeIntent(); renderResults(); focusSearchControl(); saveEntry();
  }
  else if (action === 'chip-menu') openMenu(Number(target.dataset.index));
  else if (action === 'view-citation') openSourceRecord(id,target.id,'citation');
  else if (action === 'close-overlay') requestOverlayClose();
  else if (action === 'change-filter') {
    if(overlay?.type!=='chip'||overlayClosing)return;
    const index = overlay.index;
    const mode = target.dataset.mode;
    pendingAfterClose = () => {
      const filter=state.filters[index];applyFilterChoice({index,kind:filter.kind,id:filter.id,mode});renderChips();renderResults();
      const chips = document.querySelectorAll('[data-action=chip-menu]');
      (chips[Math.min(index, chips.length - 1)] || $('search-controls'))?.focus({ preventScroll: true });
    };
    requestOverlayClose();
  } else if (action === 'grape-link') {
    navigate(state.originScope?.route || 'home', state.originScope?.id || null, { query: '', contextualSearch: true, grapeIntent:{id,editIndex:null} });
    $('grape-intent-title')?.focus({preventScroll:true});
  } else if (action === 'subject-field') {
    event.preventDefault();
    const field=$(target.dataset.field);
    if(field){for(let parent=field;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;saveEntry();}
  }
});

// Preserve the existing native buttons and Tab order; arrows are a shortcut,
// not a fake combobox with inaccessible secondary actions.
document.addEventListener('keydown', event => {
  const query = $('query');
  if(state.grapeIntent&&event.target.closest('#grape-intent')){
    if(event.isComposing||event.keyCode===229)return;
    if(event.key==='Escape'){event.preventDefault();cancelGrapeIntent();return;}
    if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight'].includes(event.key)){
      const choices=[...document.querySelectorAll('[data-action=choose-grape-intent]')],i=choices.indexOf(event.target);
      if(i>=0){event.preventDefault();choices[(i+(['ArrowDown','ArrowRight'].includes(event.key)?1:choices.length-1))%choices.length]?.focus({preventScroll:true});}return;
    }
  }
  if (event.isComposing || composingQuery || event.keyCode === 229) { if (event.key === 'Enter' && event.target.closest('#candidates')) event.preventDefault(); return; }
  const buttons = [...document.querySelectorAll('#candidates button:not([hidden])')];
  if (!query || !buttons.length || !(event.target === query || buttons.includes(event.target))) return;
  if (event.key === 'Escape') { event.preventDefault(); candidatesHidden=true; renderCandidates(); query.focus({preventScroll:true}); return; }
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
  event.preventDefault();
  const index = buttons.indexOf(event.target);
  const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
  if (next < 0) query.focus({preventScroll:true}); else buttons[Math.min(next, buttons.length - 1)].focus({preventScroll:true});
});

document.addEventListener('compositionstart', event => { if (event.target.id === 'query') composingQuery = true; });
document.addEventListener('compositionend', event => { if (event.target.id === 'query') composingQuery = false; });

function filterSubjectList(input) {
  if(!detailModel)return;
  const searching=Boolean(input.value.trim()),groups=['more-wines','other-wines'].map($).filter(Boolean);
  if(searching&&!subjectSearchBase)subjectSearchBase=Object.fromEntries(groups.map(g=>[g.id,g.open]));
  const found=new Set(filterDetailSubjects(browseDetailSubjects(detailModel.subjects,detailBrowse),input.value,state.lang).map(s=>s.id));
  for(const element of document.querySelectorAll('[data-wine-id]'))element.hidden=!found.has(element.dataset.wineId);
  for(const shared of document.querySelectorAll('[data-applies-records]')){const ids=JSON.parse(shared.dataset.appliesRecords);shared.hidden=!ids.some(id=>found.has(id));}
  for(const group of groups){
    const members=[...group.querySelectorAll('[data-wine-id]')],visible=members.filter(e=>!e.hidden).length;
    group.hidden=!visible;
    group.open=searching?Boolean(visible):Boolean(subjectSearchBase?.[group.id]??group.open);
    const count=visible,summary=group.querySelector(':scope > summary');
    if(summary)summary.textContent=state.lang==='ja'?`${'ほかのワイン情報'}（${count}件）`:`${group.id==='more-wines'?'Continue':'Other wine information'} (${count})`;
  }
  if(!searching)subjectSearchBase=null;
  if($('subject-query-status'))$('subject-query-status').textContent=searching?(found.size?(state.lang==='ja'?`${found.size}件`:`${found.size} records`):(state.lang==='ja'?'この名前に一致する情報はありません。入力を消すと全一覧に戻れます。':'No matching name. Clear the search to restore the full list.')):'';
}

function filterGrapeList(input) {
  const container = input.closest('.grape-list');
  const filtering=Boolean(input.value.trim());
  const continuation=container.querySelector('details');if(continuation)continuation.hidden=filtering;
  for(const list of container.querySelectorAll('.grape-buttons'))list.hidden=filtering;
  const found = new Set(findCandidates(data,input.value,state.lang).filter(c=>c.kind==='grape').map(c=>c.id));
  const buttons = [...container.querySelectorAll('.grape-buttons .grape-link')];
  const matching = buttons.filter(b=>found.has(b.dataset.id));
  container.querySelector('.grape-search-results').innerHTML = input.value.trim() ? `<p>${state.lang==='ja'?`この一覧内の候補：${matching.length}件`:`${matching.length} suggestions in this list`}</p>`+matching.map(b=>(b.closest('.listed-grape')||b).outerHTML).join('')+button(state.lang==='ja'?'入力を消して全一覧へ':'Clear to view all varieties','clear-grape-query','','quiet') : '';
}

document.addEventListener('input', event => {
  if(event.target.matches('[data-subject-search]')){filterSubjectList(event.target);saveEntry();return;}
  if (event.target.matches('[data-grape-search]')) { filterGrapeList(event.target); saveEntry(); return; }
  if (event.target.id !== 'query') return;
  // New input supersedes a previous render's deferred scroll/focus restoration.
  cancelAnimationFrame(restoreFrame);
  restoreFrame = null;
  candidateLimit = 12; candidatesHidden = false;
  replace({ query: event.target.value,grapeIntent:null }, false);
  renderCandidates();

});

function materializeDetailSources(){
  const target=$('sources-content');if(!target||target.dataset?.loaded||!pendingDetailSources)return;
  const full=pendingDetailSources(),body=full.slice(full.indexOf('</summary>')+10,full.lastIndexOf('</details>'));
  target.innerHTML=body;target.dataset.loaded='true';
}

document.addEventListener('toggle', event => {
  if(event.target.id==='sources'&&event.target.open)materializeDetailSources();
  if (event.target.tagName === 'DETAILS' && !overlay) { saveEntry(); }
}, true);

$('sheet').addEventListener('cancel', event => { event.preventDefault(); requestOverlayClose(); });
window.addEventListener('scroll', () => { clearTimeout(scrollTimer); scrollTimer = setTimeout(() => { if (!overlay) saveEntry(); }, 100); }, { passive: true });
window.addEventListener('popstate', event => {
  migrationDrafts={};
  const closingOrigin=overlay?.originId;
  if (event.state?.ae) {
    tabViews = event.state.tabViews || {};
    state = { ...event.state.state, lang: preferredLanguage }; depth = event.state.depth; snapshot = event.state.snapshot; overlay = event.state.overlay;
  } else { state = readURL(); preferredLanguage = state.lang; depth = 0; snapshot = null; overlay = null; }
  closeDialog(); render();
  if (menuFocusIndex !== null && !overlay) { document.querySelector(`[data-action=chip-menu][data-index="${menuFocusIndex}"]`)?.focus({ preventScroll: true }); menuFocusIndex = null; }
  if(closingOrigin&&!overlay)$(closingOrigin)?.focus({preventScroll:true});
  if (pendingAfterClose) { const callback = pendingAfterClose; pendingAfterClose = null; callback(); }
});
window.addEventListener('pagehide', saveEntry);

async function start() {
  history.scrollRestoration='manual'; // One owner restores route, open state and reading position.
  try {
    data = await publicLoader.start();
    candidates = buildCandidates(data, { facets: true });
    render();
    history.replaceState({ ae: true, depth, state, snapshot: snapshot || capture(), overlay, tabViews }, '', urlFor(state));
  } catch (error) {
    renderHeader(); renderTabs();
    $('main').innerHTML = `<h1>${escape(t('loadFailed'))}</h1><p>${state.lang === 'ja' ? '通信またはデータの読み込みに失敗しました。再試行してください。' : 'The connection or data could not be read. Please retry.'}</p>${button(t('retry'), 'reload')}`;
    document.querySelector('[data-action=reload]').addEventListener('click', start);
  }
}

start();
