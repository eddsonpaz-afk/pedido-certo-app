(()=>{
  const CART_KEY='cbs_cart';
  const EPS=1e-9;
  const readCart=()=>{try{return JSON.parse(localStorage.getItem(CART_KEY)||'{}')}catch{return {}}};
  const clean=n=>Math.round((Number(n)+Number.EPSILON)*1000000)/1000000;
  const normalize=(qty,min)=>{
    min=Number(min)||1;
    qty=Number(qty)||min;
    const mult=Math.max(1,Math.ceil((qty-EPS)/min));
    return clean(mult*min);
  };
  const fmt=n=>Number.isInteger(Number(n))?String(Number(n)):String(clean(n));

  // Corrige carrinhos antigos antes do core do app carregar.
  try{
    const cart=readCart(); let changed=false;
    Object.values(cart).forEach(x=>{
      const min=Number(x?.product?.minimum)||1;
      const valid=normalize(x?.qty,min);
      if(Number(x?.qty)!==valid){x.qty=valid;changed=true}
    });
    if(changed)localStorage.setItem(CART_KEY,JSON.stringify(cart));
  }catch{}

  function minFromText(root){
    const text=root?.textContent||'';
    const m=text.match(/(?:Qtde\.?|Quantidade)\s*m[ií]nima\s*:\s*([\d.,]+)/i);
    if(!m)return null;
    const raw=m[1].replace(/\./g,'').replace(',','.');
    const n=Number(raw);
    return Number.isFinite(n)&&n>0?n:null;
  }
  function minFor(btn){
    const id=btn.dataset.qty||btn.dataset.cartqty;
    const cart=readCart();
    const fromCart=Number(cart?.[id]?.product?.minimum);
    if(Number.isFinite(fromCart)&&fromCart>0)return fromCart;
    const root=btn.closest('.product-row,.detail,.cart-row')||btn.parentElement?.parentElement;
    const fromText=minFromText(root);
    if(fromText)return fromText;
    const span=btn.parentElement?.querySelector('span');
    const current=Number(span?.textContent);
    return Number.isFinite(current)&&current>0?current:1;
  }
  function currentQty(btn){
    const span=btn.parentElement?.querySelector('span');
    const n=Number(span?.textContent);
    return Number.isFinite(n)?n:0;
  }
  function refreshButtons(){
    document.querySelectorAll('[data-qty],[data-cartqty]').forEach(btn=>{
      const min=minFor(btn);
      const minus=Number(btn.dataset.d)<0;
      const q=currentQty(btn);
      btn.dataset.d=fmt((minus?-1:1)*min);
      btn.title=minus?`Diminuir ${fmt(min)}`:`Adicionar ${fmt(min)}`;
      btn.setAttribute('aria-label',btn.title);
      if(minus)btn.disabled=q<=min+EPS;
    });
  }

  // Antes do handler original, troca +1/-1 pelo passo da quantidade mínima.
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('[data-qty],[data-cartqty]');
    if(!btn)return;
    const min=minFor(btn);
    const minus=Number(btn.dataset.d)<0;
    const q=currentQty(btn);
    btn.dataset.d=fmt((minus?-1:1)*min);
    if(minus&&q<=min+EPS){
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    setTimeout(refreshButtons,0);
  },true);

  // Garante que qualquer quantidade adicionada esteja no mínimo ou em múltiplo dele.
  document.addEventListener('click',e=>{
    const add=e.target.closest?.('[data-add]');
    if(!add)return;
    const id=add.dataset.add;
    const root=add.closest('.product-row,.detail');
    const qtyEl=root?.querySelector(`#q-${CSS.escape(id)}`)||document.getElementById(`q-${id}`);
    const minus=root?.querySelector(`[data-qty="${CSS.escape(id)}"][data-d^="-"]`);
    const anyBtn=root?.querySelector(`[data-qty="${CSS.escape(id)}"]`);
    const min=minFor(minus||anyBtn||add);
    if(qtyEl){
      const valid=normalize(Number(qtyEl.textContent),min);
      qtyEl.textContent=fmt(valid);
    }
  },true);

  const style=document.createElement('style');
  style.textContent='.qty button:disabled{opacity:.28;cursor:not-allowed;filter:saturate(.3)}';
  document.head.appendChild(style);

  const start=()=>{
    refreshButtons();
    const target=document.getElementById('app')||document.body;
    new MutationObserver(()=>queueMicrotask(refreshButtons)).observe(target,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();