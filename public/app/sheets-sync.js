(()=>{
  const API='/api/sheets';
  const pendingKey='cbs_sync_pending';

  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
  const savePending=p=>{const a=read(pendingKey,[]);a.push({...p,queuedAt:new Date().toISOString()});localStorage.setItem(pendingKey,JSON.stringify(a.slice(-100)))};
  const post=async payload=>{
    try{
      const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const data=await r.json().catch(()=>({ok:false,error:'Resposta inválida'}));
      if(!r.ok||!data.ok) throw new Error(data.error||`HTTP ${r.status}`);
      return data;
    }catch(err){savePending(payload);console.warn('CBS sync pendente:',err);return null}
  };

  async function sha256(text){
    const bytes=new TextEncoder().encode(String(text||''));
    const hash=await crypto.subtle.digest('SHA-256',bytes);
    return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  }

  async function syncRegister(form){
    const fd=new FormData(form);
    const password=String(fd.get('password')||'');
    const confirm=String(fd.get('confirm')||'');
    if(!fd.get('name')||password.length<6||password!==confirm)return;
    const payload={
      action:'register',
      name:String(fd.get('name')||''), company:String(fd.get('company')||''),
      document:String(fd.get('doc')||''), phone:String(fd.get('phone')||''),
      email:String(fd.get('email')||'').trim().toLowerCase(),
      passwordHash:await sha256(password), origin:'App CBS/Waves Plus'
    };
    const out=await post(payload);
    if(out?.id){
      const u=read('cbs_user',{});u.id=out.id;localStorage.setItem('cbs_user',JSON.stringify(u));
    }
  }

  function normalizeOrder(o){
    if(!o)return null;
    return {
      id:o.id, createdAt:o.createdAt||new Date().toISOString(), date:o.date, time:o.time,
      status:o.status||'Pronto para enviar', total:Number(o.total||0), notes:o.notes||'',
      message:o.message||'', user:o.user||read('cbs_user',{}),
      products:(o.products||[]).map(p=>({
        id:p.id, code:p.code, name:p.name, qty:Number(p.qty||0),
        price:p.price==null?null:Number(p.price), minimum:p.minimum, minimumText:p.minimumText
      }))
    };
  }

  async function syncOrderById(id){
    const all=read('cbs_orders_v2',[]);const o=all.find(x=>x.id===id);if(!o)return;
    await post({action:'order',order:normalizeOrder(o)});
  }

  async function flush(){
    const q=read(pendingKey,[]);if(!q.length)return;
    const keep=[];
    for(const p of q){
      try{
        const r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(p)});
        const d=await r.json().catch(()=>({ok:false}));if(!r.ok||!d.ok)keep.push(p);
      }catch{keep.push(p)}
    }
    localStorage.setItem(pendingKey,JSON.stringify(keep));
  }

  document.addEventListener('submit',e=>{
    const f=e.target;if(f?.id!=='authForm'||!f.querySelector('[name="name"]'))return;
    const snapshot=f.cloneNode(true);
    const data=new FormData(f);
    setTimeout(()=>{
      const fake=document.createElement('form');
      for(const [k,v] of data.entries()){const i=document.createElement('input');i.name=k;i.value=String(v);fake.appendChild(i)}
      syncRegister(fake);
    },30);
  },true);

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-go="send"]')){
      setTimeout(()=>{const id=localStorage.getItem('cbs_current_order_id');if(id)syncOrderById(id)},250);
    }
    if(e.target.closest('#sendWa,.order-resend,[data-pdf-whatsapp]')){
      setTimeout(()=>{
        const id=localStorage.getItem('cbs_current_order_id');
        if(id)syncOrderById(id);else{const a=read('cbs_orders_v2',[]);if(a[0]?.id)syncOrderById(a[0].id)}
      },350);
    }
  },true);

  window.CBSSheetsSync={post,syncOrderById,flush};
  window.addEventListener('online',flush);
  setTimeout(flush,1200);
})();
