(()=>{
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k)||JSON.stringify(f))}catch{return f}};
  const money=n=>'R$ '+Number(n||0).toLocaleString('pt-BR',{minimumFractionDigits:3,maximumFractionDigits:3});
  const cart=()=>read('cbs_cart',{});
  const cartEntries=()=>Object.values(cart());
  const cartTotal=()=>cartEntries().reduce((a,x)=>a+Number(x.product?.price||0)*Number(x.qty||0),0);

  function renameNav(){
    document.querySelectorAll('.bottom-nav [data-go="categories"]').forEach(btn=>{
      btn.classList.add('ux-order-tab');
      btn.setAttribute('aria-label','Fazer novo pedido');
      const ico=btn.querySelector('.navico');if(ico)ico.textContent='＋';
      const spans=btn.querySelectorAll('span');if(spans.length)spans[spans.length-1].textContent='Pedir';
    });
  }

  function goHomeThen(fn){
    const home=document.querySelector('[data-go="home"]');
    if(home)home.click();
    setTimeout(fn,40);
  }

  function goAllProducts(){
    goHomeThen(()=>document.querySelector('[data-go="catalog"]')?.click());
  }

  function goSearch(q){
    const query=String(q||'').trim();if(!query)return;
    goHomeThen(()=>{
      const input=document.querySelector('#homeSearch');
      if(!input)return;
      input.value=query;
      input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',code:'Enter',bubbles:true}));
    });
  }

  function addCartDock(screen){
    screen.querySelector('.ux-cart-dock')?.remove();
    const items=cartEntries();if(!items.length)return;
    const nav=screen.querySelector('.bottom-nav');if(!nav)return;
    const dock=document.createElement('div');dock.className='ux-cart-dock';
    dock.innerHTML=`<div><small>Pedido em andamento</small><b>${items.length} ${items.length===1?'item':'itens'} • ${money(cartTotal())}</b></div><button type="button" data-ux-cart>Ver pedido →</button>`;
    nav.insertAdjacentElement('beforebegin',dock);
    dock.querySelector('[data-ux-cart]').onclick=()=>screen.querySelector('[data-go="cart"]')?.click();
  }

  function enhancePedir(){
    const h=[...document.querySelectorAll('.page-title h1')].find(x=>x.textContent.trim()==='Categorias'||x.textContent.trim()==='Novo pedido');
    if(!h)return;
    const screen=h.closest('.screen');if(!screen)return;
    h.textContent='Novo pedido';
    if(screen.dataset.uxPedir!=='1'){
      screen.dataset.uxPedir='1';
      const title=h.closest('.page-title');
      const intro=document.createElement('div');intro.className='ux-order-intro';
      intro.innerHTML=`<span class="ux-eyebrow">COMECE AQUI</span><h2>O que você precisa hoje?</h2><p>Escolha uma categoria ou encontre um produto pelo nome ou código.</p><div class="ux-order-search"><span>⌕</span><input type="search" placeholder="Buscar produto ou código..."><button type="button">Buscar</button></div><button class="ux-all-products" type="button">Ver todos os produtos <b>›</b></button><div class="ux-category-label"><b>Escolha uma categoria</b><span>Toque para ver os produtos</span></div>`;
      title.insertAdjacentElement('afterend',intro);
      const input=intro.querySelector('input');
      intro.querySelector('.ux-order-search button').onclick=()=>goSearch(input.value);
      input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();goSearch(input.value)}};
      intro.querySelector('.ux-all-products').onclick=goAllProducts;
    }
    addCartDock(screen);
  }

  function enhanceBrowse(){
    document.querySelectorAll('.screen').forEach(screen=>{
      if(screen.querySelector('.product-list')||screen.classList.contains('detail'))addCartDock(screen);
    });
  }

  function enhanceOtherLinks(){
    document.querySelectorAll('.profile-actions [data-go="categories"]').forEach(b=>{b.innerHTML='＋ &nbsp; Fazer novo pedido'});
    document.querySelectorAll('.empty [data-go="categories"]').forEach(b=>{b.textContent='Começar novo pedido'});
  }

  let routed=false;
  function routeFlags(){
    if(routed)return;
    const pedir=sessionStorage.getItem('cbs_open_pedir');
    const orders=sessionStorage.getItem('cbs_open_orders');
    if(!pedir&&!orders)return;
    routed=true;
    sessionStorage.removeItem('cbs_open_pedir');sessionStorage.removeItem('cbs_open_orders');
    setTimeout(()=>{
      const btn=document.querySelector(orders?'[data-go="orders"]':'[data-go="categories"]');
      btn?.click();
    },80);
  }

  function run(){renameNav();enhancePedir();enhanceBrowse();enhanceOtherLinks();routeFlags()}
  new MutationObserver(()=>queueMicrotask(run)).observe(document.getElementById('app')||document.body,{childList:true,subtree:true});
  window.addEventListener('storage',run);
  run();
})();
