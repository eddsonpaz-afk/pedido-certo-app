export default async function handler(req, res) {
  const url = 'https://script.google.com/macros/s/AKfycbwYASgfXXWBJCM933mgfXTmL09nY_34bBdb2Viq6ptB1CcVtGie0_hi05JlvPwnvzM0/exec';
  if (req.method !== 'GET') return res.status(405).json({ok:false});
  const tag = 'TESTE-' + Date.now();
  const register = {
    action:'register', name:'Teste Integração Luca', company:'CBS Waves Plus TESTE', document:'', phone:'(85) 00000-0000',
    email:'teste.integracao@cbswaves.local', passwordHash:'teste', origin:'Teste integração automático'
  };
  const rr = await fetch(url,{method:'POST',redirect:'follow',headers:{'content-type':'text/plain;charset=utf-8'},body:JSON.stringify(register)});
  const registerText = await rr.text();
  let registerData={}; try{registerData=JSON.parse(registerText)}catch{}
  const order = {
    action:'order', order:{
      id:tag, createdAt:new Date().toISOString(), status:'Pronto para enviar', total:12.509, notes:'Teste automático de integração - pode apagar',
      message:'Teste automático de integração', user:{name:'Teste Integração Luca',company:'CBS Waves Plus TESTE',phone:'(85) 00000-0000',email:'teste.integracao@cbswaves.local'},
      products:[{id:'PROD-0001',code:'10225',name:'Produto teste integração',qty:1,price:12.509,minimum:1,minimumText:'1 unidade'}]
    }
  };
  const or = await fetch(url,{method:'POST',redirect:'follow',headers:{'content-type':'text/plain;charset=utf-8'},body:JSON.stringify(order)});
  const orderText=await or.text();
  let orderData={}; try{orderData=JSON.parse(orderText)}catch{}
  res.status(rr.ok&&or.ok?200:502).json({ok:rr.ok&&or.ok&&registerData.ok&&orderData.ok, tag, register:registerData, order:orderData});
}
