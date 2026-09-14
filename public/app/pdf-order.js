(()=>{
  const STORE='cbs_orders_v2';
  const CURRENT='cbs_current_order_id';
  const WA='558530318830';
  let activeUrl=null;
  const finalized=new Set();
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const money=n=>n==null?'A confirmar':'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const dateParts=d=>{const x=new Date(d);return {date:x.toLocaleDateString('pt-BR'),time:x.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}};
  const orders=()=>read(STORE,[]);
  const saveOrders=a=>write(STORE,a);
  function cartSnapshot(){
    const c=read('cbs_cart',{});
    return Object.values(c).map(x=>({id:x.product?.id,code:x.product?.code,name:x.product?.name,qty:Number(x.qty||0),price:x.product?.price==null?null:Number(x.product.price),minimum:x.product?.minimum,minimumText:x.product?.minimumText})).filter(x=>x.id&&x.qty>0);
  }
  const total=items=>items.reduce((a,x)=>a+(x.price||0)*x.qty,0);
  function nextId(){
    const now=new Date(), y=now.getFullYear(),m=String(now.getMonth()+1).padStart(2,'0'),d=String(now.getDate()).padStart(2,'0'),prefix=`PED-${y}${m}${d}-`;
    const n=orders().filter(o=>String(o.id).startsWith(prefix)).reduce((max,o)=>Math.max(max,Number(String(o.id).split('-').pop())||0),0)+1;
    return prefix+String(n).padStart(3,'0');
  }
  function buildMessage(o){
    const u=o.user||{};
    const lines=['Olá! Quero fazer um pedido pelo App da CBS e Waves Plus.','',`Pedido: ${o.id}`,`Data: ${o.date} às ${o.time}`,`Nome: ${u.name||'Cliente'}`,`Empresa: ${u.company||'-'}`,`Telefone: ${u.phone||'-'}`,'','Produtos:'];
    (o.products||[]).forEach((x,i)=>lines.push(`${i+1}. ${x.name} | Cód. ${x.code} | Qtde: ${x.qty} | ${x.price==null?'A confirmar':money(x.price*x.qty)}`));
    lines.push('',`Total: ${o.hasUnknownPrice?'A confirmar':money(o.total)}`);
    if(o.notes)lines.push(`Observações: ${o.notes}`);
    lines.push('','O PDF do pedido foi gerado no app. Aguardo o retorno. Obrigado!');
    return lines.join('\n');
  }
  function ensureOrder(){
    let all=orders();
    const currentId=localStorage.getItem(CURRENT);
    let o=all.find(x=>x.id===currentId);
    if(o&&o.products?.length)return o;
    const items=cartSnapshot(); if(!items.length)return null;
    const now=new Date(),dt=dateParts(now),user=read('cbs_user',{}),notes=localStorage.getItem('cbs_notes')||'';
    o={id:nextId(),createdAt:now.toISOString(),date:dt.date,time:dt.time,status:'Pronto para enviar',products:items,items:items.length,total:total(items),hasUnknownPrice:items.some(x=>x.price==null),notes,user};
    o.message=buildMessage(o); all.unshift(o);saveOrders(all);localStorage.setItem(CURRENT,o.id);return o;
  }
  function markSent(o){
    const all=orders(),i=all.findIndex(x=>x.id===o.id),now=new Date();
    if(i>=0){all[i]={...all[i],status:'Enviado',sentAt:now.toISOString()};all[i].message=buildMessage(all[i]);saveOrders(all);return all[i]}
    return o;
  }
  function clearDraft(){
    localStorage.setItem('cbs_cart','{}');
    localStorage.removeItem('cbs_notes');
    localStorage.removeItem(CURRENT);
  }
  async function finalizeOrder(o){
    const box=document.querySelector(`[data-pdf-state="${o.id}"]`);
    if(box){box.className='pdf-finalize-state saving';box.innerHTML='<b>Salvando seu pedido...</b><span>Aguarde só um instante.</span>'}
    const sync=window.CBSSheetsSync?.syncOrderById;
    const out=sync?await sync(o.id):null;
    if(out?.ok){
      clearDraft();finalized.add(o.id);
      if(box){box.className='pdf-finalize-state success';box.innerHTML='<b>Pedido finalizado e salvo ✓</b><span>Seu carrinho foi zerado e já está pronto para um novo pedido.</span>'}
      const wa=document.querySelector('.pdf-whatsapp');if(wa)wa.disabled=false;
      const fresh=document.querySelector('.pdf-new-order');if(fresh)fresh.disabled=false;
      const history=document.querySelector('.pdf-view-orders');if(history)history.disabled=false;
      return true;
    }
    if(box){box.className='pdf-finalize-state error';box.innerHTML='<b>Não conseguimos confirmar o salvamento.</b><span>Seu carrinho foi mantido. Feche esta tela e tente finalizar novamente.</span>'}
    return false;
  }
  function makePdf(o){
    if(!window.jspdf?.jsPDF)return null;
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a4'});
    const W=210, margin=14;
    let y=0;
    const header=()=>{
      doc.setFillColor(3,27,53);doc.rect(0,0,W,34,'F');
      doc.setFillColor(255,229,0);doc.rect(0,34,W,2.5,'F');
      doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('PEDIDO CBS + WAVES PLUS',margin,15);
      doc.setFontSize(10);doc.setFont('helvetica','normal');doc.text(`Pedido ${o.id}`,margin,23);doc.text(`${o.date} às ${o.time}`,margin,29);
      y=46;
    };
    const footer=()=>{doc.setTextColor(95,111,125);doc.setFontSize(8);doc.text(`CBS & Waves Plus • Pedido ${o.id}`,margin,292);doc.text(`Página ${doc.getNumberOfPages()}`,188,292,{align:'right'})};
    const newPage=()=>{footer();doc.addPage();header()};
    header();
    doc.setTextColor(18,40,58);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('DADOS DO CLIENTE',margin,y);y+=7;
    doc.setFont('helvetica','normal');doc.setFontSize(10);
    const u=o.user||{};
    [`Nome: ${u.name||'Cliente'}`,`Empresa: ${u.company||'-'}`,`Telefone: ${u.phone||'-'}`,`E-mail: ${u.email||'-'}`].forEach(t=>{doc.text(clean(t),margin,y);y+=5.5});
    y+=3;
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('ITENS DO PEDIDO',margin,y);y+=7;
    const cols={code:14,name:39,qty:133,unit:151,sub:181};
    doc.setFillColor(232,240,247);doc.rect(margin,y-4,W-margin*2,8,'F');
    doc.setFontSize(8.5);doc.setTextColor(28,51,70);doc.text('CÓD.',cols.code,y);doc.text('PRODUTO',cols.name,y);doc.text('QTD.',cols.qty,y);doc.text('UNIT.',cols.unit,y);doc.text('SUBTOTAL',cols.sub,y,{align:'right'});y+=7;
    doc.setFont('helvetica','normal');
    (o.products||[]).forEach((x,idx)=>{
      const nameLines=doc.splitTextToSize(clean(x.name),88);const h=Math.max(10,nameLines.length*4.3+3);
      if(y+h>273){newPage();doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setFillColor(232,240,247);doc.rect(margin,y-4,W-margin*2,8,'F');doc.text('CÓD.',cols.code,y);doc.text('PRODUTO',cols.name,y);doc.text('QTD.',cols.qty,y);doc.text('UNIT.',cols.unit,y);doc.text('SUBTOTAL',cols.sub,y,{align:'right'});y+=7;doc.setFont('helvetica','normal')}
      if(idx%2===1){doc.setFillColor(248,251,253);doc.rect(margin,y-4,W-margin*2,h,'F')}
      doc.setTextColor(25,48,66);doc.setFontSize(8.7);doc.text(clean(x.code||'-'),cols.code,y);doc.text(nameLines,cols.name,y);doc.text(String(x.qty),cols.qty,y);
      doc.text(x.price==null?'A confirmar':money(x.price).replace('R$ ','R$'),cols.unit,y);
      doc.text(x.price==null?'A confirmar':money(x.price*x.qty),cols.sub,y,{align:'right'});
      y+=h;
    });
    if(y>248)newPage();
    y+=4;doc.setDrawColor(204,216,226);doc.line(margin,y,W-margin,y);y+=8;
    doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(3,27,53);doc.text('TOTAL',margin,y);doc.setFontSize(15);doc.text(o.hasUnknownPrice?'A confirmar':money(o.total),W-margin,y,{align:'right'});y+=8;
    if(o.notes){doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('Observações:',margin,y);y+=5;doc.setFont('helvetica','normal');const lines=doc.splitTextToSize(clean(o.notes),178);doc.text(lines,margin,y);y+=lines.length*4.5+3}
    doc.setFillColor(255,248,194);doc.roundedRect(margin,y,W-margin*2,18,2,2,'F');doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(75,65,0);doc.text('Pedido gerado pelo App CBS + Waves Plus',margin+5,y+7);doc.setFont('helvetica','normal');doc.text('Atendimento comercial: WhatsApp (85) 3031-8830',margin+5,y+13);
    footer();
    return doc;
  }
  function toast(t){const e=document.createElement('div');e.className='pdf-toast';e.textContent=t;document.body.appendChild(e);setTimeout(()=>e.remove(),2600)}
  function routeAfter(kind){sessionStorage.setItem(kind==='orders'?'cbs_open_orders':'cbs_open_pedir','1');location.reload()}
  function showPdf(o){
    document.querySelector('.pdf-order-modal')?.remove();
    if(activeUrl){URL.revokeObjectURL(activeUrl);activeUrl=null}
    const doc=makePdf(o);let blob=null,file=null;
    if(doc){blob=doc.output('blob');activeUrl=URL.createObjectURL(blob);file=new File([blob],`${o.id}.pdf`,{type:'application/pdf'})}
    const modal=document.createElement('div');modal.className='pdf-order-modal';
    modal.innerHTML=`<div class="pdf-order-card"><div class="pdf-order-head"><div><h2>Seu pedido em PDF</h2><p>${o.id} • revise antes de enviar</p></div><button class="pdf-order-close" aria-label="Fechar">×</button></div><div class="pdf-finalize-state saving" data-pdf-state="${o.id}"><b>Salvando seu pedido...</b><span>Aguarde só um instante.</span></div><div class="pdf-order-preview">${activeUrl?`<iframe title="PDF do pedido" src="${activeUrl}#toolbar=0&navpanes=0"></iframe>`:'<div class="pdf-fallback">Não foi possível abrir a prévia do PDF neste navegador.<br>Você ainda pode enviar o resumo pelo WhatsApp.</div>'}</div><div class="pdf-order-actions">${activeUrl?`<a class="pdf-download" href="${activeUrl}" download="${o.id}.pdf">⬇ Baixar PDF</a>`:''}<button class="pdf-share" ${file?'':'disabled'}>↗ Compartilhar PDF</button><button class="pdf-whatsapp" disabled>WhatsApp • Enviar pedido</button><div class="pdf-post-actions"><button class="pdf-new-order" disabled>＋ Fazer novo pedido</button><button class="pdf-view-orders" disabled>▤ Ver meus pedidos</button></div><div class="pdf-order-hint">O WhatsApp não permite anexar um arquivo automaticamente pelo link. No celular, use “Compartilhar PDF” para enviar o arquivo diretamente ao WhatsApp; ou baixe o PDF e anexe na conversa.</div></div></div>`;
    document.body.appendChild(modal);
    modal.querySelector('.pdf-order-close').onclick=()=>{if(finalized.has(o.id))location.reload();else modal.remove()};
    const share=modal.querySelector('.pdf-share');
    if(file&&navigator.canShare?.({files:[file]})) share.onclick=async()=>{try{await navigator.share({title:`Pedido ${o.id}`,text:`Pedido ${o.id} - CBS & Waves Plus`,files:[file]})}catch(e){if(e?.name!=='AbortError')toast('Não foi possível compartilhar o PDF neste aparelho.')}};
    else if(share){share.disabled=true;share.title='Compartilhamento de arquivo não disponível neste navegador'}
    modal.querySelector('.pdf-new-order').onclick=()=>{if(finalized.has(o.id))routeAfter('new')};
    modal.querySelector('.pdf-view-orders').onclick=()=>{if(finalized.has(o.id))routeAfter('orders')};
    modal.querySelector('.pdf-whatsapp').onclick=async()=>{
      const sent=markSent(o);const msg=sent.message||buildMessage(sent);
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`,'_blank');
      const out=await window.CBSSheetsSync?.syncOrderById?.(sent.id);
      if(out?.ok){clearDraft();finalized.add(o.id);toast('Pedido salvo e WhatsApp aberto.');setTimeout(()=>routeAfter('orders'),700)}
      else toast('WhatsApp aberto, mas o pedido ainda não foi confirmado na planilha.');
    };
  }
  document.addEventListener('click',async e=>{
    const final=e.target.closest('[data-go="send"]');
    if(!final)return;
    e.preventDefault();e.stopImmediatePropagation();
    const o=ensureOrder();
    if(!o){alert('Seu carrinho está vazio.');return}
    showPdf(o);
    await finalizeOrder(o);
  },true);
})();
