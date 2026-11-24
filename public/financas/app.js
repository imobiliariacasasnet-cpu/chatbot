(function(){
'use strict';
var ACCOUNT_KEY='mfp_device_accounts_v1',LEGACY_KEY='mfp_local_v1',LEGACY_PENDING='mfp_legacy_pending_v1',state=blank(),session=null,activeEmail=null,cryptoKey=null,pending=[],timer=null,saveQueue=Promise.resolve();
var $=function(s){return document.querySelector(s)},$$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var cats={income:['Salário','Comissões','Freelance','Investimentos','Aluguel recebido','Reembolso','Outras receitas'],expense:['Moradia','Alimentação','Transporte','Contas','Saúde','Educação','Lazer','Compras','Assinaturas','Impostos','Dívidas','Cartão de crédito','Outras despesas']};
function blank(){return {transactions:[],budgets:[],goals:[],cards:[],debts:[]}}
function loadLegacyState(){try{return Object.assign(blank(),JSON.parse(localStorage.getItem(LEGACY_KEY)||'{}'))}catch(e){return blank()}}
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
 if(!activeEmail||!cryptoKey){toast('Entre na sua conta neste dispositivo para salvar.');return false}
 var email=activeEmail,key=cryptoKey,snapshot=JSON.stringify(state);
 saveQueue=saveQueue.catch(function(){}).then(async function(){
   var accounts=getDeviceAccounts(),record=accounts[email];
   if(!record)throw new Error('Conta local não encontrada.');
   var encrypted=await encryptData(email,key,record.salt,snapshot);
   accounts[email]=Object.assign({},record,encrypted,{updatedAt:new Date().toISOString()});
   localStorage.setItem(ACCOUNT_KEY,JSON.stringify(accounts));
   $('#cloud-message').textContent='Salvo com criptografia neste dispositivo.';
   $('#storage-label').textContent='Salvo neste dispositivo';
 }).catch(function(e){
   $('#cloud-message').textContent='Falha ao salvar neste dispositivo: '+(e.message||'erro de armazenamento');
   toast('Não foi possível salvar. Exporte um backup.');
   throw e;
 });
 return true;
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
 var arr=state.transactions.filter(function(t){return (!q||(t.description+' '+t.category).toLowerCase().indexOf(q)>=0)&&(type==='all'||t.type===type)&&(!m||month(t.date)===m)}).sort(function(a,b){return String(b.date).localeCompare(String(a.date))});
 $('#transaction-rows').innerHTML=arr.map(function(t){return '<tr><td><b>'+esc(t.description)+'</b></td><td>'+esc(t.category)+'</td><td>'+dateBR(t.date)+'</td><td><span class="badge '+t.type+'">'+(t.type==='income'?'Receita':'Despesa')+'</span></td><td class="align-right '+(t.type==='income'?'amount-income':'amount-expense')+'">'+(t.type==='income'?'+':'−')+' '+brl(t.amount)+'</td><td><button class="delete-btn" data-delete-transaction="'+esc(t.id)+'" aria-label="Excluir">×</button></td></tr>'}).join('');
 $('#transaction-empty').classList.toggle('show',!arr.length)
}
function renderBudgets(){
 var expenses=forMonth(thisMonth()).filter(function(t){return t.type==='expense'}),spent=total(expenses),limit=state.budgets.reduce(function(a,b){return a+Number(b.limit)},0);
 $('#budget-summary').innerHTML=[['Limite mensal',brl(limit)],['Despesas do mês',brl(spent)],['Disponível',brl(limit-spent)]].map(function(x){return '<article class="metric"><div class="metric-head">'+x[0]+'</div><strong>'+x[1]+'</strong></article>'}).join('');
 $('#budgets-list').innerHTML=state.budgets.map(function(b){var v=total(expenses.filter(function(t){return t.category===b.category})),pct=b.limit?Math.min(100,v/b.limit*100):0;return '<div class="budget-row"><div class="budget-head"><div><b>'+esc(b.category)+'</b><small>'+brl(v)+' gastos de '+brl(b.limit)+'</small></div><div class="budget-amount">'+Math.round(pct)+'%<small>'+(v>b.limit?'Limite ultrapassado':brl(b.limit-v)+' restantes')+'</small></div></div><div class="budget-track"><span class="'+(v>b.limit?'over':'')+'" style="width:'+pct+'%"></span></div><div class="card-actions"><button class="link-btn" data-delete-budget="'+esc(b.id)+'">Remover</button></div></div>'}).join('');
 $('#budgets-empty').classList.toggle('show',!state.budgets.length)
}
function renderGoals(){
 $('#goals-grid').innerHTML=state.goals.map(function(g){var pct=g.target?Math.min(100,g.saved/g.target*100):0;return '<article class="goal-card"><h3>'+esc(g.name)+'</h3><p>'+(g.due?'Meta até '+dateBR(g.due):'Seu objetivo financeiro')+'</p><div class="goal-money">'+brl(g.saved)+'</div><div class="sub">de '+brl(g.target)+' desejados</div><div class="progress" style="margin-top:13px"><span style="width:'+pct+'%"></span></div><div class="goal-foot"><span>'+Math.round(pct)+'% concluído</span><span>'+brl(Math.max(0,g.target-g.saved))+' restantes</span></div><div class="card-actions"><button class="link-btn" data-contribute-goal="'+esc(g.id)+'">＋ Adicionar valor</button><button class="link-btn" data-delete-goal="'+esc(g.id)+'">Excluir</button></div></article>'}).join('');
 $('#goals-empty').classList.toggle('show',!state.goals.length)
}
function renderCards(){
 $('#cards-grid').innerHTML=state.cards.map(function(c){return '<article class="credit-card"><div class="card-visual"><div class="chip"></div><small>'+esc(c.bank||'Cartão')+'</small><b>'+esc(c.name)+'</b><footer><span>Limite '+brl(c.limit)+'</span><span>••••</span></footer></div><div class="card-meta"><span>Disponível</span><b>'+brl(Math.max(0,c.limit-c.used))+'</b></div><div class="card-meta"><span>Fechamento</span><b>'+esc(c.closing||'—')+'</b></div><div class="card-meta"><span>Vencimento</span><b>'+esc(c.due||'—')+'</b></div><div class="card-actions"><button class="link-btn" data-delete-card="'+esc(c.id)+'">Remover cartão</button></div></article>'}).join('');
 $('#cards-empty').classList.toggle('show',!state.cards.length);
 var debt=state.debts.reduce(function(a,d){return a+Number(d.remaining||0)},0);$('#total-debt').textContent='Total: '+brl(debt);
 $('#debts-list').innerHTML=state.debts.map(function(d){return '<div class="setting-row"><div><b>'+esc(d.name)+'</b><p>'+esc(d.notes||'Dívida registrada')+'</p></div><div><b>'+brl(d.remaining)+'</b><div class="card-actions"><button class="link-btn" data-pay-debt="'+esc(d.id)+'">Pagar</button><button class="link-btn" data-delete-debt="'+esc(d.id)+'">Excluir</button></div></div></div>'}).join('');
 $('#debts-empty').classList.toggle('hidden',state.debts.length>0)
}
function renderSettings(){
 var email=session&&session.user?session.user.email:'—';
 $('#settings-account-email').textContent=email;
 $('#account-email').textContent=email;
 $('#logout-button').classList.toggle('hidden',!session);
 $('#settings-logout').classList.toggle('hidden',!session);
 $('#cloud-sync').disabled=!session;
 $('#legacy-import-row').classList.toggle('hidden',!localStorage.getItem(LEGACY_PENDING));
 if(session){
   cloudStatus('Dados protegidos neste dispositivo','Criptografados e disponíveis somente neste navegador e perfil.',true);
   $('#storage-label').textContent='Salvo neste dispositivo';
   $('#cloud-message').textContent='Nenhum dado é enviado para a nuvem.';
 }else{
   cloudStatus('Login necessário','Entre na conta local para acessar seus dados.',false);
   $('#storage-label').textContent='Aguardando login';
   $('#cloud-message').textContent='Os dados ficam somente neste dispositivo.';
 }
}
function cloudStatus(title,msg,ready){
 $('#cloud-status-title').textContent=title;
 $('#cloud-status-text').textContent=msg;
 $('#cloud-status').classList.toggle('ready',!!ready);
}
var fields='<label class="field-label">Tipo<select id="form-type"><option value="expense">Despesa</option><option value="income">Receita</option></select></label><label class="field-label">Valor (R$)<input id="form-amount" type="number" min=".01" step=".01" required></label><label class="field-label wide">Descrição<input id="form-description" required maxlength="140"></label><label class="field-label">Categoria<select id="form-category"></select></label><label class="field-label">Data<input id="form-date" type="date" required></label>';
var kind='transaction', target=null;
function options(type,selected){$('#form-category').innerHTML=cats[type].map(function(c){return '<option value="'+esc(c)+'">'+esc(c)+'</option>'}).join('');if(selected)$('#form-category').value=selected}
function openForm(k,obj){kind=k;target=obj&&obj.id||null;$('#transaction-modal').classList.remove('hidden');$('#modal-title').textContent=({transaction:obj?'Editar lançamento':'Novo lançamento',budget:'Criar orçamento',goal:'Nova meta financeira',card:'Adicionar cartão',debt:'Registrar dívida',contribution:'Adicionar à meta',payment:'Registrar pagamento'})[k]||'Novo registro';var grid=$('#transaction-form .form-grid');
 if(k==='transaction'){grid.innerHTML=fields;$('#form-date').value=obj?obj.date:isoDate();$('#form-amount').value=obj?obj.amount:'';$('#form-description').value=obj?obj.description:'';$('#form-type').value=obj?obj.type:'expense';options($('#form-type').value,obj&&obj.category);$('#form-type').onchange=function(){options($('#form-type').value)}}
 else if(k==='budget')grid.innerHTML='<label class="field-label wide">Categoria<select id="x-cat">'+cats.expense.map(function(c){return '<option>'+esc(c)+'</option>'}).join('')+'</select></label><label class="field-label wide">Limite mensal (R$)<input id="x-limit" type="number" min=".01" step=".01" required></label>';
 else if(k==='goal')grid.innerHTML='<label class="field-label wide">Nome da meta<input id="x-name" required placeholder="Reserva de emergência"></label><label class="field-label">Valor desejado (R$)<input id="x-target" type="number" min=".01" step=".01" required></label><label class="field-label">Já guardado (R$)<input id="x-saved" type="number" min="0" step=".01" value="0"></label><label class="field-label wide">Data desejada<input id="x-due" type="date"></label>';
 else if(k==='card')grid.innerHTML='<label class="field-label">Nome do cartão<input id="x-name" required placeholder="Cartão principal"></label><label class="field-label">Banco/emissor<input id="x-bank"></label><label class="field-label">Limite (R$)<input id="x-limit" type="number" min="0" step=".01" required></label><label class="field-label">Limite utilizado (R$)<input id="x-used" type="number" min="0" step=".01" value="0"></label><label class="field-label">Dia fechamento<input id="x-closing" type="number" min="1" max="31"></label><label class="field-label">Dia vencimento<input id="x-due" type="number" min="1" max="31"></label>';
 else if(k==='debt')grid.innerHTML='<label class="field-label wide">Nome da dívida<input id="x-name" required></label><label class="field-label">Valor original (R$)<input id="x-total" type="number" min="0" step=".01" required></label><label class="field-label">Saldo a pagar (R$)<input id="x-rem" type="number" min="0" step=".01" required></label><label class="field-label wide">Observação<input id="x-notes"></label>';
 else grid.innerHTML='<label class="field-label wide">Valor (R$)<input id="x-value" type="number" min=".01" step=".01" required></label>'
}
function closeForm(){$('#transaction-modal').classList.add('hidden');$('#transaction-form .form-grid').innerHTML=fields;options('expense');target=null}
function num(s){return Number($('#'+s).value||0)}function txt(s){return ($('#'+s).value||'').trim()}
function submitForm(e){e.preventDefault();
 if(kind==='transaction'){var t={id:target||id(),type:$('#form-type').value,amount:num('form-amount'),description:txt('form-description'),category:$('#form-category').value,date:$('#form-date').value};if(!t.description||!t.date||t.amount<=0){toast('Confira descrição, data e valor.');return}if(target)state.transactions=state.transactions.map(function(x){return x.id===target?t:x});else state.transactions.push(t)}
 if(kind==='budget'){var cat=txt('x-cat'),lim=num('x-limit');if(lim<=0)return;var ex=state.budgets.find(function(b){return b.category===cat});if(ex)ex.limit=lim;else state.budgets.push({id:id(),category:cat,limit:lim})}
 if(kind==='goal'){var name=txt('x-name'),tar=num('x-target');if(!name||tar<=0)return;state.goals.push({id:id(),name:name,target:tar,saved:num('x-saved'),due:txt('x-due')})}
 if(kind==='card'){var cn=txt('x-name');if(!cn)return;state.cards.push({id:id(),name:cn,bank:txt('x-bank'),limit:num('x-limit'),used:num('x-used'),closing:txt('x-closing'),due:txt('x-due')})}
 if(kind==='debt'){var dn=txt('x-name');if(!dn)return;state.debts.push({id:id(),name:dn,total:num('x-total'),remaining:num('x-rem'),notes:txt('x-notes')})}
 if(kind==='contribution'){var g=state.goals.find(function(x){return x.id===target});if(g&&num('x-value')>0)g.saved=Number(g.saved||0)+num('x-value')}
 if(kind==='payment'){var d=state.debts.find(function(x){return x.id===target}),v=num('x-value');if(d&&v>0){d.remaining=Math.max(0,d.remaining-v);state.transactions.push({id:id(),type:'expense',amount:v,description:'Pagamento: '+d.name,category:'Dívidas',date:isoDate()})}}
 save();closeForm();renderAll();toast('Dados salvos.')
}
function download(blob,name){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href)},1000)}
function exportBackup(){download(new Blob([JSON.stringify({app:'Meu Financeiro Pessoal',version:1,exportedAt:new Date().toISOString(),data:state},null,2)],{type:'application/json'}),'meu-financeiro-backup-'+isoDate()+'.json');toast('Backup exportado.')}
function restoreBackup(f){var r=new FileReader();r.onload=function(){try{var o=JSON.parse(r.result),d=o.data||o;if(!Array.isArray(d.transactions))throw Error('backup inválido');if(!confirm('Substituir os dados atuais pelos dados do backup?'))return;state=Object.assign(blank(),d);save();renderAll();toast('Backup restaurado.')}catch(e){toast('Arquivo de backup inválido.')}};r.readAsText(f)}
function parseCSV(text){var first=text.split(/\r?\n/)[0]||'',sep=(first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':',',rows=[],row=[],cell='',quoted=false;
 for(var i=0;i<text.length;i++){var c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=!quoted;else if(c===sep&&!quoted){row.push(cell.trim());cell=''}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell=''}else cell+=c}if(cell.length||row.length){row.push(cell.trim());if(row.some(Boolean))rows.push(row)}if(rows.length<2)return [];
 var norm=function(v){return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim()},head=rows.shift().map(norm),find=function(a){return head.findIndex(function(h){return a.some(function(w){return h===w||h.indexOf(w)>=0})})};
 var di=find(['data','date']),hi=find(['descricao','historico','memo','description','lancamento']),vi=find(['valor','amount']),ti=find(['tipo','type']),ci=find(['categoria','category']);
 return rows.map(function(r){var dt=r[di]||'';if(/^\d{2}\/\d{2}\/\d{4}$/.test(dt)){var p=dt.split('/');dt=p[2]+'-'+p[1]+'-'+p[0]}else if(/^\d{8}$/.test(dt))dt=dt.slice(0,4)+'-'+dt.slice(4,6)+'-'+dt.slice(6,8);
 var s=String(r[vi]||'').replace(/[R$\s]/g,'');if(s.indexOf(',')>=0&&s.indexOf('.')>=0)s=s.replace(/\./g,'').replace(',','.');else s=s.replace(',','.');var amount=Number(s),raw=norm(r[ti]||''),type=/receita|credito|credit|entrada|deposito/.test(raw)?'income':'expense';if(amount<0){amount=Math.abs(amount);type='expense'}
 return {id:id(),date:dt,type:type,amount:amount,description:(r[hi]||'Movimentação importada').trim(),category:(r[ci]||'').trim()||(type==='income'?'Outras receitas':'Outras despesas')}}).filter(function(t){return t.amount>0&&/^\d{4}-\d{2}-\d{2}$/.test(t.date)})}
