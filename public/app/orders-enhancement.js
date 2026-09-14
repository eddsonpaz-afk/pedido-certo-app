(()=>{
  const STORE='cbs_orders_v2';
  const CURRENT='cbs_current_order_id';
  const WA='558530318830';
  const read=(k,fallback)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(fallback))}catch{return fallback}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const money=n=>n==null?'A confirmar':'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const orders=()=>read(STORE,[]);
  const saveOrders=a=>write(STORE,a);
  const cartSnapshot=()=>{
    const c=read('cbs_cart',{});
    return Object.values(c).map(x=>({
      id:x.product?.id, code:x.product?.code, name:x.product?.name,
      qty:Number(x.qty||0), price:x.product?.price==null?null:Number(x.product.price),
      minimum:x.product?.minimum, minimumText:x.product?.minimumText
    })).filter(x=>x.id&&x.qty>0);
  };
  const signature=items=>items.map(x=>`${x.id}:${x.qty}`).sort().join('|')+'|'+(localStorage.getItem('cbs_notes')||'');
  const dateParts=d=>{
    const x=new Date(d);return {date:x.toLocaleDateString('pt-BR'),time:x.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
  };
  const nextId=()=>{
    const now=new Date(), y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0'),d=String(now.getDate()).padStart(2,'0');
    const prefix=`PED-${y}${m}${d}-`;
    const n=orders().filter(o=>String(o.id).startsWith(prefix)).reduce((max,o)=>Math.max(max,Number(String(o.id).split('-').pop())||0),0)+1;
    return prefix+String(n).padStart(3,'0');
  };
  const calcTotal=items=>items.reduce((a,x)=>a+(x.price||0)*x.qty,0);
  const buildMessage=o=>{
    const u=o.user||{};
    const lines=[
      'Olá! Quero fazer um pedido pelo App da CBS e Waves Plus.',
      '',`Pedido: ${o.id}`,`Data: ${o.date} às ${o.time}`,
      `Nome: ${u.name||'Cliente'}`,`Empresa: ${u.company||'-'}`,`Telefone: ${u.phone||'-'}`,
      '','Produtos:'
    ];
    o.products.forEach((x,i)=>lines.push(`${i+1}. ${x.name} | Cód. ${x.code} | Qtde: ${x.qty} | ${money(x.price==null?null:x.price*x.qty)}`));
    lines.push('',`Total: ${o.hasUnknownPrice?'A confirmar':money(o.total)}`);
    if(o.notes)lines.push(`Observações: ${o.notes}`);
    lines.push('','Aguardo o retorno. Obrigado!');
    return lines.join('\n');
  };
  function createPending(){
    const items=cartSnapshot(); if(!items.length)return null;
    let all=orders(), currentId=localStorage.getItem(CURRENT), current=all.find(o=>o.id===currentId);
    const sig=signature(items);
    if(current&&current.status==='Pronto para enviar'&&current.signature===sig)return current;
    if(current&&current.status==='Pronto para enviar') all=all.filter(o=>o.id!==current.id);
    const now=new Date(), dt=dateParts(now), user=read('cbs_user',{}), notes=localStorage.getItem('cbs_notes')||'';
    const o={id:nextId(),createdAt:now.toISOString(),date:dt.date,time:dt.time,status:'Pronto para enviar',products:items,items:items.length,total:calcTotal(items),hasUnknownPrice:items.some(x=>x.price==null),notes,user,signature:sig};
    o.message=buildMessage(o); all.unshift(o); saveOrders(all); localStorage.setItem(CURRENT,o.id); return o;
  }
  function markSent(id){
    let all=orders(), i=all.findIndex(o=>o.id===id); if(i<0)return null;
    const now=new Date(), dt=dateParts(now); all[i]={...all[i],status:'Enviado',sentAt:now.toISOString(),date:all[i].date||dt.date,time:all[i].time||dt.time};
    all[i].message=buildMessage(all[i]); saveOrders(all); return all[i];
  }
  function statusClass(s){return s==='Enviado'?'sent':s==='Confirmado'?'confirmed':s==='Finalizado'?'done':s==='Cancelado'?'cancelled':'ready'}
  function ensureOrdersTab(){
    document.querySelectorAll('.bottom-nav').forEach(nav=>{
      if(nav.querySelector('[data-go="orders"], [data-orders-addon]'))return;
      const profile=nav.querySelector('[data-go="profile"]');
      const b=document.createElement('button'); b.setAttribute('data-orders-addon','1'); b.innerHTML='<span class="navico">▤</span><span>Pedidos</span>';
      nav.insertBefore(b,profile||null);
    });
  }
  function orderCard(o){
    const count=o.products?.length||o.items||0;
    return `<button class="enh-order-card" data-order-id="${esc(o.id)}"><div class="enh-order-top"><div><b>${esc(o.id)}</b><small>${esc(o.date)} • ${count} ${count===1?'item':'itens'}</small></div><span class="order-status ${statusClass(o.status)}">${esc(o.status)}</span></div><div class="enh-order-bottom"><span>${o.hasUnknownPrice?'Total a confirmar':money(o.total)}</span><strong>Ver detalhes ›</strong></div></button>`;
  }
  function enhanceOrdersPage(){
    const h=[...document.querySelectorAll('.page-title h1')].find(x=>x.textContent.trim()==='Meus pedidos'); if(!h)return;
    const screen=h.closest('.screen'); if(!screen||screen.dataset.ordersEnhanced==='1')return;
    screen.dataset.ordersEnhanced='1';
    const nav=screen.querySelector('.bottom-nav'), title=h.closest('.page-title');
    let n=title.nextSibling; while(n&&n!==nav){const next=n.nextSibling;n.remove();n=next}
    const wrap=document.createElement('div'); wrap.className='enh-orders-wrap';
    const all=orders();
    wrap.innerHTML=all.length?`<div class="orders-intro"><b>Histórico de pedidos</b><span>${all.length} ${all.length===1?'pedido':'pedidos'}</span></div>${all.map(orderCard).join('')}`:'<div class="empty enh-empty">Você ainda não tem pedidos.<br><small>Quando finalizar uma compra, ela aparecerá aqui.</small></div>';
    screen.insertBefore(wrap,nav||null);
  }
  function enhanceSendPage(){
    const h=[...document.querySelectorAll('.page-title h1')].find(x=>x.textContent.trim()==='Enviar pedido'); if(!h)return;
    const screen=h.closest('.screen'); if(!screen)return;
    let o=createPending(); if(!o)return;
    if(!screen.querySelector('.current-order-number')){
      const box=document.createElement('div'); box.className='current-order-number'; box.innerHTML=`<span>Número do pedido</span><b>${esc(o.id)}</b><small>Ele já foi salvo em Meus pedidos.</small>`;
      const title=screen.querySelector('.send-title'); title?.insertAdjacentElement('afterend',box);
    }
    const msg=screen.querySelector('.preview .msg'); if(msg)msg.textContent=o.message;
  }
  function openOrder(id){
    const o=orders().find(x=>x.id===id); if(!o)return;
    const modal=document.createElement('div'); modal.className='order-modal';
    modal.innerHTML=`<div class="order-sheet"><div class="order-sheet-head"><div><small>Pedido</small><h2>${esc(o.id)}</h2></div><button class="order-modal-close">×</button></div><div class="order-meta"><span>${esc(o.date)} às ${esc(o.time)}</span><span class="order-status ${statusClass(o.status)}">${esc(o.status)}</span></div><div class="order-items">${(o.products||[]).map(x=>`<div class="order-item"><div><b>${esc(x.name)}</b><small>Cód. ${esc(x.code)} • Qtde: ${x.qty}</small></div><strong>${money(x.price==null?null:x.price*x.qty)}</strong></div>`).join('')}</div>${o.notes?`<div class="order-note"><b>Observações</b><p>${esc(o.notes)}</p></div>`:''}<div class="order-sheet-total"><span>Total</span><b>${o.hasUnknownPrice?'A confirmar':money(o.total)}</b></div><button class="cta order-resend" data-order-id="${esc(o.id)}">☎ &nbsp; ${o.status==='Pronto para enviar'?'Enviar no WhatsApp':'Enviar novamente no WhatsApp'}</button></div>`;
    document.body.appendChild(modal);
  }
  function successOverlay(o){
    const modal=document.createElement('div'); modal.className='order-success';
    modal.innerHTML=`<div class="order-success-card"><div class="success-check">✓</div><h2>Pedido enviado!</h2><p>O <b>${esc(o.id)}</b> foi salvo no seu histórico e encaminhado para o WhatsApp da CBS & Waves Plus.</p><button class="cta" data-success-orders>Ver meus pedidos</button><button class="secondary-link" data-success-home>Voltar ao início</button></div>`;
    document.body.appendChild(modal);
  }
  function sendOrder(o){
    const sent=markSent(o.id)||o;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(sent.message||buildMessage(sent))}`,'_blank');
    localStorage.removeItem(CURRENT); localStorage.setItem('cbs_cart','{}'); localStorage.removeItem('cbs_notes');
    document.querySelector('.order-modal')?.remove(); successOverlay(sent);
  }
  document.addEventListener('click',e=>{
    const t=e.target.closest('[data-go="send"]'); if(t)createPending();
    const wa=e.target.closest('#sendWa'); if(wa){
      e.preventDefault(); e.stopImmediatePropagation(); const id=localStorage.getItem(CURRENT); let o=orders().find(x=>x.id===id)||createPending(); if(o)sendOrder(o); return;
    }
    const addon=e.target.closest('[data-orders-addon]'); if(addon){e.preventDefault();const existing=document.querySelector('[data-go="orders"]');if(existing)existing.click();else{const all=orders();alert(all.length?`Você tem ${all.length} pedido(s) salvo(s).`:'Você ainda não tem pedidos.')}return}
    const card=e.target.closest('.enh-order-card'); if(card){e.preventDefault();openOrder(card.dataset.orderId);return}
    if(e.target.closest('.order-modal-close')){document.querySelector('.order-modal')?.remove();return}
    const resend=e.target.closest('.order-resend'); if(resend){e.preventDefault();const o=orders().find(x=>x.id===resend.dataset.orderId);if(o)sendOrder(o);return}
    if(e.target.closest('[data-success-orders]')){document.querySelector('.order-success')?.remove(); const btn=document.querySelector('[data-go="orders"]'); if(btn)btn.click(); return}
    if(e.target.closest('[data-success-home]')){location.reload();return}
  },true);
  const run=()=>{ensureOrdersTab();enhanceOrdersPage();enhanceSendPage()};
  new MutationObserver(()=>queueMicrotask(run)).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  run();
})();