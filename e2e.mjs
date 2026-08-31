const BASE = process.env.BASE_URL || 'http://localhost:4000';
const password='construite123';
async function req(path, options={}){const r=await fetch(BASE+path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const d=await r.json().catch(()=>({}));return {status:r.status,data:d};}
async function login(email){const r=await req('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});if(r.status!==200)throw Error(`login ${email}: ${r.status}`);return r.data;}
async function auth(path,token,options={}){return req(path,{...options,headers:{...(options.headers||{}),Authorization:`Bearer ${token}`}})}
function ok(x,m){if(!x)throw Error(m);console.log('PASS',m)}
const h=await req('/health');ok(h.status===200&&h.data.ok,'health');
const owner=await login('dueno@construite.com');ok(owner.portalesDisponibles.join(',')==='admin,cliente,personal','dueño: 3 portales');
const client=await login('cliente@gonzalez.com');ok(client.portalesDisponibles.join(',')==='cliente','cliente: solo cliente');
const worker=await login('juan@construite.com');ok(worker.portalesDisponibles.join(',')==='personal','trabajador: solo personal');
ok((await auth('/api/admin/dashboard',owner.token)).status===200,'dueño puede admin');
ok((await auth('/api/cliente/consorcios',client.token)).status===200,'cliente puede cliente');
ok((await auth('/api/cliente/consorcios',owner.token)).status===200,'dueño puede cliente');
ok((await auth('/api/personal/mi-dia',owner.token)).status===200,'dueño puede personal');
const wd=await auth('/api/personal/mi-dia',worker.token);ok(wd.status===200&&wd.data.length>0,'trabajador puede personal');
ok((await auth('/api/admin/dashboard',client.token)).status===403,'cliente bloqueado admin');
ok((await auth('/api/personal/mi-dia',client.token)).status===403,'cliente bloqueado personal');
ok((await auth('/api/admin/dashboard',worker.token)).status===403,'trabajador bloqueado admin');
ok((await auth('/api/cliente/consorcios',worker.token)).status===403,'trabajador bloqueado cliente');
console.log('E2E OK');