function parseOFX(text){return Array.from(text.matchAll(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi)).map(function(m){var get=function(tag){return (m[1].match(new RegExp('<'+tag+'>([^\\r\\n<]+)','i'))||[])[1]||''},d=get('DTPOSTED').slice(0,8),v=Number(get('TRNAMT').replace(',','.'));if(d.length!==8)return null;return {id:id(),date:d.slice(0,4)+'-'+d.slice(4,6)+'-'+d.slice(6,8),type:v>=0?'income':'expense',amount:Math.abs(v),description:get('NAME')||get('MEMO')||'Movimentação OFX',category:v>=0?'Outras receitas':'Outras despesas'}}).filter(Boolean)}
function fp(t){return t.date+'|'+Number(t.amount).toFixed(2)+'|'+t.type+'|'+String(t.description).trim().toLowerCase().replace(/\s+/g,' ')}
async function importFile(f){if(f.size>10485760){toast('O arquivo deve ter até 10 MB.');return}var text=await f.text();pending=/\.ofx$/i.test(f.name)||/<OFX>/i.test(text)?parseOFX(text):parseCSV(text);var known=new Set(state.transactions.map(fp)),dups=0;pending=pending.filter(function(t){if(known.has(fp(t))){dups++;return false}known.add(fp(t));return true});$('#import-message').classList.remove('hidden','error');$('#import-message').textContent=pending.length?pending.length+' lançamento(s) para revisar. '+(dups?dups+' duplicidade(s) provável(is) ignorada(s).':''):'Não encontrei linhas válidas. Confira o formato CSV/OFX ou use o modelo.';$('#import-message').classList.toggle('error',!pending.length);$('#import-preview').classList.toggle('hidden',!pending.length);$('#import-preview-info').textContent=pending.length+' lançamento(s) encontrados';$('#import-duplicate-note').textContent=dups?dups+' possível(is) duplicidade(s) ignorada(s).':'';$('#import-preview-rows').innerHTML=pending.slice(0,100).map(function(t){return '<tr><td>'+esc(t.description)+'</td><td>'+dateBR(t.date)+'</td><td>'+(t.type==='income'?'Receita':'Despesa')+'</td><td class="align-right">'+brl(t.amount)+'</td></tr>'}).join('')}
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
function enterApp(email,key,data){
 activeEmail=email;cryptoKey=key;session={user:{id:email,email:email}};
 state=Object.assign(blank(),data||{});
 $('#auth-screen').classList.add('hidden');$('#app-shell').classList.remove('hidden');
 renderAll();renderSettings();
 setAuthMessage('');
}
async function login(e){
 if(e)e.preventDefault();
 if(!window.crypto||!crypto.subtle){setAuthMessage('Este navegador não oferece criptografia segura. Abra o aplicativo em HTTPS em um navegador atualizado.',true);return}
 var email=normalizeEmail($('#auth-email').value),password=$('#auth-password').value;
 if(!email||password.length<8){setAuthMessage('Informe o e-mail e a senha cadastrados neste dispositivo.',true);return}
 $('#auth-login').disabled=true;$('#auth-login').textContent='Verificando…';setAuthMessage('Desbloqueando seus dados…',false);
 try{
   var record=getDeviceAccounts()[email];
   if(!record)throw new Error('Não encontramos essa conta neste dispositivo. Crie a conta aqui primeiro.');
   var key=await deriveLocalKey(password,record.salt);
   var plain=await decryptData(email,key,record);
   var data=JSON.parse(plain);
   if(!data||!Array.isArray(data.transactions))throw new Error('Os dados desta conta estão inválidos. Restaure um backup se tiver.');
   enterApp(email,key,data);
 }catch(err){setAuthMessage(err.message==='The operation failed'?'Senha incorreta. Tente novamente.':(err.message||'E-mail ou senha incorretos.'),true)}
 finally{$('#auth-login').disabled=false;$('#auth-login').textContent='Entrar'}
}
async function createAccount(){
 if(!window.crypto||!crypto.subtle){setAuthMessage('Este navegador não oferece criptografia segura. Atualize o navegador e use HTTPS.',true);return}
 var email=normalizeEmail($('#auth-email').value),password=$('#auth-password').value;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){setAuthMessage('Informe um endereço de e-mail válido.',true);return}
 if(password.length<8){setAuthMessage('Crie uma senha com pelo menos 8 caracteres.',true);return}
 var accounts=getDeviceAccounts();
 if(accounts[email]){setAuthMessage('Já existe uma conta com esse e-mail neste dispositivo. Entre com ela.',true);return}
 if(!confirm('Criar uma conta local para '+email+'? Ela só existirá neste navegador e não será sincronizada com outros dispositivos.'))return;
 $('#auth-signup').disabled=true;setAuthMessage('Criando sua conta protegida…',false);
 try{
   var salt=crypto.getRandomValues(new Uint8Array(16)),saltB64=toBase64(salt),key=await deriveLocalKey(password,saltB64);
   var legacy=loadLegacyState(),hasLegacy=legacy.transactions.length||legacy.budgets.length||legacy.goals.length||legacy.cards.length||legacy.debts.length;
   var importLegacy=false;
   if(hasLegacy)importLegacy=confirm('Encontramos dados antigos salvos neste navegador. Deseja importá-los para esta primeira conta?\n\nOK = importar os dados existentes.\nCancelar = começar vazio e manter os dados antigos guardados separadamente.');
   var firstState=importLegacy?legacy:blank();
   var encrypted=await encryptData(email,key,saltB64,JSON.stringify(firstState));
   accounts[email]={email:email,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),salt:encrypted.salt,iv:encrypted.iv,ciphertext:encrypted.ciphertext};
   localStorage.setItem(ACCOUNT_KEY,JSON.stringify(accounts));
   if(hasLegacy){if(importLegacy)localStorage.removeItem(LEGACY_KEY);else{localStorage.setItem(LEGACY_PENDING,JSON.stringify(legacy));localStorage.removeItem(LEGACY_KEY)}}
   enterApp(email,key,firstState);
   toast('Conta criada neste dispositivo.');
 }catch(err){setAuthMessage(err.message||'Não foi possível criar a conta local.',true)}
 finally{$('#auth-signup').disabled=false}
}
function forgotPassword(){
 setAuthMessage('Como a conta é local e criptografada, a senha não pode ser redefinida. Sem a senha, os dados só poderão ser recuperados de um backup exportado anteriormente.',true);
}
async function saveToDevice(){
 if(!session){toast('Entre na sua conta primeiro.');return}
 save();
 try{await saveQueue;toast('Dados salvos neste dispositivo.')}catch(e){toast('Falha ao salvar. Exporte um backup e tente novamente.')}
}
async function logout(){
 if(!session)return;
 save();
 try{await saveQueue}catch(e){toast('Não saí da conta porque o último salvamento falhou. Exporte um backup e tente novamente.');return}
 state=blank();session=null;activeEmail=null;cryptoKey=null;
 $('#auth-password').value='';
 renderSettings();showAuth('Você saiu da sua conta neste dispositivo.',false);
}
async function importLegacyData(){
 if(!session)return;
 var raw=localStorage.getItem(LEGACY_PENDING);if(!raw)return;
 if(!confirm('Mesclar os dados antigos deste navegador com a conta '+activeEmail+'?'))return;
 try{
   var legacy=Object.assign(blank(),JSON.parse(raw));
   state.transactions=state.transactions.concat(legacy.transactions||[]);
   state.budgets=state.budgets.concat(legacy.budgets||[]);
   state.goals=state.goals.concat(legacy.goals||[]);
   state.cards=state.cards.concat(legacy.cards||[]);
   state.debts=state.debts.concat(legacy.debts||[]);
   save();await saveQueue;localStorage.removeItem(LEGACY_PENDING);renderAll();toast('Dados antigos importados e criptografados.');
 }catch(e){toast('Não foi possível importar os dados antigos.')}
}
function wire(){
 $$('.nav-link[data-page]').forEach(function(b){b.addEventListener('click',function(){gotoPage(b.dataset.page)})});$$('[data-goto]').forEach(function(b){b.addEventListener('click',function(){gotoPage(b.dataset.goto)})});
 $('#mobile-menu').addEventListener('click',function(){$('#sidebar').classList.toggle('open')});
 $('#month-picker').value=thisMonth();$('#transaction-month').value=thisMonth();$('#month-picker').addEventListener('change',renderDash);$('#transaction-month').addEventListener('change',renderTransactions);$('#type-filter').addEventListener('change',renderTransactions);$('#search-transactions').addEventListener('input',renderTransactions);$('#clear-filters').addEventListener('click',function(){$('#search-transactions').value='';$('#type-filter').value='all';$('#transaction-month').value='';renderTransactions()});
 $$('[data-new-transaction]').forEach(function(b){b.addEventListener('click',function(){openForm('transaction')})});
 $('#add-budget').addEventListener('click',function(){openForm('budget')});$('#add-goal').addEventListener('click',function(){openForm('goal')});$('#add-goal-empty').addEventListener('click',function(){openForm('goal')});$('#add-card').addEventListener('click',function(){openForm('card')});$('#add-card-empty').addEventListener('click',function(){openForm('card')});$('#add-debt').addEventListener('click',function(){openForm('debt')});
 $('#transaction-form').addEventListener('submit',submitForm);$('#close-modal').addEventListener('click',closeForm);$('#cancel-modal').addEventListener('click',closeForm);$('#transaction-modal').addEventListener('click',function(e){if(e.target.id==='transaction-modal')closeForm()});document.addEventListener('keydown',function(e){if(e.key==='Escape')closeForm()});
 document.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;var cases=[['data-delete-transaction','transactions','este lançamento'],['data-delete-budget','budgets','este orçamento'],['data-delete-goal','goals','esta meta'],['data-delete-card','cards','este cartão'],['data-delete-debt','debts','esta dívida']];for(var i=0;i<cases.length;i++){var a=cases[i],v=b.getAttribute(a[0]);if(v!==null){if(confirm('Excluir '+a[2]+'?')){state[a[1]]=state[a[1]].filter(function(x){return String(x.id)!==v});save();renderAll();toast('Registro removido.')}return}}
 var g=b.getAttribute('data-contribute-goal');if(g){openForm('contribution',state.goals.find(function(x){return x.id===g}));return}var d=b.getAttribute('data-pay-debt');if(d)openForm('payment',state.debts.find(function(x){return x.id===d}))});
 $('#backup-top').addEventListener('click',exportBackup);$('#export-backup').addEventListener('click',exportBackup);$('#restore-file').addEventListener('change',function(e){if(e.target.files[0])restoreBackup(e.target.files[0]);e.target.value=''});
 $('#clear-data').addEventListener('click',function(){if(confirm('Apagar todos os dados deste navegador? Exporte um backup antes.')){state=blank();save();renderAll();toast('Dados locais apagados.')}});
 $('#statement-file').addEventListener('change',function(e){if(e.target.files[0])importFile(e.target.files[0]).catch(function(){toast('Não foi possível ler o arquivo.')})});$('#cancel-import').addEventListener('click',function(){pending=[];$('#import-preview').classList.add('hidden')});$('#confirm-import').addEventListener('click',function(){if(!pending.length)return;state.transactions.push.apply(state.transactions,pending);var n=pending.length;pending=[];save();$('#import-preview').classList.add('hidden');$('#statement-file').value='';$('#import-message').classList.add('hidden');renderAll();toast(n+' lançamento(s) importado(s).')});
 $('#auth-form').addEventListener('submit',login);
 $('#auth-signup').addEventListener('click',createAccount);
 $('#auth-forgot').addEventListener('click',forgotPassword);
 $('#logout-button').addEventListener('click',logout);
 $('#settings-logout').addEventListener('click',logout);
 $('#cloud-sync').addEventListener('click',saveToDevice);
 $('#import-legacy').addEventListener('click',importLegacyData)
}
function init(){wire();options('expense');state=blank();$('#app-shell').classList.add('hidden');$('#auth-screen').classList.remove('hidden');renderSettings();setAuthMessage('Crie uma conta neste dispositivo ou entre com uma conta já cadastrada aqui.',false)}
init();
})();