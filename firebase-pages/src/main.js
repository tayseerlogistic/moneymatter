import { createApp, ref, computed, onUnmounted } from 'vue';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import './style.css';

const required = ['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_APP_ID'];
const missing = required.filter(k => !import.meta.env[k]);
const firebase = missing.length ? null : initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
});
const auth = firebase ? getAuth(firebase) : null;
const db = firebase ? getFirestore(firebase) : null;

const App = {
 setup() {
  const user = ref(null), ready = ref(false), loading = ref(false), error = ref('');
  const email = ref(''), password = ref(''), register = ref(false);
  const accounts = ref([]), entries = ref([]);
  const accountName = ref(''), currency = ref('SAR');
  const selectedAccount = ref(''), kind = ref('expense'), amount = ref(''), note = ref('');
  const date = ref(new Date().toLocaleDateString('en-CA'));
  const unsubscribers = [];
  function stopListeners() { while (unsubscribers.length) unsubscribers.pop()(); accounts.value=[]; entries.value=[]; selectedAccount.value=''; }
  function attach(uid) {
   const onError = e => { error.value = e.message; };
   unsubscribers.push(onSnapshot(collection(db,'users',uid,'accounts'),snap=>{
    accounts.value=snap.docs.map(d=>({id:d.id,...d.data()}));
    if (!accounts.value.some(a=>a.id===selectedAccount.value)) selectedAccount.value=accounts.value[0]?.id || '';
   },onError));
   unsubscribers.push(onSnapshot(collection(db,'users',uid,'entries'),snap=>{
    entries.value=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>b.date.localeCompare(a.date));
   },onError));
  }
  if (auth) onAuthStateChanged(auth,u=>{stopListeners();user.value=u;if(u)attach(u.uid);ready.value=true;},e=>{error.value=e.message;ready.value=true;});
  else ready.value=true;
  async function run(task) { error.value='';loading.value=true;try { await task(); } catch(e) {error.value=e.message;} finally {loading.value=false;} }
  function login() {return run(()=>register.value?createUserWithEmailAndPassword(auth,email.value,password.value):signInWithEmailAndPassword(auth,email.value,password.value));}
  function logout() {return run(()=>signOut(auth));}
  function createAccount() {return run(async()=>{
   const name=accountName.value.trim();if(!name)throw Error('Enter an account name');
   await addDoc(collection(db,'users',user.value.uid,'accounts'),{name,currency:currency.value.toUpperCase(),createdAt:serverTimestamp()});accountName.value='';
  });}
  function createEntry() {return run(async()=>{
   const minor=Math.round(Number(amount.value)*100);
   if(!selectedAccount.value || !Number.isSafeInteger(minor)||minor<=0)throw Error('Select account and enter a valid positive amount');
   await addDoc(collection(db,'users',user.value.uid,'entries'),{accountId:selectedAccount.value,kind:kind.value,amountMinor:minor,note:note.value.trim().slice(0,300),date:date.value,createdAt:serverTimestamp()});
   amount.value='';note.value='';
  });}
  function removeEntry(id) { if(!confirm('Delete this entry?')) return;return run(()=>deleteDoc(doc(db,'users',user.value.uid,'entries',id))); }
  function removeAccount(a) { if(entries.value.some(e=>e.accountId===a.id)) {error.value='Delete all transactions in this account first.';return;} if(!confirm('Delete account '+a.name+'?')) return;return run(()=>deleteDoc(doc(db,'users',user.value.uid,'accounts',a.id))); }
  function format(minor,code) {return new Intl.NumberFormat(undefined,{style:'currency',currency:code||'SAR'}).format(minor/100);}
  const balances = computed(()=>accounts.value.map(a=>({ ...a, balance:entries.value.filter(e=>e.accountId===a.id).reduce((n,e)=>n+(e.kind==='income'?e.amountMinor:-e.amountMinor),0)})));
  function exportData() {
   const payload={format:'moneymatter-firebase-mvp-v1',exportedAt:new Date().toISOString(),accounts:accounts.value.map(({id,name,currency})=>({id,name,currency})),entries:entries.value.map(({id,accountId,kind,amountMinor,note,date})=>({id,accountId,kind,amountMinor,note,date}))};
   const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download='moneymatter-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  onUnmounted(stopListeners);
  return {missing,ready,user,loading,error,email,password,register,accounts,entries,accountName,currency,selectedAccount,kind,amount,note,date,balances,login,logout,createAccount,createEntry,removeEntry,removeAccount,format,exportData};
 },
 template:`
 <main class="shell"><header><div><h1>MoneyMatter</h1><p>Firebase + GitHub Pages starter</p></div><button v-if="user" @click="logout">Sign out</button></header>
 <div v-if="missing.length" class="alert">Missing Firebase configuration: {{missing.join(', ')}}. See firebase-pages/README.md.</div>
 <div v-else-if="!ready">Connecting…</div>
 <section v-else-if="!user" class="panel login"><h2>{{register?'Create account':'Sign in'}}</h2><form @submit.prevent="login">
 <label>Email<input type="email" autocomplete="email" v-model="email" required /></label>
 <label>Password<input type="password" :autocomplete="register?'new-password':'current-password'" minlength="6" v-model="password" required /></label>
 <button :disabled="loading">{{register?'Register':'Sign in'}}</button></form><button class="link" @click="register=!register">{{register?'Already registered? Sign in':'Need an account? Register'}}</button></section>
 <template v-else><div class="toolbar"><span>Signed in as {{user.email}}</span><button @click="exportData">Download JSON backup</button></div>
 <div class="grid"><section class="panel"><h2>Accounts</h2>
 <form @submit.prevent="createAccount"><label>Account name<input v-model="accountName" placeholder="Cash / Bank" required maxlength="100"/></label>
 <label>Currency<select v-model="currency"><option>SAR</option><option>USD</option><option>EUR</option><option>AED</option><option>INR</option></select></label>
 <button :disabled="loading">Add account</button></form>
 <ul class="cards"><li v-for="a in balances" :key="a.id"><strong>{{a.name}}</strong><span>{{format(a.balance,a.currency)}}</span><button class="small danger" @click="removeAccount(a)">Delete</button></li></ul>
 </section><section class="panel"><h2>New transaction</h2>
 <form @submit.prevent="createEntry">
 <label>Account<select v-model="selectedAccount" required><option disabled value="">Select account</option><option v-for="a in accounts" :value="a.id" :key="a.id">{{a.name}} ({{a.currency}})</option></select></label>
 <label>Type<select v-model="kind"><option value="expense">Expense</option><option value="income">Income</option></select></label>
 <label>Amount<input type="number" min="0.01" max="1000000000" step="0.01" v-model="amount" required/></label>
 <label>Date<input type="date" v-model="date" required/></label><label>Note<input v-model="note" maxlength="300"/></label>
 <button :disabled="loading || !accounts.length">Save transaction</button></form></section></div>
 <section class="panel"><h2>Transactions</h2><p v-if="!entries.length">No transactions yet.</p><div class="table-wrap"><table v-if="entries.length"><thead><tr><th>Date</th><th>Account</th><th>Note</th><th>Type</th><th>Amount</th><th></th></tr></thead><tbody>
 <tr v-for="e in entries" :key="e.id"><td>{{e.date}}</td><td>{{accounts.find(a=>a.id===e.accountId)?.name||'Deleted account'}}</td><td>{{e.note}}</td><td>{{e.kind}}</td><td>{{format(e.amountMinor,accounts.find(a=>a.id===e.accountId)?.currency)}}</td><td><button class="small danger" @click="removeEntry(e.id)">Delete</button></td></tr>
 </tbody></table></div></section>
 </template><div class="alert" role="alert" v-if="error">{{error}}</div>
 <footer>This is an MVP, not the complete original MoneyMatter. Back up important records regularly.</footer></main>`
};
createApp(App).mount('#app');
