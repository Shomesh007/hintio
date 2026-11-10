import { supabase } from './lib/supabase';

if (!import.meta.env.DEV) throw new Error('Sandbox verification is development-only');
const client = supabase!;
const text = (id:string,value:string) => { document.getElementById(id)!.textContent=value; };
let busy=false;
function status(value:string) {text('state',value);}
async function invoke(name:string,body:any) {
    const {data,error}=await client.functions.invoke(name,{body});
    if(error) {let message=error.message; try{message=(await error.context.json()).error||message;}catch{} throw new Error(message);}
    if(data?.error) throw new Error(data.error);
    return data;
}
function safeResult(value:any) {
    const clean=JSON.parse(JSON.stringify(value,(key,v)=> /signature|secret|authorization|access_token|refresh_token/i.test(key)?undefined:v));
    text('result',JSON.stringify(clean,null,2));
}
async function run(action:()=>Promise<void>) {
    if(busy)return; busy=true; status('Working…');
    try {await action();}catch(e){status(e instanceof Error?e.message:'Verification failed');}finally{busy=false;}
}
async function account() {
    const {data:{session}}=await client.auth.getSession();
    text('account',session?'Signed in for sandbox verification':'Sign in to test ownership-bound billing.');
    (document.getElementById('yearly') as HTMLButtonElement).disabled=!session;
    (document.getElementById('monthly') as HTMLButtonElement).disabled=!session;
}
async function refresh() {
    const data=await invoke('test-manage-billing',{action:'list'});
    safeResult(data);
    const holder=document.getElementById('licenses')!; holder.replaceChildren();
    for(const license of data.purchases||[]) {
        const row=document.createElement('p');
        row.textContent=license.plan+' • '+license.status+' • paid until '+license.validUntil;
        const cancel=document.createElement('button');
        cancel.textContent='Cancel sandbox monthly renewal';
        cancel.disabled=license.plan!=='monthly'||license.cancelScheduled||!license.autoRenew;
        cancel.onclick=()=>run(async()=>{
            if(!confirm('Cancel this TEST subscription at the end of its paid cycle? No live subscription will change.'))return;
            safeResult(await invoke('test-manage-billing',{action:'cancel',licenseId:license.id,confirm:true}));
            await refresh(); status('Sandbox cancellation checked.');
        });
        row.append(cancel);holder.append(row);
    }
    status('Sandbox billing refreshed.');
}
async function checkout(plan:'monthly'|'yearly') {
    const data=await invoke('test-create-razorpay-checkout',{plan});
    if(!/^rzp_test_[A-Za-z0-9]+$/.test(data.keyId))throw new Error('Blocked: checkout did not return a Test-mode key');
    safeResult({mode:'TEST',plan,orderId:data.orderId,subscriptionId:data.subscriptionId,amount:data.amount,currency:data.currency});
    if(!(window as any).Razorpay)await new Promise<void>((resolve,reject)=>{
        const script=document.createElement('script'); script.src='https://checkout.razorpay.com/v1/checkout.js';
        script.onload=()=>resolve(); script.onerror=()=>reject(new Error('Razorpay checkout could not load')); document.head.append(script);
    });
    new (window as any).Razorpay({
        key:data.keyId, name:'Hintio TEST', description:data.description, amount:data.amount,currency:data.currency,
        ...(data.orderId?{order_id:data.orderId}:{subscription_id:data.subscriptionId}),prefill:data.prefill,
        handler:async(proof:any)=> {
            status('Verifying captured sandbox payment…');
            try {
                const issued=await invoke('test-issue-paid-license',{plan,paymentId:proof.razorpay_payment_id,
                    signature:proof.razorpay_signature,...(data.orderId?{orderId:data.orderId}:{subscriptionId:data.subscriptionId})});
                safeResult(issued); status('Sandbox key issued. Use Refresh to check server-side billing.');
            }catch(e){status(e instanceof Error?e.message:'Capture pending');}
        },
        modal:{ondismiss:()=>status('Test checkout closed.')},
    }).open();
    status('Complete only the Razorpay TEST checkout.');
}
document.getElementById('signin')!.onclick=()=>run(async()=>{
    const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+'/'}});
    if(error)throw error;
});
document.getElementById('refresh')!.onclick=()=>run(refresh);
document.getElementById('yearly')!.onclick=()=>run(()=>checkout('yearly'));
document.getElementById('monthly')!.onclick=()=>run(()=>checkout('monthly'));
for(const [id,plan] of [['recoverMonthly','monthly'],['recoverYearly','yearly']]) {
    document.getElementById(id)!.onclick=()=>run(async()=>{
        const data=await invoke('test-get-my-license',{plan});
        if(!String(data.licenseKey||'').startsWith('HINTIO-TEST-')) throw new Error('No active matching sandbox key returned');
        safeResult(data); status(plan+' sandbox key recovered from server.');
    });
}
await account();
