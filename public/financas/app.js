(function(){
'use strict';
var ACCOUNT_KEY='mfp_device_accounts_v1',GUEST_KEY='mfp_guest_state_v1',legacyMigrationMode=false,LEGACY_KEY='mfp_local_v1',LEGACY_OLD_KEYS=['meu-financeiro-pessoal-v1','meu-financeiro-pessoal-v2'],LEGACY_PENDING='mfp_legacy_pending_v1',CLOUD_CONFIG_KEY='mfp_supabase_config_v1',state=blank(),session=null,activeEmail=null,cryptoKey=null,cloudClient=null,cloudSession=null,pending=[],timer=null,saveQueue=Promise.resolve();
var $=function(s){return document.querySelector(s)},$$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var cats={income:['Salário','Comissões','Freelance','Investimentos','Aluguel recebido','Reembolso','Outras receitas'],expense:['Moradia','Alimentação','Transporte','Contas','Saúde','Educação','Lazer','Compras','Assinaturas','Impostos','Dívidas','Cartão de crédito','Outras despesas']};
function blank(){return {transactions:[],budgets:[],goals:[],cards:[],debts:[]}}
function loadLegacyState(){
 var merged=blank(),keys=[LEGACY_KEY].concat(LEGACY_OLD_KEYS);
 keys.forEach(function(key){try{var stored=localStorage.getItem(key);if(!stored)return;var data=normalizeState(JSON.parse(stored));merged.transactions=merged.transactions.concat(data.transactions);merged.budgets=merged.budgets.concat(data.budgets);merged.goals=merged.goals.concat(data.goals);merged.cards=merged.cards.concat(data.cards);merged.debts=merged.debts.concat(data.debts)}catch(e){}});
 var seenTx=new Set();merged.transactions=merged.transactions.filter(function(t){var k=fp(t);if(seenTx.has(k))return false;seenTx.add(k);return true});
 function unique(list,keyFn){var seen=new Set();return list.filter(function(x){var k=keyFn(x);if(seen.has(k))return false;seen.add(k);return true})}
 merged.budgets=unique(merged.budgets,function(x){return x.id||String(x.category)+'|'+String(x.month||thisMonth())});
 merged.goals=unique(merged.goals,function(x){return x.id||String(x.name)+'|'+String(x.target)});
 merged.cards=unique(merged.cards,function(x){return x.id||String(x.name)+'|'+String(x.bank)});
 merged.debts=unique(merged.debts,function(x){return x.id||String(x.name)+'|'+String(x.total)});
 return normalizeState(merged)
}
function loadGuestState(){
 var raw=null;
 try{raw=localStorage.getItem(GUEST_KEY)}catch(e){}
 if(raw){try{return normalizeState(JSON.parse(raw))}catch(e){try{localStorage.removeItem(GUEST_KEY)}catch(ignore){}}}
 var legacy=loadLegacyState();
 try{localStorage.setItem(GUEST_KEY,JSON.stringify(legacy))}catch(e){}
 return legacy;
}
function mergeStates(base,incoming){
 var out=normalizeState(base||blank()),src=normalizeState(incoming||blank());
 var seenTx=new Set(out.transactions.map(fp));
 src.transactions.forEach(function(t){var k=fp(t);if(!seenTx.has(k)){seenTx.add(k);out.transactions.push(t)}});
 function mergeRecords(current,older,keyFn){var seen=new Set(current.map(keyFn));older.forEach(function(x){var k=keyFn(x);if(!seen.has(k)){seen.add(k);current.push(x)}});return current}
 out.budgets=mergeRecords(out.budgets,src.budgets,function(x){return x.id||String(x.category)+'|'+String(x.month||thisMonth())});
 out.goals=mergeRecords(out.goals,src.goals,function(x){return x.id||String(x.name)+'|'+String(x.target)});
 out.cards=mergeRecords(out.cards,src.cards,function(x){return x.id||String(x.name)+'|'+String(x.bank)});
 out.debts=mergeRecords(out.debts,src.debts,function(x){return x.id||String(x.name)+'|'+String(x.total)});
 return out;
}
function normalizeState(data){
 var raw=data&&typeof data==='object'?data:{},out=Object.assign(blank(),raw);
 out.transactions=(Array.isArray(raw.transactions)?raw.transactions:[]).filter(Boolean).map(function(t){return Object.assign({},t,{id:t.id||id(),type:t.type==='income'?'income':'expense',amount:Math.max(0,Number(t.amount||0)),description:String(t.description||t.name||'Movimentação'),category:t.category||(t.type==='income'?'Outras receitas':'Outras despesas'),date:t.date||isoDate(),account:t.account||'Conta principal',cardId:t.cardId||'',notes:t.notes||'',installmentGroup:t.installmentGroup||t.groupId||'',installmentNo:Number(t.installmentNo||t.installmentIndex||0),installments:Math.max(1,Number(t.installments||t.installmentsTotal||1)),createdAt:Number(t.createdAt||Date.now())})});
 out.budgets=(Array.isArray(raw.budgets)?raw.budgets:[]).filter(Boolean).map(function(b){return Object.assign({},b,{id:b.id||id(),category:b.category||'Outras despesas',limit:Math.max(0,Number(b.limit||0)),month:b.month||b.period||thisMonth()})});
 out.goals=(Array.isArray(raw.goals)?raw.goals:[]).filter(Boolean).map(function(g){return Object.assign({},g,{id:g.id||id(),name:g.name||'Meta financeira',target:Math.max(0,Number(g.target||g.total||0)),saved:Math.max(0,Number(g.saved||g.current||0)),due:g.due||g.dueDate||g.deadline||'',icon:g.icon||'◎'})});
 out.cards=(Array.isArray(raw.cards)?raw.cards:[]).filter(Boolean).map(function(c){var used=Math.max(0,Number(c.startingUsed!=null?c.startingUsed:(c.used||0)));return Object.assign({},c,{id:c.id||id(),name:c.name||c.bank||'Cartão',bank:c.bank||c.brand||'',brand:c.brand||c.bank||'',limit:Math.max(0,Number(c.limit||0)),startingUsed:used,used:used,closing:c.closing||c.closingDay||'',due:c.due||c.dueDay||''})});
 out.debts=(Array.isArray(raw.debts)?raw.debts:[]).filter(Boolean).map(function(d){var debtTotal=Math.max(0,Number(d.total!=null?d.total:(d.amount||d.remaining||0)));var paid=Math.max(0,Number(d.paid!=null?d.paid:Math.max(0,debtTotal-Number(d.remaining!=null?d.remaining:debtTotal))));var remaining=Math.max(0,Number(d.remaining!=null?d.remaining:debtTotal-paid));return Object.assign({},d,{id:d.id||id(),name:d.name||'Dívida',total:debtTotal,paid:Math.min(debtTotal,paid),remaining:Math.min(debtTotal,remaining),installment:Math.max(0,Number(d.installment||0)),dueDate:d.dueDate||d.due||'',notes:d.notes||''})});
 return out;
}
function id(){return crypto&&crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random().toString(36).slice(2)}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function brl(n){return Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
function isoDate(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function thisMonth(){return isoDate().slice(0,7)}
function month(v){return String(v||'').slice(0,7)}
function dateBR(v){if(!v)return '—';var a=String(v).slice(0,10).split('-');return a.length===3?a[2]+'/'+a[1]+'/'+a[0]:v}
function total(arr,type){return arr.filter(function(x){return !type||x.type===type}).reduce(function(a,x){return a+Number(x.amount||0)},0)}
function toast(s){var e=$('#toast');e.textContent=s;e.classList.add('show');clearTimeout(timer);timer=setTimeout(function(){e.classList.remove('show')},3200)}
function save(){
 if(!activeEmail||!cryptoKey){
  saveQueue=saveQueue.catch(function(){return false}).then(function(){
   localStorage.setItem(GUEST_KEY,JSON.stringify(state));
   $('#storage-label').textContent='Salvo neste dispositivo';
   $('#cloud-message').textContent='Acesso sem login: os dados ficam neste navegador e não sincronizam automaticamente.';
   return true;
  }).catch(function(e){
   $('#cloud-message').textContent='Falha ao salvar neste dispositivo: '+(e.message||'erro de armazenamento');
   toast('Não foi possível salvar. Exporte um backup.');
   return false;
  });
  return saveQueue;
 }
 var email=activeEmail,key=cryptoKey,snapshot=JSON.stringify(state);
 saveQueue=saveQueue.catch(function(){return false}).then(async function(){
  var accounts=getDeviceAccounts(),record=accounts[email];
  if(!record)throw new Error('Conta local não encontrada.');
  var encrypted=await encryptData(email,key,record.salt,snapshot);
  accounts[email]=Object.assign({},record,encrypted,{updatedAt:new Date().toISOString()});
  localStorage.setItem(ACCOUNT_KEY,JSON.stringify(accounts));
  $('#storage-label').textContent='Salvo neste dispositivo';
  $('#cloud-message').textContent='Salvo localmente com criptografia.';
  if(cloudClient&&cloudSession&&normalizeEmail(cloudSession.user.email)===email){
   try{await uploadEncryptedCloudRecord(email,accounts[email]);$('#storage-label').textContent='Sincronizado na nuvem';$('#cloud-message').textContent='Backup criptografado atualizado na nuvem.'}
   catch(err){$('#cloud-message').textContent='Salvo localmente; a sincronização na nuvem falhou: '+(err.message||'confira a configuração')}
  }
  return true;
 }).catch(function(e){
  $('#cloud-message').textContent='Falha ao salvar neste dispositivo: '+(e.message||'erro de armazenamento');
  toast('Não foi possível salvar. Exporte um backup.');
  return false;
 });
 return saveQueue;
}
function gotoPage(p){$$('.page').forEach(function(e){e.classList.toggle('active',e.id==='page-'+p)});$$('.nav-link[data-page]').forEach(function(e){e.classList.toggle('active',e.dataset.page===p)});var names={dashboard:'Visão geral',transactions:'Lançamentos',budgets:'Orçamentos',goals:'Metas financeiras',cards:'Cartões e dívidas',import:'Importar extrato',settings:'Configurações'};$('#crumb-label').textContent=names[p]||p;$('#sidebar').classList.remove('open');renderAll()}
function forMonth(m){return state.transactions.filter(function(t){return month(t.date)===m})}
function sym(c){return ({'Moradia':'⌂','Alimentação':'◉','Transporte':'↗','Contas':'ϟ','Saúde':'✚','Educação':'▤','Lazer':'✦','Compras':'◈','Salário':'⇧','Comissões':'✧','Investimentos':'↗','Dívidas':'−'})[c]||'•'}
function renderAll(){renderDash();renderTransactions();renderBudgets();renderGoals();renderCards();renderSettings();$('#nav-count').textContent=state.transactions.length}
function renderDash(){
 var ts=forMonth($('#month-picker').value||thisMonth()),income=total(ts,'income'),expenses=total(ts,'expense'),bal=income-expenses;
 $('#metric-balance').textContent=brl(bal);$('#metric-balance').style.color=bal<0?'#ffd5c9':'#fff';$('#metric-income').textContent=brl(income);$('#metric-expenses').textContent=brl(expenses);$('#metric-savings').textContent=(income?Math.round((bal/income)*100):0)+'%';
 $('#income-count').textContent=ts.filter(function(t){return t.type==='income'}).length+' lançamentos';$('#expense-count').textContent=ts.filter(function(t){return t.type==='expense'}).length+' lançamentos';$('#balance-status').textContent=income?(bal<0?'Atenção às despesas':'Saldo positivo'):'Sem lançamentos';$('#savings-note').textContent=income?'Resultado sobre a renda':'Vamos começar';
 var parts=($('#month-picker').value||thisMonth()).split('-'),days=new Date(+parts[0],+parts[1],0).getDate(),step=Math.ceil(days/12),bins=[];
 for(var d=1;d<=days;d+=step){var group=ts.filter(function(t){var n=Number(String(t.date).slice(8,10));return n>=d&&n<d+step});bins.push({i:total(group,'income'),e:total(group,'expense'),d:d})}
 var max=Math.max(1,...bins.map(function(x){return Math.max(x.i,x.e)}));
 $('#cashflow-chart').innerHTML=bins.map(function(x){return '<div class="day-col" title="Dia '+x.d+'"><div class="bar income" style="height:'+Math.max(2,x.i/max*100)+'%"></div><div class="bar expense" style="height:'+Math.max(2,x.e/max*100)+'%"></div></div>'}).join('');
 var counts={};ts.filter(function(t){return t.type==='expense'}).forEach(function(t){var c=t.category||'Outras despesas';counts[c]=(counts[c]||0)+Number(t.amount)});
 var names=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a]}).slice(0,6),maxCat=Math.max(1,...names.map(function(c){return counts[c]}));
 $('#category-chart').innerHTML=names.length?names.map(function(c){return '<div class="category-line"><div class="category-label"><span>'+esc(c)+'</span><b>'+brl(counts[c])+'</b></div><div class="progress"><span style="width:'+counts[c]/maxCat*100+'%"></span></div></div>'}).join(''):'<div class="empty-inline">As categorias aparecerão aqui quando houver despesas.</div>';
 var rec=ts.slice().sort(function(a,b){return String(b.date).localeCompare(String(a.date))}).slice(0,5);
 $('#recent-list').innerHTML=rec.map(function(t){return '<div class="recent-row"><div class="transaction-name"><span class="transaction-icon">'+sym(t.category)+'</span><span><b>'+esc(t.description)+'</b><small>'+esc(t.account||'Conta principal')+'</small></span></div><span class="recent-category muted-cell">'+esc(t.category)+'</span><span class="recent-date muted-cell">'+dateBR(t.date)+'</span><span class="'+(t.type==='income'?'amount-income':'amount-expense')+'">'+(t.type==='income'?'+':'−')+' '+brl(t.amount)+'</span></div>'}).join('');
 $('#recent-empty').classList.toggle('show',!rec.length)
}
function renderTransactions(){
 var q=$('#search-transactions').value.toLowerCase().trim(),type=$('#type-filter').value,m=$('#transaction-month').value;
 var arr=state.transactions.filter(function(t){return (!q||(String(t.description||'')+' '+String(t.category||'')+' '+String(t.account||'')+' '+String(t.notes||'')).toLowerCase().indexOf(q)>=0)&&(type==='all'||t.type===type)&&(!m||month(t.date)===m)}).sort(function(a,b){return String(b.date).localeCompare(String(a.date))||Number(b.createdAt||0)-Number(a.createdAt||0)});
 $('#transaction-rows').innerHTML=arr.map(function(t){
  var detail=[t.account||'Conta principal',t.notes||'',t.installmentNo&&t.installments>1?('Parcela '+t.installmentNo+'/'+t.installments):''].filter(Boolean).map(esc).join(' · ');
  return '<tr><td><b>'+esc(t.description)+'</b>'+(detail?'<div class="transaction-detail">'+detail+'</div>':'')+'</td><td>'+esc(t.category||'—')+'</td><td>'+dateBR(t.date)+'</td><td><span class="badge '+t.type+'">'+(t.type==='income'?'Receita':'Despesa')+'</span></td><td class="align-right '+(t.type==='income'?'amount-income':'amount-expense')+'">'+(t.type==='income'?'+':'−')+' '+brl(t.amount)+'</td><td class="row-actions"><button class="link-btn" data-edit-transaction="'+esc(t.id)+'">Editar</button><button class="delete-btn" data-delete-transaction="'+esc(t.id)+'" aria-label="Excluir">×</button></td></tr>'
 }).join('');
 $('#transaction-empty').classList.toggle('show',!arr.length)
}
function renderBudgets(){
 var m=$('#budget-month-picker').value||thisMonth();$('#budget-month-picker').value=m;
 $('#budget-month-label').textContent=new Date(m+'-01T12:00:00').toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 var expenses=forMonth(m).filter(function(t){return t.type==='expense'}),spent=total(expenses),limits=state.budgets.filter(function(b){return (b.month||thisMonth())===m}),limit=limits.reduce(function(a,b){return a+Number(b.limit||0)},0);
 $('#budget-summary').innerHTML=[['Limite mensal',brl(limit)],['Despesas do mês',brl(spent)],['Disponível',brl(limit-spent)],['Categorias',String(limits.length)]].map(function(x){return '<article class="metric"><div class="metric-head">'+x[0]+'</div><strong>'+x[1]+'</strong></article>'}).join('');
 $('#budgets-list').innerHTML=limits.map(function(b){var v=total(expenses.filter(function(t){return t.category===b.category})),pct=b.limit?Math.min(100,v/b.limit*100):0;return '<div class="budget-row"><div class="budget-head"><div><b>'+esc(b.category)+'</b><small>'+brl(v)+' gastos de '+brl(b.limit)+'</small></div><div class="budget-amount">'+Math.round(pct)+'%<small>'+(v>b.limit?'Limite ultrapassado':brl(b.limit-v)+' restantes')+'</small></div></div><div class="budget-track"><span class="'+(v>b.limit?'over':'')+'" style="width:'+pct+'%"></span></div><div class="card-actions"><button class="link-btn" data-edit-budget="'+esc(b.id)+'">Editar</button><button class="link-btn" data-delete-budget="'+esc(b.id)+'">Remover</button></div></div>'}).join('');
 $('#budgets-empty').classList.toggle('show',!limits.length)
}
function renderGoals(){
 $('#goals-grid').innerHTML=state.goals.map(function(g){var pct=g.target?Math.min(100,g.saved/g.target*100):0;return '<article class="goal-card"><div class="goal-top"><span class="goal-symbol">'+esc(g.icon||'◎')+'</span><div class="goal-heading"><h3>'+esc(g.name)+'</h3><p>'+(g.due?'Meta até '+dateBR(g.due):'Seu objetivo financeiro')+'</p></div></div><div class="goal-money">'+brl(g.saved)+'</div><div class="sub">de '+brl(g.target)+' desejados</div><div class="progress" style="margin-top:13px"><span style="width:'+pct+'%"></span></div><div class="goal-foot"><span>'+Math.round(pct)+'% concluído</span><span>'+brl(Math.max(0,g.target-g.saved))+' restantes</span></div><div class="card-actions"><button class="link-btn" data-edit-goal="'+esc(g.id)+'">Editar</button><button class="link-btn" data-contribute-goal="'+esc(g.id)+'">＋ Adicionar valor</button><button class="link-btn" data-delete-goal="'+esc(g.id)+'">Excluir</button></div></article>'}).join('');
 $('#goals-empty').classList.toggle('show',!state.goals.length)
}
function renderCards(){
 $('#cards-grid').innerHTML=state.cards.map(function(c){
  var linked=total(state.transactions.filter(function(t){return t.type==='expense'&&t.cardId===c.id&&month(t.date)===thisMonth()}));
  var used=Math.max(0,Number(c.startingUsed!=null?c.startingUsed:(c.used||0)))+linked;
  return '<article class="credit-card"><div class="card-visual"><div class="chip"></div><small>'+esc(c.bank||'Cartão')+'</small><b>'+esc(c.name)+'</b><footer><span>Limite '+brl(c.limit)+'</span><span>••••</span></footer></div><div class="card-meta"><span>Limite utilizado neste mês</span><b>'+brl(used)+'</b></div><div class="card-meta"><span>Disponível</span><b>'+brl(Math.max(0,c.limit-used))+'</b></div><div class="card-meta"><span>Fechamento</span><b>'+esc(c.closing||'—')+'</b></div><div class="card-meta"><span>Vencimento</span><b>'+esc(c.due||'—')+'</b></div><div class="card-actions"><button class="link-btn" data-edit-card="'+esc(c.id)+'">Editar</button><button class="link-btn" data-delete-card="'+esc(c.id)+'">Remover cartão</button></div></article>'
 }).join('');
 $('#cards-empty').classList.toggle('show',!state.cards.length);
 var debt=state.debts.reduce(function(a,d){return a+Number(d.remaining||0)},0);$('#total-debt').textContent='Total: '+brl(debt);
 $('#debts-list').innerHTML=state.debts.map(function(d){return '<div class="setting-row"><div><b>'+esc(d.name)+'</b><p>'+esc(d.notes||'Dívida registrada')+(d.installment?' · Parcela '+brl(d.installment):'')+(d.dueDate?' · Vencimento '+dateBR(d.dueDate):'')+'</p><p>Original '+brl(d.total)+' · Pago '+brl(d.paid||0)+'</p></div><div><b>'+brl(d.remaining)+' restantes</b><div class="card-actions"><button class="link-btn" data-edit-debt="'+esc(d.id)+'">Editar</button><button class="link-btn" data-pay-debt="'+esc(d.id)+'">Pagar</button><button class="link-btn" data-delete-debt="'+esc(d.id)+'">Excluir</button></div></div></div>'}).join('');
 $('#debts-empty').classList.toggle('hidden',state.debts.length>0)
}
function readCloudConfig(){try{return JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY)||'{}')}catch(e){return {}}}
function renderSettings(){
 var email=session&&session.user?session.user.email:'Acesso sem login';
 $('#settings-account-email').textContent=email;
 $('#account-email').textContent=session?email:'';
 $('#logout-button').classList.toggle('hidden',!session);
 $('#settings-logout').classList.toggle('hidden',!session);
 $('#cloud-sync').disabled=!session;
 var cfg=readCloudConfig();
 if(document.activeElement!==$('#cloud-url'))$('#cloud-url').value=cfg.url||'';
 if(document.activeElement!==$('#cloud-anon-key'))$('#cloud-anon-key').value=cfg.anonKey||'';
 $('#cloud-logout').classList.toggle('hidden',!cloudSession);
 $('#cloud-login').disabled=!cloudClient;
 $('#cloud-signup').disabled=!cloudClient;
 $('#cloud-restore').disabled=!cloudSession;
 var pendingRecord=null;try{pendingRecord=JSON.parse(localStorage.getItem(LEGACY_PENDING)||'null')}catch(e){}
 $('#legacy-import-row').classList.toggle('hidden',!(session&&pendingRecord&&pendingRecord.email===activeEmail));
 var hasOldAccounts=false;try{hasOldAccounts=Object.keys(getDeviceAccounts()).length>0}catch(e){}
 $('#old-account-import-row').classList.toggle('hidden',!hasOldAccounts);
 if(session){
  if(cloudSession&&normalizeEmail(cloudSession.user.email)===activeEmail){
   cloudStatus('Nuvem conectada','Conta autenticada; o backup remoto contém apenas dados criptografados.',true);
   $('#storage-label').textContent='Conta protegida';
   if(!$('#cloud-message').textContent)$('#cloud-message').textContent='Clique em Sincronizar para enviar uma cópia criptografada.';
  }else if(cloudSession){
   cloudStatus('Conta da nuvem diferente','Para sincronizar, use na nuvem o mesmo e-mail da conta local.',false);
   $('#storage-label').textContent='Salvo neste dispositivo';
  }else if(cloudClient){
   cloudStatus('Supabase configurado','Entre na nuvem para habilitar sincronização entre dispositivos.',false);
   $('#storage-label').textContent='Salvo neste dispositivo';
   if(!$('#cloud-message').textContent)$('#cloud-message').textContent='Os dados locais continuam disponíveis sem a nuvem.';
  }else{
   cloudStatus('Dados protegidos neste dispositivo','Criptografados e disponíveis neste navegador. A sincronização é opcional.',true);
   $('#storage-label').textContent='Salvo neste dispositivo';
   if(!$('#cloud-message').textContent)$('#cloud-message').textContent='Salvo localmente com criptografia.';
  }
 }else{
  cloudStatus('Acesso direto, sem login','Os dados ficam salvos neste navegador. Qualquer pessoa que usar este mesmo navegador poderá acessá-los; não há sincronização entre dispositivos.',true);
  $('#storage-label').textContent='Salvo neste dispositivo';
  $('#cloud-message').textContent='Modo sem login ativo. Exporte backups regularmente e não use um dispositivo compartilhado para dados privados.';
 }
}
function cloudStatus(title,msg,ready){
 $('#cloud-status-title').textContent=title;
 $('#cloud-status-text').textContent=msg;
 $('#cloud-status').classList.toggle('ready',!!ready);
}
function uploadEncryptedCloudRecord(email,record){
 if(!cloudClient||!cloudSession) return Promise.reject(new Error('Entre na conta Supabase primeiro.'));
 if(normalizeEmail(cloudSession.user.email)!==normalizeEmail(email))return Promise.reject(new Error('O e-mail da conta Supabase deve ser igual ao e-mail local.'));
 return cloudClient.from('finance_data').upsert({user_id:cloudSession.user.id,payload:{email:email,record:record},updated_at:new Date().toISOString()},{onConflict:'user_id'}).then(function(r){if(r.error)throw r.error;return true});
}
async function inspectCloudRecord(){
 if(!cloudClient||!cloudSession)return;
 try{
  var r=await cloudClient.from('finance_data').select('updated_at').eq('user_id',cloudSession.user.id).maybeSingle();
  if(r.error)throw r.error;
  if(r.data)$('#cloud-message').textContent='Já existe um backup criptografado na nuvem. Sincronize para enviar o dispositivo atual ou restaure para baixar o backup remoto.';
  else $('#cloud-message').textContent='Ainda não há backup na nuvem. Use Sincronizar para enviar os dados locais criptografados.';
 }catch(e){$('#cloud-message').textContent='Não foi possível verificar a nuvem: '+(e.message||'execute o SQL do projeto')}
}
async function initializeCloudClient(){
 var cfg=readCloudConfig();cloudClient=null;cloudSession=null;
 if(!cfg.url||!cfg.anonKey){renderSettings();return}
 if(!window.supabase||!window.supabase.createClient){cloudStatus('Biblioteca da nuvem indisponível','Verifique a internet e recarregue a página.',false);return}
 try{
  cloudClient=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  var res=await cloudClient.auth.getSession();if(res.error)throw res.error;
  cloudSession=res.data.session||null;
  cloudClient.auth.onAuthStateChange(function(event,nextSession){
   cloudSession=nextSession||null;
   renderSettings();
   if(cloudSession)setTimeout(function(){inspectCloudRecord()},0);
  });
  renderSettings();
  if(cloudSession)await inspectCloudRecord();
 }catch(e){cloudClient=null;cloudSession=null;cloudStatus('Falha na configuração da nuvem',e.message||'Confira a URL e a chave pública.',false);$('#cloud-message').textContent=e.message||'Confira a configuração.'}
}
async function saveCloudConfig(){
 var url=$('#cloud-url').value.trim().replace(/\/$/,''),anonKey=$('#cloud-anon-key').value.trim();
 if(url&&!/^https:\/\/.+/i.test(url)){toast('A URL do Supabase precisa começar com https://');return}
 if((url&&!anonKey)||(!url&&anonKey)){toast('Informe a URL e a chave pública juntas.');return}
 localStorage.setItem(CLOUD_CONFIG_KEY,JSON.stringify({url:url,anonKey:anonKey}));
 await initializeCloudClient();
 $('#cloud-message').textContent=url?'Configuração salva. Entre na conta Supabase para habilitar a sincronização.':'Configuração da nuvem removida; os dados seguem locais.';
 toast('Configuração salva neste dispositivo.');
}
async function signIntoCloud(mode){
 if(!cloudClient){toast('Configure e salve a URL e a chave pública primeiro.');return}
 var email=normalizeEmail($('#cloud-email').value),password=$('#cloud-password').value;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8){$('#cloud-message').textContent='Informe e-mail válido e senha de pelo menos 8 caracteres para a conta Supabase.';return}
 $('#cloud-message').textContent='Conectando à nuvem…';
 try{
  var res=mode==='signup'?await cloudClient.auth.signUp({email:email,password:password}):await cloudClient.auth.signInWithPassword({email:email,password:password});
  if(res.error)throw res.error;
  cloudSession=res.data.session||null;
  if(mode==='signup'&&!cloudSession){$('#cloud-message').textContent='Conta Supabase criada. Confirme o e-mail se o projeto exigir isso e depois entre na nuvem.';renderSettings();return}
  if(!cloudSession)throw new Error('A conta não gerou uma sessão. Verifique a confirmação de e-mail no Supabase.');
  if(normalizeEmail(cloudSession.user.email)!==email)throw new Error('O e-mail autenticado não corresponde.');
  renderSettings();await inspectCloudRecord();
  toast('Conta Supabase conectada.');
 }catch(e){$('#cloud-message').textContent='Falha na nuvem: '+(e.message||'verifique o projeto Supabase');renderSettings()}
}
async function syncCloudNow(){
 if(!session){toast('Entre na conta local primeiro.');return}
 save();var saved=await saveQueue;
 if(!saved){toast('Falha ao salvar os dados locais.');return}
 if(!cloudClient||!cloudSession){toast('Dados salvos localmente. Configure e entre na nuvem para sincronizar.');return}
 try{
  if(normalizeEmail(cloudSession.user.email)!==activeEmail)throw new Error('Use na nuvem o mesmo e-mail da conta local.');
  var record=getDeviceAccounts()[activeEmail];
  await uploadEncryptedCloudRecord(activeEmail,record);
  $('#cloud-message').textContent='Backup criptografado sincronizado na nuvem.';
  $('#storage-label').textContent='Sincronizado na nuvem';
  toast('Dados salvos e sincronizados.');
 }catch(e){$('#cloud-message').textContent='Dados salvos localmente; sincronização falhou: '+(e.message||'erro na nuvem');toast('Os dados locais foram salvos, mas a nuvem falhou.')}
}
async function restoreCloudBackup(){
 if(!cloudClient||!cloudSession){toast('Entre na conta Supabase primeiro.');return}
 var password=$('#cloud-encryption-password').value;
 if(!password){$('#cloud-message').textContent='Informe a senha local de criptografia para desbloquear o backup.';return}
 try{
  var r=await cloudClient.from('finance_data').select('payload').eq('user_id',cloudSession.user.id).maybeSingle();
  if(r.error)throw r.error;
  if(!r.data||!r.data.payload)throw new Error('Não existe backup na nuvem para esta conta.');
  var payload=r.data.payload,record=payload.record||payload,email=normalizeEmail(payload.email||record.email||cloudSession.user.email);
  if(email!==normalizeEmail(cloudSession.user.email))throw new Error('O backup remoto não corresponde ao e-mail autenticado.');
  var key=await deriveLocalKey(password,record.salt),plain=await decryptData(email,key,record),data=normalizeState(JSON.parse(plain));
  if(!confirm('Substituir ou criar os dados locais de '+email+' pela cópia criptografada da nuvem? Exporte um backup local antes se houver dados que queira guardar.'))return;
  var accounts=getDeviceAccounts();accounts[email]=Object.assign({},record,{email:email,updatedAt:new Date().toISOString()});localStorage.setItem(ACCOUNT_KEY,JSON.stringify(accounts));
  localStorage.removeItem(LEGACY_PENDING);
  enterApp(email,key,data);
  $('#cloud-encryption-password').value='';
  $('#cloud-message').textContent='Backup remoto restaurado e desbloqueado. As alterações futuras poderão sincronizar.';
  renderSettings();toast('Backup da nuvem restaurado.');
 }catch(e){$('#cloud-message').textContent='Não foi possível restaurar a cópia: '+(e.message||'verifique a senha local e o SQL');}
}
var fields='<label class="field-label">Tipo<select id="form-type"><option value="expense">Despesa</option><option value="income">Receita</option></select></label>'+
'<label class="field-label"><span id="form-amount-label">Valor (R$)</span><input id="form-amount" type="number" min=".01" step=".01" required></label>'+
'<label class="field-label wide">Descrição<input id="form-description" required maxlength="140"></label>'+
'<label class="field-label">Categoria<select id="form-category"></select></label>'+
'<label class="field-label">Data da primeira parcela<input id="form-date" type="date" required></label>'+
'<label class="field-label">Conta ou origem<input id="form-account" maxlength="100" value="Conta principal"></label>'+
'<label class="field-label">Cartão (opcional)<select id="form-card"><option value="">Não é compra de cartão</option></select></label>'+
'<label class="field-label wide">Número de parcelas<select id="form-installments"><option value="1">À vista</option><option value="2">2 parcelas</option><option value="3">3 parcelas</option><option value="4">4 parcelas</option><option value="5">5 parcelas</option><option value="6">6 parcelas</option><option value="7">7 parcelas</option><option value="8">8 parcelas</option><option value="9">9 parcelas</option><option value="10">10 parcelas</option><option value="11">11 parcelas</option><option value="12">12 parcelas</option><option value="18">18 parcelas</option><option value="24">24 parcelas</option><option value="36">36 parcelas</option></select></label>'+
'<label class="field-label wide">Observações<textarea id="form-notes" rows="2" maxlength="500" placeholder="Opcional"></textarea></label>';
var kind='transaction', target=null, targetGroup=null;
function options(type,selected){$('#form-category').innerHTML=cats[type].map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>'}).join('');if(selected)$('#form-category').value=selected}
function populateCardOptions(selected){
 var el=$('#form-card');if(!el)return;
 el.innerHTML='<option value="">Não é compra de cartão</option>'+state.cards.map(function(c){return '<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>'}).join('');
 el.value=selected||'';
}
function shiftMonth(date,offset){
 var p=String(date||isoDate()).split('-').map(Number),year=p[0],monthIndex=p[1]-1+offset,day=p[2]||1;
 var y=year+Math.floor(monthIndex/12),m=((monthIndex%12)+12)%12,last=new Date(y,m+1,0).getDate();
 return String(y)+'-'+String(m+1).padStart(2,'0')+'-'+String(Math.min(day,last)).padStart(2,'0');
}
function makeInstallmentTransactions(base,totalAmount,count,groupId){
 var cents=Math.round(Number(totalAmount)*100),n=Math.max(1,Math.min(36,Number(count)||1)),each=Math.floor(cents/n),remainder=cents-(each*n),out=[];
 for(var i=0;i<n;i++){
  var rec=Object.assign({},base,{id:id(),amount:(each+(i<remainder?1:0))/100,date:shiftMonth(base.date,i),createdAt:Date.now()});
  rec.installmentGroup=n>1?groupId:'';rec.installmentNo=n>1?i+1:0;rec.installments=n;out.push(rec);
 }
 return out;
}
function updateTransactionFields(){
 var income=$('#form-type')&&$('#form-type').value==='income';
 if($('#form-card')){if(income)$('#form-card').value='';$('#form-card').disabled=income}
 if($('#form-installments')){if(income)$('#form-installments').value='1';$('#form-installments').disabled=income}
 if($('#form-amount-label'))$('#form-amount-label').textContent=Number($('#form-installments').value||1)>1?'Valor total da compra (R$)':'Valor da movimentação (R$)';
}
function openForm(k,obj){
 kind=k;target=obj&&obj.id||null;targetGroup=null;
 document.body.classList.add('modal-open');
 $('#transaction-submit').textContent='Salvar lançamento';$('#receipt-review-note').classList.add('hidden');
 $('#transaction-modal').classList.remove('hidden');$('#transaction-modal').scrollTop=0;
 var activeModal=$('#transaction-modal .modal');if(activeModal)activeModal.scrollTop=0;
 $('#modal-title').textContent=({transaction:obj?'Editar lançamento':'Novo lançamento',budget:obj?'Editar orçamento':'Criar orçamento',goal:obj?'Editar meta financeira':'Nova meta financeira',card:obj?'Editar cartão':'Adicionar cartão',debt:obj?'Editar dívida':'Registrar dívida',contribution:'Adicionar à meta',payment:'Registrar pagamento'})[k]||'Novo registro';
 var grid=$('#transaction-form .form-grid');
 if(k==='transaction'){
  var rows=obj&&obj.installmentGroup?state.transactions.filter(function(t){return t.installmentGroup===obj.installmentGroup}).sort(function(a,b){return Number(a.installmentNo||0)-Number(b.installmentNo||0)}):[];
  var lead=rows.length?rows[0]:(obj||null);targetGroup=rows.length?obj.installmentGroup:null;
  grid.innerHTML=fields;$('#form-date').value=lead?lead.date:isoDate();
  $('#form-amount').value=rows.length?rows.reduce(function(a,t){return a+Number(t.amount||0)},0):(lead?lead.amount:'');
  $('#form-description').value=lead?lead.description:'';$('#form-type').value=lead?lead.type:'expense';
  options($('#form-type').value,lead&&lead.category);populateCardOptions(lead&&lead.cardId);
  $('#form-account').value=lead&&lead.account||'Conta principal';$('#form-notes').value=lead&&lead.notes||'';
  $('#form-installments').value=rows.length?rows.length:(lead&&lead.installments||1);
  $('#form-type').onchange=function(){options($('#form-type').value);updateTransactionFields()};
  $('#form-installments').onchange=updateTransactionFields;updateTransactionFields();
 }else if(k==='budget'){
  grid.innerHTML='<label class="field-label wide">Categoria<select id="x-cat">'+cats.expense.map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>'}).join('')+'</select></label><label class="field-label wide">Mês<input id="x-month" type="month" value="'+esc(obj&&obj.month||$('#budget-month-picker').value||thisMonth())+'" required></label><label class="field-label wide">Limite mensal (R$)<input id="x-limit" type="number" min=".01" step=".01" value="'+esc(obj?obj.limit:'')+'" required></label>';
  if(obj)$('#x-cat').value=obj.category;
 }else if(k==='goal'){
  grid.innerHTML='<label class="field-label wide">Nome da meta<input id="x-name" required placeholder="Reserva de emergência" value="'+esc(obj?obj.name:'')+'"></label><label class="field-label">Valor desejado (R$)<input id="x-target" type="number" min=".01" step=".01" value="'+esc(obj?obj.target:'')+'" required></label><label class="field-label">Já guardado (R$)<input id="x-saved" type="number" min="0" step=".01" value="'+esc(obj?obj.saved:0)+'"></label><label class="field-label">Ícone<select id="x-icon"><option value="◎">Objetivo</option><option value="✈">Viagem</option><option value="⌂">Casa</option><option value="✦">Sonho</option><option value="▤">Estudos</option><option value="♧">Reserva</option></select></label><label class="field-label">Data desejada<input id="x-due" type="date" value="'+esc(obj?obj.due:'')+'"></label>';
 }else if(k==='card'){
  grid.innerHTML='<label class="field-label">Nome do cartão<input id="x-name" required placeholder="Cartão principal" value="'+esc(obj?obj.name:'')+'"></label><label class="field-label">Banco/emissor<input id="x-bank" value="'+esc(obj?obj.bank:'')+'"></label><label class="field-label">Limite (R$)<input id="x-limit" type="number" min="0" step=".01" value="'+esc(obj?obj.limit:'')+'" required></label><label class="field-label">Utilização inicial já existente (R$)<input id="x-used" type="number" min="0" step=".01" value="'+esc(obj?(obj.startingUsed!=null?obj.startingUsed:obj.used):0)+'"></label><label class="field-label">Dia de fechamento<input id="x-closing" type="number" min="1" max="31" value="'+esc(obj?obj.closing:'')+'"></label><label class="field-label">Dia de vencimento<input id="x-due" type="number" min="1" max="31" value="'+esc(obj?obj.due:'')+'"></label>';
 }else if(k==='debt'){
  grid.innerHTML='<label class="field-label wide">Nome da dívida<input id="x-name" required value="'+esc(obj?obj.name:'')+'"></label><label class="field-label">Valor original (R$)<input id="x-total" type="number" min="0" step=".01" value="'+esc(obj?obj.total:'')+'" required></label><label class="field-label">Valor já pago (R$)<input id="x-paid" type="number" min="0" step=".01" value="'+esc(obj?obj.paid||0:0)+'" required></label><label class="field-label">Valor da parcela (opcional)<input id="x-installment" type="number" min="0" step=".01" value="'+esc(obj?obj.installment||0:0)+'"></label><label class="field-label">Próximo vencimento<input id="x-due" type="date" value="'+esc(obj?obj.dueDate:'')+'"></label><label class="field-label wide">Observação<input id="x-notes" value="'+esc(obj?obj.notes:'')+'"></label>';
 }else grid.innerHTML='<label class="field-label wide">Valor (R$)<input id="x-value" type="number" min=".01" step=".01" required></label>';
}
function closeForm(){
 document.body.classList.remove('modal-open');
 $('#transaction-modal').classList.add('hidden');$('#transaction-form .form-grid').innerHTML=fields;options('expense');populateCardOptions('');target=null;targetGroup=null;$('#transaction-submit').textContent='Salvar lançamento';$('#receipt-review-note').classList.add('hidden');
}
function num(s){return Number($('#'+s).value||0)}function txt(s){return ($('#'+s).value||'').trim()}
async function submitForm(e){e.preventDefault();var stateBefore=JSON.stringify(state);
 if(kind==='transaction'){
  var count=$('#form-type').value==='income'?1:Math.max(1,Math.min(36,Number($('#form-installments').value)||1)),amount=num('form-amount'),desc=txt('form-description'),date=$('#form-date').value;
  if(!desc||!date||!Number.isFinite(amount)||amount<=0){toast('Confira descrição, data e valor.');return}
  var base={type:$('#form-type').value,description:desc,category:$('#form-category').value,date:date,account:txt('form-account')||'Conta principal',cardId:$('#form-type').value==='income'?'':($('#form-card').value||''),notes:txt('form-notes')};
  if(target||targetGroup){if(targetGroup)state.transactions=state.transactions.filter(function(t){return t.installmentGroup!==targetGroup});else state.transactions=state.transactions.filter(function(t){return t.id!==target})}
  var group=count>1?(targetGroup||id()):'',generated=makeInstallmentTransactions(base,amount,count,group);state.transactions.push.apply(state.transactions,generated);
 }
 if(kind==='budget'){
  var cat=txt('x-cat'),lim=num('x-limit'),bm=$('#x-month').value||thisMonth();if(lim<=0||!bm)return;
  var ex=state.budgets.find(function(b){return b.category===cat&&(b.month||thisMonth())===bm&&b.id!==target});
  if(ex){toast('Já existe orçamento para essa categoria e mês. Edite o existente.');return}
  var budget={id:target||id(),category:cat,limit:lim,month:bm};if(target)state.budgets=state.budgets.map(function(b){return b.id===target?budget:b});else state.budgets.push(budget);
  if($('#budget-month-picker'))$('#budget-month-picker').value=bm;
 }
 if(kind==='goal'){
  var name=txt('x-name'),tar=num('x-target');if(!name||tar<=0)return;var goal={id:target||id(),name:name,target:tar,saved:num('x-saved'),due:txt('x-due')};
  goal.icon=txt('x-icon')||'◎';if(target)state.goals=state.goals.map(function(g){return g.id===target?goal:g});else state.goals.push(goal);
 }
 if(kind==='card'){
  var cn=txt('x-name');if(!cn)return;var card={id:target||id(),name:cn,bank:txt('x-bank'),limit:num('x-limit'),startingUsed:num('x-used'),used:num('x-used'),closing:txt('x-closing'),due:txt('x-due')};
  if(target)state.cards=state.cards.map(function(c){return c.id===target?card:c});else state.cards.push(card);
 }
 if(kind==='debt'){
  var dn=txt('x-name'),dt=num('x-total'),paid=num('x-paid');if(!dn||dt<0||paid<0||paid>dt){toast('Confira o total e o valor já pago.');return}
  var debt={id:target||id(),name:dn,total:dt,paid:paid,remaining:Math.max(0,dt-paid),installment:num('x-installment'),dueDate:txt('x-due'),notes:txt('x-notes')};
  if(target)state.debts=state.debts.map(function(d){return d.id===target?debt:d});else state.debts.push(debt);
 }
 if(kind==='contribution'){var g=state.goals.find(function(x){return x.id===target}),v=num('x-value');if(g&&v>0)g.saved=Number(g.saved||0)+v}
 if(kind==='payment'){var d=state.debts.find(function(x){return x.id===target}),v=num('x-value');if(d&&v>0){var pay=Math.min(v,Number(d.remaining||0));d.remaining=Math.max(0,Number(d.remaining||0)-pay);d.paid=Math.min(Number(d.total||0),Number(d.paid||0)+pay);state.transactions.push({id:id(),type:'expense',amount:pay,description:'Pagamento: '+d.name,category:'Dívidas',date:isoDate(),account:'Conta principal',cardId:'',notes:'Pagamento de dívida',createdAt:Date.now()})}}
 var didSave=await save();if(!didSave){state=JSON.parse(stateBefore);renderAll();toast('Não foi possível confirmar o lançamento. Os dados foram restaurados; tente novamente.');return}closeForm();renderAll();toast('Lançamento salvo com sucesso.')
}
function download(blob,name){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
function exportBackup(){download(new Blob([JSON.stringify({app:'Meu Financeiro Pessoal',version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'}),'meu-financeiro-backup-'+isoDate()+'.json');toast('Backup exportado.')}
function restoreBackup(f){
 var r=new FileReader();r.onload=function(){try{var o=JSON.parse(r.result),d=o.data||o;if(!Array.isArray(d.transactions))throw Error('backup inválido');if(!confirm('Substituir os dados atuais pelos dados do backup?'))return;state=normalizeState(d);save();renderAll();toast('Backup restaurado.')}catch(e){toast('Arquivo de backup inválido.')}};r.readAsText(f)
}
function parseCSV(text){
 var first=text.split(/\r?\n/)[0]||'',sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',',rows=[],row=[],cell='',quoted=false;
 for(var i=0;i<text.length;i++){var c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=!quoted;else if(c===sep&&!quoted){row.push(cell.trim());cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}
 if(cell.length||row.length){row.push(cell.trim());if(row.some(Boolean))rows.push(row)}
 if(rows.length<2)return [];
 var norm=function(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()},head=rows.shift().map(norm),find=function(a){return head.findIndex(function(h){return a.some(function(w){return h===w||h.indexOf(w)>=0})})};
 var di=find(['data','date']),hi=find(['descricao','historico','memo','description','lancamento']),vi=find(['valor','amount','montante']),debitIdx=find(['debito','debit','saida','despesa']),creditIdx=find(['credito','credit','entrada','receita']),ti=find(['tipo','type']),ci=find(['categoria','category']);
 function amountValue(v){var z=String(v||'').replace(/[R$\s]/g,'');if(z.indexOf(',')>=0&&z.indexOf('.')>=0)z=z.replace(/\./g,'').replace(',','.');else z=z.replace(',','.');return Number(z)}
 return rows.map(function(r){
  var dt=(r[di]||'').trim();if(/^\d{2}\/\d{2}\/\d{4}$/.test(dt)){var p=dt.split('/');dt=p[2]+'-'+p[1]+'-'+p[0]}else if(/^\d{8}$/.test(dt))dt=dt.slice(0,4)+'-'+dt.slice(4,6)+'-'+dt.slice(6,8);
  var amount=0,type='expense';
  if(vi>=0){amount=amountValue(r[vi]);var raw=norm(r[ti]||'');type=/receita|credito|credit|entrada|deposito|deposit/.test(raw)?'income':'expense';if(amount<0)type='expense'}
  else if(debitIdx>=0||creditIdx>=0){var debit=Math.abs(amountValue(r[debitIdx]||0)),credit=Math.abs(amountValue(r[creditIdx]||0));if(credit>0){amount=credit;type='income'}else{amount=debit;type='expense'}}
  if(amount<0)amount=Math.abs(amount);
  return {id:id(),date:dt,type:type,amount:amount,description:(r[hi]||'Movimentação importada').trim(),category:(r[ci]||'').trim()||(type==='income'?'Outras receitas':'Outras despesas'),account:'Extrato importado',cardId:'',notes:'Importado de arquivo CSV',createdAt:Date.now()}
 }).filter(function(t){return t.amount>0&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)})
}
function parseOFX(text){
 var blocks=Array.from(text.matchAll(/<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|<\/STMTRS>|<\/OFX>|$)/gi));
 return blocks.map(function(m){
  var get=function(tag){return (m[1].match(new RegExp('<'+tag+'>([^\\r\\n<]+)','i'))||[])[1]||''};
  var d=get('DTPOSTED').slice(0,8),raw=String(get('TRNAMT')||'').replace(',','.'),v=Number(raw);
  if(d.length!==8||!Number.isFinite(v))return null;
  return {id:id(),date:d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8),type:v>=0?'income':'expense',amount:Math.abs(v),description:get('NAME')||get('MEMO')||'Movimentação OFX',category:v>=0?'Outras receitas':'Outras despesas',account:'Extrato importado',cardId:'',notes:'Importado de arquivo OFX',createdAt:Date.now()}
 }).filter(Boolean)
}
function fp(t){return t.date+'|'+Number(t.amount).toFixed(2)+'|'+t.type+'|'+String(t.description).trim().toLowerCase().replace(/\s+/g,' ')}
async function importFile(f){if(f.size>10485760){toast('O arquivo deve ter até 10 MB.');return}var text=await f.text();pending=/\.ofx$/i.test(f.name)||/<OFX>/i.test(text)?parseOFX(text):parseCSV(text);var known=new Set(state.transactions.map(fp)),dups=0;pending=pending.filter(function(t){if(known.has(fp(t))){dups++;return false}known.add(fp(t));return true});$('#import-message').classList.remove('hidden','error');$('#import-message').textContent=pending.length?pending.length+' lançamento(s) para revisar. '+(dups?dups+' duplicidade(s) provável(is) ignorada(s).':''):'Não encontrei linhas válidas. Confira o formato CSV/OFX ou use o modelo.';$('#import-message').classList.toggle('error',!pending.length);$('#import-preview').classList.toggle('hidden',!pending.length);$('#import-preview-info').textContent=pending.length+' lançamento(s) encontrados';$('#import-duplicate-note').textContent=dups?dups+' possível(is) duplicidade(s) ignorada(s).':'';$('#import-preview-rows').innerHTML=pending.slice(0,100).map(function(t){return '<tr><td>'+esc(t.description)+'</td><td>'+dateBR(t.date)+'</td><td>'+(t.type==='income'?'Receita':'Despesa')+'</td><td class="align-right">'+brl(t.amount)+'</td></tr>'}).join('')}
function showReceiptStatus(message,isError){
 var el=$('#receipt-scan-status');
 el.textContent=message||'';
 el.classList.remove('hidden');
 el.classList.toggle('error',!!isError);
 el.classList.toggle('success',!isError);
}
function compressReceiptImage(file){
 return new Promise(function(resolve,reject){
  if(!file||!/^image\//i.test(file.type||'')){reject(new Error('Escolha uma imagem de nota fiscal.'));return}
  if(file.size>18*1024*1024){reject(new Error('A imagem precisa ter menos de 18 MB. Tente tirar uma foto com menor resolução.'));return}
  var url=URL.createObjectURL(file),img=new Image();
  img.onload=function(){
   try{
    var maxSide=1800,scale=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
    var canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
    canvas.height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
    var context=canvas.getContext('2d');
    if(!context)throw new Error('Não foi possível processar a imagem neste navegador.');
    context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(img,0,0,canvas.width,canvas.height);
    var quality=.82,dataUrl='';
    do{dataUrl=canvas.toDataURL('image/jpeg',quality);quality-=.1}while(dataUrl.length>3400000&&quality>=.52);
    URL.revokeObjectURL(url);canvas.width=canvas.height=1;
    if(dataUrl.length>3500000)throw new Error('A imagem ficou muito grande. Tire outra foto mais afastada ou com menor resolução.');
    resolve(dataUrl);
   }catch(e){URL.revokeObjectURL(url);reject(e)}
  };
  img.onerror=function(){URL.revokeObjectURL(url);reject(new Error('Não consegui abrir esta imagem. Tire a foto novamente ou envie um arquivo JPG, PNG ou WebP.'))};
  img.src=url;
 });
}
async function scanReceiptImage(file){
 var button=$('#scan-receipt-button');
 if(!file)return;
 button.disabled=true;
 showReceiptStatus('Lendo nota fiscal… mantenha esta página aberta.',false);
 try{
  var image=await compressReceiptImage(file);
  var response=await fetch('/api/scan-receipt',{
   method:'POST',
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({image:image,today:isoDate()})
  });
  var payload=await response.json().catch(function(){return {error:'A API de leitura não está disponível neste endereço. Publique o aplicativo na Vercel e configure OPENAI_API_KEY.'}});
  if(!response.ok)throw new Error(payload.error||'Não foi possível ler a nota fiscal.');
  var receipt=payload.data||payload;
  var amount=Number(receipt.valor);
  if(!receipt.estabelecimento||!Number.isFinite(amount)||amount<=0)throw new Error('Não consegui identificar o valor total. Tente outra foto com o total da nota bem visível.');
  openForm('transaction');
  $('#modal-title').textContent='Conferir nota fiscal';
  $('#receipt-review-note').textContent='Confira o estabelecimento, o valor, a data e a categoria. A leitura por IA pode cometer erros; nada será salvo até você confirmar.';
  $('#receipt-review-note').classList.remove('hidden');
  $('#form-type').value='expense';
  options('expense');
  $('#form-description').value=String(receipt.estabelecimento).slice(0,140);
  $('#form-amount').value=amount.toFixed(2);
  $('#form-date').value=/^\d{4}-\d{2}-\d{2}$/.test(String(receipt.data||''))?receipt.data:isoDate();
  $('#form-category').value=cats.expense.indexOf(receipt.categoria)>=0?receipt.categoria:'Outras despesas';
  $('#form-installments').value='1';
  populateCardOptions('');
  $('#form-card').value='';
  $('#form-notes').value='Dados sugeridos automaticamente por leitura de nota fiscal. Confira antes de salvar.';
  updateTransactionFields();
  $('#transaction-submit').textContent='Salvar gasto';
  showReceiptStatus('Leitura concluída. Confira os dados no formulário antes de salvar.',false);
 }catch(e){
  showReceiptStatus(e&&e.message?e.message:'Não foi possível ler a nota fiscal. Tente novamente.',true);
 }finally{
  button.disabled=false;
 }
}
function setAuthMessage(message,isError){
 var el=$('#auth-message');el.textContent=message||'';el.classList.toggle('error',!!isError);
}
function normalizeEmail(email){return String(email||'').trim().toLowerCase()}
function getDeviceAccounts(){
 try{return JSON.parse(localStorage.getItem(ACCOUNT_KEY)||'{}')}catch(e){return {}}
}
function toBase64(buffer){
 var bytes=new Uint8Array(buffer),binary='';
 for(var i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
 return btoa(binary);
}
function fromBase64(value){
 var binary=atob(value),bytes=new Uint8Array(binary.length);
 for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return bytes;
}
async function deriveLocalKey(password,saltB64){
 var material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',salt:fromBase64(saltB64),iterations:250000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encryptData(email,key,salt,plainText){
 var iv=crypto.getRandomValues(new Uint8Array(12));
 var encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv,additionalData:new TextEncoder().encode(email)},key,new TextEncoder().encode(plainText));
 return {salt:salt,iv:toBase64(iv),ciphertext:toBase64(encrypted)};
}
async function decryptData(email,key,record){
 var plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromBase64(record.iv),additionalData:new TextEncoder().encode(email)},key,fromBase64(record.ciphertext));
 return new TextDecoder().decode(plain);
}
function showAuth(message,isError){
 $('#app-shell').classList.add('hidden');$('#auth-screen').classList.remove('hidden');
 if(message)setAuthMessage(message,isError);
}
function startLegacyMigration(){
 legacyMigrationMode=true;
 $('#auth-login').textContent='Importar dados e continuar';
 $('#auth-title').textContent='Importar dados antigos';
 $('#auth-intro').textContent='Use o e-mail e a senha da conta criada na versão anterior. Os dados serão copiados para este navegador; depois, o aplicativo abrirá sem login.';
 $('#auth-signup').classList.add('hidden');
 $('#auth-forgot').classList.add('hidden');
 $('#auth-cancel-migration').classList.remove('hidden');
 $('#auth-email').value='';
 $('#auth-password').value='';
 $('#auth-screen').classList.remove('hidden');
 $('#app-shell').classList.add('hidden');
 setAuthMessage('Esta etapa é opcional e serve apenas para recuperar dados antigos.',false);
}
function cancelLegacyMigration(){
 legacyMigrationMode=false;
 $('#auth-login').textContent='Entrar';
 $('#auth-screen').classList.add('hidden');
 $('#app-shell').classList.remove('hidden');
 $('#auth-signup').classList.add('hidden');
 $('#auth-forgot').classList.add('hidden');
 $('#auth-cancel-migration').classList.add('hidden');
 setAuthMessage('',false);
 renderAll();renderSettings();
}
function enterApp(email,key,data){
 activeEmail=email;cryptoKey=key;session={user:{id:email,email:email}};
 $('#auth-password').value='';
 state=normalizeState(data||{});
 $('#auth-screen').classList.add('hidden');$('#app-shell').classList.remove('hidden');
 renderAll();renderSettings();setAuthMessage('');
}
async function login(e){
 if(e)e.preventDefault();
 if(!window.crypto||!crypto.subtle){setAuthMessage('Este navegador não oferece criptografia segura. Abra o aplicativo em HTTPS em um navegador atualizado.',true);return}
 if(!legacyMigrationMode){setAuthMessage('O acesso normal não exige login. Abra Configurações para importar uma conta antiga.',true);return}
 var email=normalizeEmail($('#auth-email').value),password=$('#auth-password').value;
 if(!email||password.length<8){setAuthMessage('Informe o e-mail e a senha da conta antiga.',true);return}
 $('#auth-login').disabled=true;$('#auth-login').textContent='Verificando…';setAuthMessage('Desbloqueando e importando seus dados antigos…',false);
 try{
  var record=getDeviceAccounts()[email];
  if(!record)throw new Error('Não encontramos essa conta antiga neste dispositivo. Os dados originais continuam no navegador se não foram apagados.');
  var key=await deriveLocalKey(password,record.salt);
  var plain=await decryptData(email,key,record);
  var data=JSON.parse(plain);
  if(!data||!Array.isArray(data.transactions))throw new Error('Os dados desta conta estão inválidos. Restaure um backup se tiver.');
  var imported=mergeStates(state,data);
  localStorage.setItem(GUEST_KEY,JSON.stringify(imported));
  state=imported;session=null;activeEmail=null;cryptoKey=null;legacyMigrationMode=false;
  $('#auth-screen').classList.add('hidden');$('#app-shell').classList.remove('hidden');
  $('#auth-signup').classList.add('hidden');$('#auth-forgot').classList.add('hidden');$('#auth-cancel-migration').classList.add('hidden');
  renderAll();renderSettings();setAuthMessage('');
  toast('Dados antigos importados. O acesso agora funciona sem login neste navegador.');
 }catch(err){setAuthMessage(err.message==='The operation failed'?'Senha incorreta. Tente novamente.':(err.message||'E-mail ou senha incorretos.'),true)}
 finally{$('#auth-login').disabled=false;if(legacyMigrationMode)$('#auth-login').textContent='Importar dados e continuar'}
}
async function createAccount(){
 if(!window.crypto||!crypto.subtle){setAuthMessage('Este navegador não oferece criptografia segura. Atualize o navegador e use HTTPS.',true);return}
 var email=normalizeEmail($('#auth-email').value),password=$('#auth-password').value;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setAuthMessage('Informe um endereço de e-mail válido.',true);return}
 if(password.length<8){setAuthMessage('Crie uma senha com pelo menos 8 caracteres.',true);return}
 var accounts=getDeviceAccounts();
 if(accounts[email]){setAuthMessage('Já existe uma conta com esse e-mail neste dispositivo. Entre com ela.',true);return}
 if(!confirm('Criar uma conta local para '+email+'? Os dados ficam neste navegador por padrão; depois você pode configurar uma cópia criptografada no Supabase. Guarde a senha local, pois ela é necessária para desbloquear os dados.'))return;
 $('#auth-signup').disabled=true;setAuthMessage('Criando sua conta protegida…',false);
 try{
   var salt=crypto.getRandomValues(new Uint8Array(16)),saltB64=toBase64(salt),key=await deriveLocalKey(password,saltB64);
   var legacy=loadLegacyState(),hasLegacy=legacy.transactions.length||legacy.budgets.length||legacy.goals.length||legacy.cards.length||legacy.debts.length;
   var importLegacy=false;
   if(hasLegacy)importLegacy=confirm('Encontramos dados antigos salvos neste navegador. Deseja importá-los para esta primeira conta?\n\nOK = importar os dados existentes.\nCancelar = começar vazio e manter os dados antigos guardados separadamente.');
   var firstState=importLegacy?legacy:blank();
   var encrypted=await encryptData(email,key,saltB64,JSON.stringify(firstState));
   var pendingEncrypted=null;
   if(hasLegacy&&!importLegacy)pendingEncrypted=await encryptData(email,key,saltB64,JSON.stringify(legacy));
   accounts[email]={email:email,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),salt:encrypted.salt,iv:encrypted.iv,ciphertext:encrypted.ciphertext};
   localStorage.setItem(ACCOUNT_KEY,JSON.stringify(accounts));
   if(hasLegacy){if(!importLegacy)localStorage.setItem(LEGACY_PENDING,JSON.stringify({email:email,salt:pendingEncrypted.salt,iv:pendingEncrypted.iv,ciphertext:pendingEncrypted.ciphertext}));[LEGACY_KEY].concat(LEGACY_OLD_KEYS).forEach(function(keyName){localStorage.removeItem(keyName)})}
   enterApp(email,key,firstState);
   toast('Conta criada neste dispositivo.');
 }catch(err){setAuthMessage(err.message||'Não foi possível criar a conta local.',true)}
 finally{$('#auth-signup').disabled=false}
}
function forgotPassword(){
 setAuthMessage('Como a conta é local e criptografada, a senha não pode ser redefinida. Sem a senha, os dados só poderão ser recuperados de um backup exportado anteriormente.',true);
}
async function saveToDevice(){
 if(!session){toast('Entre na sua conta local primeiro.');return}
 await syncCloudNow();
}
async function logout(){
 if(!session)return;
 save();
 var saved=await saveQueue;
 if(!saved){toast('Não saí da conta porque o último salvamento falhou. Exporte um backup e tente novamente.');return}
 state=blank();session=null;activeEmail=null;cryptoKey=null;
 $('#auth-password').value='';
 renderSettings();showAuth('Você saiu da sua conta neste dispositivo.',false);
}
async function importLegacyData(){
 if(!session)return;
 var raw=localStorage.getItem(LEGACY_PENDING);if(!raw)return;
 if(!confirm('Mesclar os dados antigos deste navegador com a conta '+activeEmail+'?'))return;
 try{
  var pendingRecord=JSON.parse(raw);if(!pendingRecord||pendingRecord.email!==activeEmail)throw new Error('Backup legado pertence a outra conta.');
  var legacy=normalizeState(JSON.parse(await decryptData(activeEmail,cryptoKey,pendingRecord)));
  var existing=new Set(state.transactions.map(fp)),incoming=[];
  legacy.transactions.forEach(function(t){var key=fp(t);if(!existing.has(key)){existing.add(key);incoming.push(t)}});
  state.transactions=state.transactions.concat(incoming);
  function mergeRecords(current,older,keyFn){var seen=new Set(current.map(keyFn));older.forEach(function(x){var k=keyFn(x);if(!seen.has(k)){seen.add(k);current.push(x)}});return current}
  state.budgets=mergeRecords(state.budgets,legacy.budgets,function(x){return x.id||String(x.category)+'|'+String(x.month||thisMonth())});
  state.goals=mergeRecords(state.goals,legacy.goals,function(x){return x.id||String(x.name)});
  state.cards=mergeRecords(state.cards,legacy.cards,function(x){return x.id||String(x.name)});
  state.debts=mergeRecords(state.debts,legacy.debts,function(x){return x.id||String(x.name)});
  save();var saved=await saveQueue;if(!saved)throw new Error('Não foi possível salvar os dados importados.');
  localStorage.removeItem(LEGACY_PENDING);renderAll();toast('Dados antigos importados sem duplicar movimentações.');
 }catch(e){toast('Não foi possível importar os dados antigos. Confira o backup e tente novamente.')}
}
function wire(){
 $$('.nav-link[data-page]').forEach(function(b){b.addEventListener('click',function(){gotoPage(b.dataset.page)})});
 $$('[data-goto]').forEach(function(b){b.addEventListener('click',function(){gotoPage(b.dataset.goto)})});
 $('#mobile-menu').addEventListener('click',function(){$('#sidebar').classList.toggle('open')});
 $('#month-picker').value=thisMonth();$('#transaction-month').value=thisMonth();$('#budget-month-picker').value=thisMonth();
 $('#month-picker').addEventListener('change',renderDash);$('#transaction-month').addEventListener('change',renderTransactions);$('#budget-month-picker').addEventListener('change',renderBudgets);
 $('#type-filter').addEventListener('change',renderTransactions);$('#search-transactions').addEventListener('input',renderTransactions);
 $('#clear-filters').addEventListener('click',function(){$('#search-transactions').value='';$('#type-filter').value='all';$('#transaction-month').value='';renderTransactions()});
 $$('[data-new-transaction]').forEach(function(b){b.addEventListener('click',function(){openForm('transaction')})});
 $('#add-budget').addEventListener('click',function(){openForm('budget')});
 $('#add-goal').addEventListener('click',function(){openForm('goal')});$('#add-goal-empty').addEventListener('click',function(){openForm('goal')});
 $('#add-card').addEventListener('click',function(){openForm('card')});$('#add-card-empty').addEventListener('click',function(){openForm('card')});$('#add-debt').addEventListener('click',function(){openForm('debt')});
 $('#transaction-form').addEventListener('submit',submitForm);$('#close-modal').addEventListener('click',closeForm);$('#cancel-modal').addEventListener('click',closeForm);
 $('#transaction-modal').addEventListener('click',function(e){if(e.target.id==='transaction-modal')closeForm()});document.addEventListener('keydown',function(e){if(e.key==='Escape')closeForm()});
 document.addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b)return;
  var editMap=[['data-edit-transaction','transactions','transaction'],['data-edit-budget','budgets','budget'],['data-edit-goal','goals','goal'],['data-edit-card','cards','card'],['data-edit-debt','debts','debt']];
  for(var j=0;j<editMap.length;j++){var em=editMap[j],eid=b.getAttribute(em[0]);if(eid!==null){var obj=state[em[1]].find(function(x){return String(x.id)===eid});if(obj)openForm(em[2],obj);return}}
  var delMap=[['data-delete-transaction','transactions','este lançamento'],['data-delete-budget','budgets','este orçamento'],['data-delete-goal','goals','esta meta'],['data-delete-card','cards','este cartão'],['data-delete-debt','debts','esta dívida']];
  for(var i=0;i<delMap.length;i++){
   var a=delMap[i],v=b.getAttribute(a[0]);if(v===null)continue;
   if(confirm('Excluir '+a[2]+'?')){
    if(a[1]==='transactions'){
     var tr=state.transactions.find(function(x){return String(x.id)===v});
     if(tr&&tr.installmentGroup)state.transactions=state.transactions.filter(function(x){return x.installmentGroup!==tr.installmentGroup});
     else state.transactions=state.transactions.filter(function(x){return String(x.id)!==v});
    }else if(a[1]==='cards'){state.transactions.forEach(function(t){if(t.cardId===v)t.cardId=''});state.cards=state.cards.filter(function(x){return String(x.id)!==v})}
    else state[a[1]]=state[a[1]].filter(function(x){return String(x.id)!==v});
    save();renderAll();toast('Registro removido.');
   }
   return;
  }
  var g=b.getAttribute('data-contribute-goal');if(g){openForm('contribution',state.goals.find(function(x){return x.id===g}));return}
  var d=b.getAttribute('data-pay-debt');if(d){openForm('payment',state.debts.find(function(x){return x.id===d}));return}
 });
 $('#backup-top').addEventListener('click',exportBackup);$('#export-backup').addEventListener('click',exportBackup);
 $('#restore-file').addEventListener('change',function(e){if(e.target.files[0])restoreBackup(e.target.files[0]);e.target.value=''});
 $('#clear-data').addEventListener('click',function(){if(confirm('Apagar todos os dados desta conta? Exporte um backup antes. Se a sincronização estiver conectada, o estado vazio também será enviado à nuvem.')){state=blank();save();renderAll();toast('Dados locais apagados.')}});
 $('#statement-file').addEventListener('change',function(e){if(e.target.files[0])importFile(e.target.files[0]).catch(function(){toast('Não foi possível ler o arquivo.')})});
  $('#scan-receipt-button').addEventListener('click',function(){$('#receipt-image-input').click()});
  $('#receipt-image-input').addEventListener('change',function(e){var selected=e.target.files&&e.target.files[0];if(selected)scanReceiptImage(selected);e.target.value=''});
 $('#cancel-import').addEventListener('click',function(){pending=[];$('#import-preview').classList.add('hidden')});
 $('#confirm-import').addEventListener('click',function(){if(!pending.length)return;var count=0,seen=new Set(state.transactions.map(fp));pending.forEach(function(t){var k=fp(t);if(!seen.has(k)){seen.add(k);state.transactions.push(t);count++}});pending=[];save();$('#import-preview').classList.add('hidden');$('#statement-file').value='';$('#import-message').classList.add('hidden');renderAll();toast(count+' lançamento(s) importado(s).')});
 $('#auth-form').addEventListener('submit',login);$('#auth-signup').addEventListener('click',createAccount);$('#auth-forgot').addEventListener('click',forgotPassword);$('#import-old-account').addEventListener('click',startLegacyMigration);$('#auth-cancel-migration').addEventListener('click',cancelLegacyMigration);
 $('#logout-button').addEventListener('click',logout);$('#settings-logout').addEventListener('click',logout);$('#cloud-sync').addEventListener('click',syncCloudNow);$('#import-legacy').addEventListener('click',importLegacyData);
 $('#save-cloud-config').addEventListener('click',saveCloudConfig);
 $('#cloud-login').addEventListener('click',function(){signIntoCloud('login')});
 $('#cloud-signup').addEventListener('click',function(){signIntoCloud('signup')});
 $('#cloud-logout').addEventListener('click',async function(){if(cloudClient){await cloudClient.auth.signOut()}cloudSession=null;renderSettings();$('#cloud-message').textContent='Desconectado da nuvem; a conta local continua disponível.'});
 $('#cloud-restore').addEventListener('click',restoreCloudBackup);
}
function init(){
 wire();options('expense');
 activeEmail=null;cryptoKey=null;session=null;state=loadGuestState();
 $('#auth-screen').classList.add('hidden');$('#app-shell').classList.remove('hidden');
 renderAll();renderSettings();
 $('#storage-label').textContent='Salvo neste dispositivo';
 var cfg=readCloudConfig();if(cfg.url&&cfg.anonKey)initializeCloudClient();
}
init();
})();