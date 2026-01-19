import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Package, LogOut, CheckCircle, BarChart3, Search, Plus, ArrowUpRight, 
  Factory, AlertCircle, BrainCircuit, Loader2, User, Save, History, 
  Layers, ArrowRight, Calculator, Settings, Database, Trash2, Wifi, 
  WifiOff, Key, Link, ShieldCheck, Server, RefreshCw, Download, 
  Cloud, FileUp, Filter, ArrowUpDown, X, Menu, Globe, Code2 
} from 'lucide-react';
import { 
  ViewType, Product, RawMaterial, Recipe, ProductionOrder, Movement, UserProfile 
} from './types';
import { TABS, INITIAL_CATALOG } from './constants';
import { Card, Button, Input, Badge, SectionHeader } from './components/UI';
import { getAIInventoryAdvice } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const K = {
  PRODUCTS: 'mb_prods_v3',
  MPS: 'mb_mps_v3',
  RECIPES: 'mb_recipes_v3',
  ORDERS: 'mb_orders_v3',
  HISTORY: 'mb_history_v3',
  USER: 'mb_user_v3',
  SUPA_URL: 'mb_supa_url',
  SUPA_KEY: 'mb_supa_key'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewType>(ViewType.DASHBOARD);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tempName, setTempName] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sopabase Config - Detecta automáticamente si vienen de Netlify
  const [supaConfig, setSupaConfig] = useState({
    url: (window as any).VITE__SUPABASE_DATABASE_URL || localStorage.getItem(K.SUPA_URL) || '',
    key: (window as any).VITE__SUPABASE_ANON_KEY || localStorage.getItem(K.SUPA_KEY) || ''
  });
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [mps, setMps] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const [aiAdvice, setAiAdvice] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (supaConfig.url && supaConfig.key) {
      try {
        const client = createClient(supaConfig.url, supaConfig.key);
        setSupabase(client);
        client.from('products').select('count', { count: 'exact', head: true })
          .then(({ error }) => {
            if (error) {
              setIsOnline(false);
              setConnectionError(error.message);
            } else {
              setIsOnline(true);
              setConnectionError(null);
            }
          })
          .catch(() => {
            setIsOnline(false);
          });
      } catch (e) {
        setSupabase(null);
        setIsOnline(false);
      }
    }
  }, [supaConfig]);

  const loadData = useCallback(async (forceCloud = false) => {
    setLoading(true);
    let success = false;

    if (supabase && (isOnline || forceCloud)) {
      try {
        const { data: p, error: pe } = await supabase.from('products').select('*');
        if (!pe) {
          const { data: m } = await supabase.from('mps').select('*');
          const { data: r } = await supabase.from('recipes').select('*');
          const { data: o } = await supabase.from('orders').select('*');
          const { data: h } = await supabase.from('history').select('*').order('ts', { ascending: false }).limit(100);
          
          if (p && p.length > 0) {
            setProducts(p);
            setMps(m || []);
            setRecipes(r || []);
            setOrders(o || []);
            setHistory(h || []);
            success = true;
          }
        }
      } catch (e) { console.warn("Cloud load failed, using local."); }
    }

    if (!success && !forceCloud) {
      const storedProds = localStorage.getItem(K.PRODUCTS);
      const storedMps = localStorage.getItem(K.MPS);
      const storedRecipes = localStorage.getItem(K.RECIPES);
      const storedOrders = localStorage.getItem(K.ORDERS);
      const storedHistory = localStorage.getItem(K.HISTORY);

      if (storedProds) setProducts(JSON.parse(storedProds));
      else setProducts(INITIAL_CATALOG.map(p => ({ ...p, id: Math.random().toString(36).substr(2, 9), wip: 0 })));
      
      if (storedMps) setMps(JSON.parse(storedMps));
      if (storedRecipes) setRecipes(JSON.parse(storedRecipes));
      if (storedOrders) setOrders(JSON.parse(storedOrders));
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    }

    const storedUser = localStorage.getItem(K.USER);
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, [supabase, isOnline]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem(K.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(K.MPS, JSON.stringify(mps));
    localStorage.setItem(K.RECIPES, JSON.stringify(recipes));
    localStorage.setItem(K.ORDERS, JSON.stringify(orders));
    localStorage.setItem(K.HISTORY, JSON.stringify(history));
  }, [products, mps, recipes, orders, loading]);

  const logMovement = useCallback(async (tipo: string, detalle: string) => {
    const newMov: Movement = {
      id: Math.random().toString(36).substr(2, 9),
      ts: new Date().toISOString(),
      tipo,
      detalle,
      user: user?.name || 'Sistema'
    };
    setHistory(prev => [newMov, ...prev].slice(0, 100));
    if (supabase && isOnline) {
      await supabase.from('history').insert([newMov]);
    }
  }, [user, isOnline, supabase]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      const newUser: UserProfile = { name: tempName, role: 'admin' };
      setUser(newUser);
      localStorage.setItem(K.USER, JSON.stringify(newUser));
      logMovement('LOGIN', `Ingreso de operario`);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl bg-white/90 rounded-[2.5rem] border-none">
          <div className="flex justify-center mb-8">
            <div className="bg-[#2B3860] p-6 rounded-[2rem] shadow-xl">
              <Package className="text-white w-12 h-12" />
            </div>
          </div>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-[#2B3860]">Merlobus Pro</h1>
            <p className="text-slate-400 mt-2 font-bold uppercase text-[10px]">Gestión de Planta</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input autoFocus placeholder="Nombre de Operario" value={tempName} onChange={e => setTempName(e.target.value)} />
            <Button type="submit" className="w-full py-4" disabled={!tempName.trim()} icon={ArrowRight}>Entrar</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#2B3860] p-2 rounded-xl text-white"><Package size={24} /></div>
          <div><span className="font-black text-xl text-[#2B3860]">MERLOBUS</span></div>
        </div>
        <div className="flex items-center gap-4">
          <Badge type={isOnline ? 'ok' : 'warn'} text={isOnline ? 'Cloud' : 'Offline'} />
          <button onClick={() => {setUser(null); localStorage.removeItem(K.USER)}} className="p-2 text-slate-400 hover:text-red-500"><LogOut /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-24 lg:w-72 bg-white border-r p-6 flex flex-col gap-2">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all ${isActive ? 'bg-[#2B3860] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                <Icon size={22} />
                <span className="hidden lg:block font-bold text-sm">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="flex-1 overflow-y-auto p-12">
          {activeTab === ViewType.DASHBOARD && <Dashboard products={products} mps={mps} aiAdvice={aiAdvice} onGetAi={() => { setIsAiLoading(true); getAIInventoryAdvice(products, mps).then(setAiAdvice).finally(()=>setIsAiLoading(false)) }} isAiLoading={isAiLoading} />}
          {activeTab === ViewType.OPERATIONS && <Operations products={products} mps={mps} recipes={recipes} orders={orders} user={user} setOrders={setOrders} setProducts={setProducts} setMps={setMps} logMovement={logMovement} />}
          {activeTab === ViewType.PRODUCTS && <InventoryManager type="products" data={products} setData={setProducts} logMovement={logMovement} />}
          {activeTab === ViewType.RAW_MATERIALS && <InventoryManager type="mps" data={mps} setData={setMps} logMovement={logMovement} />}
          {activeTab === ViewType.RECIPES && <RecipeManager products={products} mps={mps} recipes={recipes} setRecipes={setRecipes} />}
          {activeTab === ViewType.PLANNING && <Planning products={products} mps={mps} recipes={recipes} />}
          {activeTab === ViewType.REPORTS && <DataManagement products={products} mps={mps} recipes={recipes} history={history} isOnline={isOnline} supaConfig={supaConfig} setSupaConfig={setSupaConfig} loadData={loadData} />}
          {activeTab === ViewType.HISTORY && <HistoryView history={history} />}
        </main>
      </div>
    </div>
  );
};

const Dashboard: React.FC<any> = ({ products, mps, aiAdvice, onGetAi, isAiLoading }) => (
  <div className="space-y-10">
    <SectionHeader title="Panel de Control" />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      <StatCard title="Total Espejos" value={products.reduce((acc:any, p:any) => acc + p.stock, 0)} icon={Package} color="blue" />
      <StatCard title="Insumos" value={mps.reduce((acc:any, m:any) => acc + m.stock, 0)} icon={Layers} color="emerald" />
      <StatCard title="Stock Bajo" value={products.filter((p:any) => p.stock <= p.min).length} icon={AlertCircle} color="red" />
      <Button onClick={onGetAi} disabled={isAiLoading} variant="special" icon={BrainCircuit}>{isAiLoading ? 'Analizando...' : 'Consultar IA'}</Button>
    </div>
    {aiAdvice.length > 0 && (
      <Card className="p-8 bg-[#2B3860] text-white">
        <h3 className="font-bold text-xl mb-4">Consejos de Producción (IA)</h3>
        <ul className="space-y-2">
          {aiAdvice.map((a:string, i:number) => <li key={i} className="bg-white/10 p-4 rounded-xl">• {a}</li>)}
        </ul>
      </Card>
    )}
  </div>
);

const StatCard: React.FC<any> = ({ title, value, icon: Icon, color }) => (
  <Card className="p-6 flex items-center gap-6">
    <div className={`p-4 rounded-2xl bg-${color}-50 text-${color}-600`}><Icon size={32} /></div>
    <div>
      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{title}</p>
      <p className="text-3xl font-black text-[#2B3860]">{value}</p>
    </div>
  </Card>
);

const Operations: React.FC<any> = ({ products, mps, recipes, orders, user, setOrders, setProducts, setMps, logMovement }) => {
  const [selectedProd, setSelectedProd] = useState('');
  const [qty, setQty] = useState(1);

  const handleStart = () => {
    const product = products.find((p:any) => p.id === selectedProd);
    const ingredients = recipes.filter((r:any) => r.prodId === selectedProd);
    if (!product) return;
    setProducts(products.map((p:any) => p.id === selectedProd ? { ...p, wip: (p.wip || 0) + qty } : p));
    setOrders([{ id: Math.random().toString(36).substr(2,9), productName: `${product.marca} ${product.modelo}`, qty, startedAt: new Date(), startedBy: user.name, prodId: selectedProd }, ...orders]);
    logMovement('PRODUCCION', `Lanzó ${qty}u de ${product.sku}`);
  };

  return (
    <div className="grid grid-cols-2 gap-10">
      <Card className="p-10 space-y-8">
        <h3 className="font-black text-xl">Lanzar Producción</h3>
        <select className="w-full p-4 border rounded-xl" value={selectedProd} onChange={e=>setSelectedProd(e.target.value)}>
          <option value="">Seleccionar Producto...</option>
          {products.map((p:any) => <option key={p.id} value={p.id}>{p.sku} | {p.marca}</option>)}
        </select>
        <Input type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} />
        <Button onClick={handleStart} className="w-full py-4" icon={Factory}>Comenzar Lote</Button>
      </Card>
      <Card className="p-10">
        <h3 className="font-black text-xl mb-6">Órdenes en Curso</h3>
        <div className="space-y-4">
          {orders.map((o:any) => (
            <div key={o.id} className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold">{o.productName}</p>
                <p className="text-xs text-slate-400">Cant: {o.qty} | {o.startedBy}</p>
              </div>
              <Button onClick={() => {
                setProducts(products.map((p:any) => p.id === o.prodId ? { ...p, stock: p.stock + o.qty, wip: Math.max(0, p.wip - o.qty) } : p));
                setOrders(orders.filter((x:any)=>x.id !== o.id));
                logMovement('FIN_PROD', `Terminó ${o.qty}u`);
              }} variant="success">Finalizar</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const InventoryManager: React.FC<any> = ({ type, data, setData, logMovement }) => {
  const isProd = type === 'products';
  return (
    <div className="space-y-6">
      <SectionHeader title={isProd ? "Espejos Terminados" : "Materias Primas"} />
      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="p-6">Código / SKU</th>
              <th className="p-6">Detalle</th>
              <th className="p-6 text-center">Stock</th>
              {isProd && <th className="p-6 text-center">WIP</th>}
              <th className="p-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.map((item:any) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-6 font-mono text-xs">{item.sku}</td>
                <td className="p-6">{isProd ? `${item.marca} ${item.modelo}` : item.desc}</td>
                <td className="p-6 text-center">
                  <input type="number" className="w-20 text-center p-2 border rounded-lg font-bold" value={item.stock} onChange={e => setData(data.map((d:any)=>d.id === item.id ? {...d, stock: Number(e.target.value)} : d))} />
                </td>
                {isProd && <td className="p-6 text-center font-bold text-amber-600">{item.wip || 0}</td>}
                <td className="p-6 text-right">
                  {item.stock <= item.min && <Badge type="danger" text="Stock Bajo" />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const RecipeManager: React.FC<any> = ({ products, mps, recipes, setRecipes }) => {
  const [sel, setSel] = useState('');
  return (
    <div className="grid grid-cols-12 gap-10">
      <Card className="col-span-4 p-8 h-fit">
        <h3 className="font-bold mb-4">Seleccionar Producto</h3>
        <select className="w-full p-4 border rounded-xl mb-4" value={sel} onChange={e=>setSel(e.target.value)}>
          <option value="">Elegir espejo...</option>
          {products.map((p:any)=><option key={p.id} value={p.id}>{p.sku}</option>)}
        </select>
      </Card>
      <Card className="col-span-8 p-8 min-h-[400px]">
        <h3 className="font-bold mb-4">Receta / Materiales</h3>
        {sel ? (
           <div className="space-y-2">
             {recipes.filter((r:any)=>r.prodId === sel).map((r:any) => (
               <div key={r.id} className="p-4 bg-slate-50 rounded-xl flex justify-between">
                 <span>{mps.find((m:any)=>m.id === r.mpId)?.desc}</span>
                 <span className="font-bold">{r.qty} u.</span>
               </div>
             ))}
             <p className="text-center py-10 text-slate-400 italic">Lógica de edición simplificada.</p>
           </div>
        ) : <p className="text-center py-20 opacity-30">Seleccione un producto</p>}
      </Card>
    </div>
  );
};

const Planning: React.FC<any> = ({ products, mps, recipes }) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);
  const needed = recipes.filter((r:any)=>r.prodId === sel).map((r:any)=>({ mp: mps.find((m:any)=>m.id === r.mpId), req: r.qty * qty }));
  return (
    <div className="space-y-10">
      <Card className="p-8 flex gap-4 items-end bg-[#2B3860] text-white">
        <div className="flex-1">
          <label className="text-xs uppercase font-bold text-blue-300">Modelo a fabricar</label>
          <select className="w-full p-4 border-none bg-white/10 rounded-xl mt-2 text-white" value={sel} onChange={e=>setSel(e.target.value)}>
            <option value="" className="text-black">Seleccionar...</option>
            {products.map((p:any)=><option key={p.id} value={p.id} className="text-black">{p.sku}</option>)}
          </select>
        </div>
        <div className="w-32">
          <label className="text-xs uppercase font-bold text-blue-300">Cantidad</label>
          <Input type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} className="bg-white/10 text-white border-none mt-2" />
        </div>
      </Card>
      <Card className="p-8">
        <h3 className="font-bold mb-6">Explosión de Materiales</h3>
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase">
              <th className="pb-4">Material</th>
              <th className="pb-4">Necesario</th>
              <th className="pb-4">Stock Actual</th>
              <th className="pb-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {needed.map((n:any, i:number)=>(
              <tr key={i} className="border-t">
                <td className="py-4">{n.mp?.desc}</td>
                <td className="py-4 font-bold">{n.req}</td>
                <td className="py-4">{n.mp?.stock}</td>
                <td className="py-4">{n.mp?.stock >= n.req ? <Badge type="ok" text="OK" /> : <Badge type="danger" text="FALTA" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const DataManagement: React.FC<any> = ({ isOnline, supaConfig, setSupaConfig, loadData }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <SectionHeader title="Sincronización Cloud" />
      <Card className="p-10 space-y-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Globe /></div>
          <h3 className="font-bold text-xl">Configuración Supabase</h3>
        </div>
        <div className="space-y-4">
          <Input placeholder="Supabase URL" value={supaConfig.url} onChange={e=>setSupaConfig({...supaConfig, url: e.target.value})} />
          <Input type="password" placeholder="Anon Public Key" value={supaConfig.key} onChange={e=>setSupaConfig({...supaConfig, key: e.target.value})} />
          <Button onClick={() => {
            localStorage.setItem(K.SUPA_URL, supaConfig.url);
            localStorage.setItem(K.SUPA_KEY, supaConfig.key);
            window.location.reload();
          }} className="w-full">Guardar y Reconectar</Button>
        </div>
      </Card>
      <Card className="p-10 bg-slate-100">
        <h3 className="font-bold mb-4">Estado de Conexión</h3>
        <div className="flex items-center gap-2">
          {isOnline ? <Badge type="ok" text="Online" /> : <Badge type="danger" text="Offline" />}
          <span className="text-xs text-slate-500">{isOnline ? 'Conectado a Supabase' : 'Usando almacenamiento local'}</span>
        </div>
      </Card>
    </div>
  );
};

const HistoryView: React.FC<any> = ({ history }) => (
  <Card className="overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-[#2B3860] text-white text-[10px] font-black uppercase">
        <tr>
          <th className="p-6">Fecha</th>
          <th className="p-6">Evento</th>
          <th className="p-6">Detalle</th>
          <th className="p-6 text-right">Operario</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {history.map((h:any) => (
          <tr key={h.id} className="text-sm">
            <td className="p-6 font-mono text-slate-400">{new Date(h.ts).toLocaleString()}</td>
            <td className="p-6 font-bold text-blue-600 uppercase">{h.tipo}</td>
            <td className="p-6 italic">"{h.detalle}"</td>
            <td className="p-6 text-right font-black uppercase">{h.user}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);

export default App;
