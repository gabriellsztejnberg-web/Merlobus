
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Package, 
  LogOut, 
  CheckCircle,
  BarChart3,
  Search,
  Plus,
  ArrowUpRight,
  Factory,
  AlertCircle,
  BrainCircuit,
  Loader2,
  User,
  Save,
  History,
  Layers,
  ArrowRight,
  Calculator,
  Settings,
  Database,
  Trash2,
  Wifi,
  WifiOff,
  Key,
  Link,
  ShieldCheck,
  Server,
  RefreshCw,
  Download,
  Cloud,
  FileUp,
  Filter,
  ArrowUpDown,
  X,
  Menu
} from 'lucide-react';
import { 
  ViewType, 
  Product, 
  RawMaterial, 
  Recipe, 
  ProductionOrder, 
  Movement, 
  UserProfile 
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
  
  // Supabase Config
  const [supaConfig, setSupaConfig] = useState({
    url: localStorage.getItem(K.SUPA_URL) || '',
    key: localStorage.getItem(K.SUPA_KEY) || ''
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

  // Inicializar Cliente Supabase
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
            setConnectionError("URL o Key inválidos");
          });
      } catch (e) {
        setSupabase(null);
        setIsOnline(false);
        setConnectionError("Error crítico de inicialización");
      }
    } else {
      setSupabase(null);
      setIsOnline(false);
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

    if (supabase && isOnline) {
      const timer = setTimeout(async () => {
        try {
          await supabase.from('products').upsert(products);
          await supabase.from('mps').upsert(mps);
        } catch (e) {}
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [products, mps, recipes, orders, loading, isOnline, supabase]);

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
        <Card className="w-full max-w-md p-8 shadow-2xl bg-white/90 glass-effect rounded-[2.5rem] border-none">
          <div className="flex justify-center mb-8">
            <div className="bg-[#2B3860] p-6 rounded-[2rem] shadow-xl ring-8 ring-blue-50/50">
              <Package className="text-white w-12 h-12" />
            </div>
          </div>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-black text-[#2B3860] tracking-tight">Merlobus Pro</h1>
            <p className="text-slate-400 mt-2 font-bold uppercase text-[10px] tracking-[0.3em]">Sistema de Gestión de Planta</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ficha de Ingreso</label>
              <Input autoFocus placeholder="Tu Nombre o ID" value={tempName} onChange={e => setTempName(e.target.value)} className="text-lg py-5 rounded-2xl border-slate-200 focus:ring-blue-600" />
            </div>
            <Button type="submit" className="w-full py-5 text-lg shadow-blue-200 shadow-xl rounded-2xl bg-[#2B3860]" disabled={!tempName.trim()} icon={ArrowRight}>Acceder al Sistema</Button>
          </form>
          <div className="mt-10 pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
             <div className="flex items-center gap-2">
               {isOnline ? <Badge type="ok" text="Conectado" /> : <Badge type="warn" text="Offline" />}
             </div>
             {connectionError && <p className="text-[8px] text-red-500 font-bold text-center mt-2 max-w-[200px]">{connectionError}</p>}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <header className="h-16 md:h-20 bg-white border-b border-slate-200 sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 md:hidden hover:bg-slate-100 rounded-lg text-[#2B3860]"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 md:gap-4">
            <div className="bg-[#2B3860] p-2 rounded-xl shadow-lg shrink-0">
              <Package className="text-white w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="hidden xs:block">
              <span className="font-black text-base md:text-xl text-[#2B3860] tracking-tighter uppercase block leading-none">MERLOBUS</span>
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest mt-1 block">Industrial</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-6">
          <div className={`flex items-center gap-1.5 md:gap-2.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl border transition-all ${isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
            {isOnline ? <Wifi size={14} className="text-emerald-500" /> : <WifiOff size={14} />}
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em]">{isOnline ? 'Cloud' : 'Offline'}</span>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 pl-2 pr-3 py-1.5 md:px-5 md:py-2.5 rounded-xl md:rounded-2xl">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[10px] md:text-xs shrink-0">
              {user.name[0].toUpperCase()}
            </div>
            <span className="hidden sm:block text-xs md:text-sm font-black text-slate-700 truncate max-w-[80px]">{user.name}</span>
          </div>
          <button 
            onClick={() => {setUser(null); localStorage.removeItem(K.USER)}} 
            className="text-slate-400 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-xl"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        <aside className={`
          fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-100 flex flex-col z-50 transition-transform duration-300 transform
          md:relative md:translate-x-0 md:w-24 lg:w-72 shadow-2xl md:shadow-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className="flex items-center justify-between p-6 md:hidden">
            <span className="font-black text-slate-800">MENÚ SISTEMA</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 bg-slate-100 rounded-lg"><X size={20} /></button>
          </div>
          
          <nav className="flex-1 p-4 md:p-6 space-y-2">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  key={tab.id} 
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }} 
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${isActive ? 'bg-[#2B3860] text-white shadow-xl shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="md:hidden lg:block font-bold text-sm tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          
          <div className="p-6">
            <button 
              onClick={() => { setIsAiLoading(true); getAIInventoryAdvice(products, mps).then(setAiAdvice).finally(()=>setIsAiLoading(false)) }} 
              disabled={isAiLoading} 
              className="w-full bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-800 text-white p-5 rounded-[1.5rem] shadow-xl hover:scale-[1.02] transition-all flex flex-col items-center gap-3 group border-b-4 border-indigo-900"
            >
              {isAiLoading ? <Loader2 className="animate-spin" size={28} /> : <BrainCircuit className="group-hover:rotate-12 transition-transform" size={28} />}
              <span className="md:hidden lg:block text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Consultar IA</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-12 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto pb-20 md:pb-0">
            {activeTab === ViewType.DASHBOARD && <Dashboard products={products} mps={mps} history={history} orders={orders} aiAdvice={aiAdvice} onGetAi={() => { setIsAiLoading(true); getAIInventoryAdvice(products, mps).then(setAiAdvice).finally(()=>setIsAiLoading(false)) }} isAiLoading={isAiLoading} />}
            {activeTab === ViewType.OPERATIONS && <Operations products={products} mps={mps} recipes={recipes} orders={orders} user={user} setOrders={setOrders} setProducts={setProducts} setMps={setMps} logMovement={logMovement} />}
            {activeTab === ViewType.PRODUCTS && <InventoryManager type="products" data={products} setData={setProducts} logMovement={logMovement} />}
            {activeTab === ViewType.RAW_MATERIALS && <InventoryManager type="mps" data={mps} setData={setMps} logMovement={logMovement} />}
            {activeTab === ViewType.RECIPES && <RecipeManager products={products} mps={mps} recipes={recipes} setRecipes={setRecipes} />}
            {activeTab === ViewType.PLANNING && <Planning products={products} mps={mps} recipes={recipes} />}
            {activeTab === ViewType.REPORTS && (
              <DataManagement 
                products={products} 
                mps={mps} 
                recipes={recipes} 
                orders={orders}
                history={history} 
                setProducts={setProducts} 
                setMps={setMps} 
                setRecipes={setRecipes} 
                setHistory={setHistory} 
                isOnline={isOnline} 
                loadData={loadData}
                supaConfig={supaConfig}
                setSupaConfig={setSupaConfig}
                connectionError={connectionError}
              />
            )}
            {activeTab === ViewType.HISTORY && <HistoryView history={history} />}
          </div>
        </main>
      </div>
    </div>
  );
};

const Dashboard: React.FC<any> = ({ products, mps, history, orders, aiAdvice, onGetAi, isAiLoading }) => {
  const chartData = useMemo(() => products.slice(0, 10).map(p => ({ name: p.sku.split('-').pop(), stock: p.stock, wip: p.wip || 0 })), [products]);
  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <SectionHeader title="Visión General" subtitle="Estado del inventario y producción real." />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
        <StatCard title="Listos" value={products.reduce((acc:any, p:any) => acc + p.stock, 0)} icon={Package} color="blue" trend="+12%" />
        <StatCard title="En Curso" value={products.reduce((acc:any, p:any) => acc + (p.wip || 0), 0)} icon={Factory} color="amber" trend="Lotes" />
        <StatCard title="Insumos" value={mps.reduce((acc:any, m:any) => acc + m.stock, 0)} icon={Layers} color="emerald" trend="Stock" />
        <StatCard title="Crítico" value={products.filter((p:any) => p.stock <= p.min).length} icon={AlertCircle} color="red" trend="Atención" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        <Card className="lg:col-span-2 p-4 md:p-8 shadow-xl border-none bg-white rounded-[1.5rem] md:rounded-[2rem]">
          <div className="flex justify-between items-center mb-6 md:mb-10 text-slate-800">
            <h3 className="font-black flex items-center gap-3 text-sm md:text-base">
              <BarChart3 size={24} className="text-blue-600" /> Niveles de Stock
            </h3>
            <Badge type="info" text="Top 10" />
          </div>
          <div className="h-64 md:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontWeight: 700}} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}} 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', padding: '12px' }} 
                />
                <Bar dataKey="stock" name="Stock" stackId="a" fill="#2B3860" radius={[0, 0, 0, 0]} barSize={20} />
                <Bar dataKey="wip" name="WIP" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        
        <Card className="p-6 md:p-8 bg-[#2B3860] text-white shadow-2xl border-none rounded-[1.5rem] md:rounded-[2rem] relative overflow-hidden">
          <div className="absolute top-[-20px] right-[-20px] opacity-10 rotate-12 hidden md:block"><BrainCircuit size={150} /></div>
          <h3 className="font-black text-lg md:text-xl mb-6 md:mb-8 flex items-center gap-3 relative z-10 text-blue-400">Consejos IA</h3>
          <div className="space-y-4 relative z-10">
            {aiAdvice.map((a:any, i:any) => (
              <div key={i} className="bg-white/10 backdrop-blur-md p-4 md:p-5 rounded-2xl text-[11px] md:text-xs font-bold border border-white/10 shadow-lg leading-relaxed text-blue-50">
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[9px] mb-2">{i+1}</div>
                {a}
              </div>
            ))}
            {aiAdvice.length === 0 && (
              <div className="py-10 text-center">
                <p className="text-xs text-blue-200/50 font-bold mb-6 italic">IA sin analizar...</p>
                <Button onClick={onGetAi} disabled={isAiLoading} variant="special" className="w-full py-4 rounded-xl bg-blue-500 hover:bg-blue-400" icon={BrainCircuit}>Analizar Planta</Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatCard: React.FC<any> = ({ title, value, icon: Icon, color, trend }) => {
  const colors:any = { 
    blue: 'text-blue-600 bg-blue-50 border-blue-100', 
    amber: 'text-amber-600 bg-amber-50 border-amber-100', 
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100', 
    red: 'text-red-600 bg-red-50 border-red-100' 
  };
  return (
    <Card className="p-5 flex flex-col gap-3 hover:translate-y-[-2px] transition-all border-none shadow-lg bg-white rounded-2xl md:rounded-3xl">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl ${colors[color]} border shadow-sm`}>
          <Icon size={20} />
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{trend}</span>
      </div>
      <div>
        <h4 className="text-slate-400 text-[9px] font-black uppercase tracking-[0.1em] mb-0.5">{title}</h4>
        <p className="text-2xl md:text-3xl font-black text-[#2B3860] leading-none">{value}</p>
      </div>
    </Card>
  );
};

const Operations: React.FC<any> = ({ products, mps, recipes, orders, user, setOrders, setProducts, setMps, logMovement }) => {
  const [mode, setMode] = useState<'prod' | 'ingress'>('prod');
  const [selectedProd, setSelectedProd] = useState('');
  const [selectedMp, setSelectedMp] = useState('');
  const [qty, setQty] = useState(1);
  
  const handleStartProd = () => {
    const product = products.find((p:any) => p.id === selectedProd);
    const ingredients = recipes.filter((r:any) => r.prodId === selectedProd);
    if (!product || ingredients.length === 0) return alert("Producto sin receta definida.");
    for (const ing of ingredients) {
      const mp = mps.find((m:any) => m.id === ing.mpId);
      if (!mp || mp.stock < (ing.qty * qty)) return alert(`Falta material: ${mp?.desc}.`);
    }
    setMps(mps.map((m:any) => { const ing = ingredients.find(i => i.mpId === m.id); return ing ? { ...m, stock: m.stock - (ing.qty * qty) } : m; }));
    setProducts(products.map((p:any) => p.id === selectedProd ? { ...p, wip: (p.wip || 0) + qty } : p));
    const newOrder: ProductionOrder = { id: Math.random().toString(36).substr(2, 9), prodId: selectedProd, productName: `${product.marca} ${product.modelo}`, qty, status: 'in_progress', startedAt: new Date().toISOString(), startedBy: user.name };
    setOrders([newOrder, ...orders]);
    logMovement('PRODUCCION', `Lanzó ${qty}u de ${newOrder.productName}`);
    setSelectedProd(''); setQty(1);
  };

  const handleFinish = (order: ProductionOrder) => {
    setProducts(products.map((p:any) => p.id === order.prodId ? { ...p, wip: Math.max(0, (p.wip || 0) - order.qty), stock: p.stock + order.qty } : p));
    setOrders(orders.filter((o:any) => o.id !== order.id));
    logMovement('PRODUCTO_TERMINADO', `Finalizó ${order.qty}u de ${order.productName}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 animate-in fade-in duration-500">
      <Card className="p-6 md:p-10 border-none shadow-2xl bg-white rounded-[1.5rem] md:rounded-[2.5rem]">
        <div className="flex gap-2 md:gap-4 mb-8 md:mb-10 p-1 bg-slate-100 rounded-xl md:rounded-2xl">
          <button onClick={() => setMode('prod')} className={`flex-1 py-3 md:py-4 text-[9px] md:text-[10px] font-black rounded-lg md:rounded-xl transition-all tracking-widest ${mode==='prod' ? 'bg-[#2B3860] text-white shadow-lg' : 'text-slate-500'}`}>PRODUCCIÓN</button>
          <button onClick={() => setMode('ingress')} className={`flex-1 py-3 md:py-4 text-[9px] md:text-[10px] font-black rounded-lg md:rounded-xl transition-all tracking-widest ${mode==='ingress' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>RECIBO MP</button>
        </div>
        
        <div className="space-y-6 md:space-y-8">
          {mode === 'prod' ? (
            <>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Seleccionar Producto</label>
                <select className="w-full p-4 md:p-5 border-slate-200 border rounded-xl md:rounded-2xl bg-slate-50 font-black text-slate-800 text-sm outline-none" value={selectedProd} onChange={e => setSelectedProd(e.target.value)}>
                  <option value="">Buscar Modelo...</option>
                  {products.map((p:any) => <option key={p.id} value={p.id}>{p.sku} | {p.marca} {p.modelo}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 text-center block">Cantidad a Fabricar</label>
                <Input type="number" value={qty} min={1} onChange={e => setQty(Number(e.target.value))} className="text-4xl md:text-5xl font-black py-6 md:py-8 text-center bg-slate-50 border-none rounded-[1.5rem] md:rounded-3xl" />
              </div>
              <Button onClick={handleStartProd} variant="primary" className="w-full py-5 md:py-6 text-base md:text-lg font-black rounded-xl md:rounded-2xl shadow-xl shadow-blue-100" icon={Factory}>Comenzar Fabricación</Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400">Seleccionar Insumo</label>
                <select className="w-full p-4 md:p-5 border-slate-200 border rounded-xl md:rounded-2xl bg-slate-50 font-black text-slate-800 text-sm outline-none" value={selectedMp} onChange={e => setSelectedMp(e.target.value)}>
                  <option value="">Buscar Material...</option>
                  {mps.map((m:any) => <option key={m.id} value={m.id}>{m.sku} | {m.desc}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-400 text-center block">Cantidad Ingresante</label>
                <Input type="number" value={qty} min={1} onChange={e => setQty(Number(e.target.value))} className="text-4xl md:text-5xl font-black py-6 md:py-8 text-center bg-slate-50 border-none rounded-[1.5rem] md:rounded-3xl" />
              </div>
              <Button onClick={() => { if (!selectedMp) return; setMps(mps.map((m:any) => m.id === selectedMp ? { ...m, stock: m.stock + qty } : m)); logMovement('INGRESO_INSUMO', `Recibió ${qty}u`); setSelectedMp(''); setQty(1); }} variant="success" className="w-full py-5 md:py-6 text-base md:text-lg font-black rounded-xl md:rounded-2xl shadow-xl shadow-emerald-100" icon={ArrowUpRight}>Registrar Ingreso</Button>
            </>
          )}
        </div>
      </Card>
      
      <Card className="flex flex-col border-none shadow-2xl bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
        <div className="p-5 md:p-8 bg-slate-50 border-b flex justify-between items-center text-slate-800">
          <h3 className="font-black flex items-center gap-3 tracking-tighter uppercase text-xs md:text-sm">
            <Loader2 className="animate-spin text-amber-500" size={20} /> Línea Activa
          </h3>
          <Badge type="process" text={`${orders.length} en cola`} />
        </div>
        <div className="p-4 md:p-8 space-y-4 md:space-y-6 flex-1 overflow-y-auto max-h-[500px] md:max-h-[600px]">
          {orders.map((o:any) => (
            <div key={o.id} className="p-5 md:p-8 bg-slate-50 rounded-2xl md:rounded-3xl border border-slate-200 relative overflow-hidden group hover:border-blue-400 transition-all">
              <div className="absolute top-0 left-0 w-2 md:w-3 h-full bg-amber-400"></div>
              <div className="flex justify-between items-start mb-4 md:mb-6">
                <div>
                  <h4 className="font-black text-lg md:text-xl text-[#2B3860] mb-1 md:mb-2">{o.productName}</h4>
                  <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <span className="flex items-center gap-1"><User size={12} /> {o.startedBy}</span>
                    <span className="flex items-center gap-1"><History size={12} /> {new Date(o.startedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-3xl md:text-4xl font-black text-amber-600 block leading-none">{o.qty}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase">u.</span>
                </div>
              </div>
              <Button onClick={() => handleFinish(o)} variant="success" className="w-full py-3 md:py-4 text-[10px] font-black rounded-xl" icon={CheckCircle}>Terminar</Button>
            </div>
          ))}
          {orders.length === 0 && <div className="h-full flex flex-col items-center justify-center py-20 opacity-20"><Factory size={64} className="mb-4" /><p className="font-black uppercase tracking-[0.2em] text-xs">Sin actividad</p></div>}
        </div>
      </Card>
    </div>
  );
};

const InventoryManager: React.FC<any> = ({ type, data, setData, logMovement }) => {
  const isProd = type === 'products';
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState<any>({ sku: '', brand: '', model: '', desc: '', min: 5, stock: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'ok'>('all');
  const [sortField, setSortField] = useState<string>('sku');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleUpdate = (id: string, field: string, val: any) => setData(data.map((i:any) => i.id === id ? { ...i, [field]: isNaN(Number(val)) ? val : Number(val) } : i));

  const filteredData = useMemo(() => {
    let result = [...data];
    if (searchTerm) {
      const lowSearch = searchTerm.toLowerCase();
      result = result.filter(item => item.sku.toLowerCase().includes(lowSearch) || (isProd ? `${item.marca} ${item.modelo}`.toLowerCase().includes(lowSearch) : item.desc.toLowerCase().includes(lowSearch)));
    }
    if (statusFilter === 'critical') result = result.filter(item => item.stock <= item.min);
    else if (statusFilter === 'ok') result = result.filter(item => item.stock > item.min);
    result.sort((a, b) => {
      let valA = a[sortField]; let valB = b[sortField];
      if (sortField === 'detail') { valA = isProd ? `${a.marca} ${a.modelo}` : a.desc; valB = isProd ? `${b.marca} ${b.modelo}` : b.desc; }
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [data, searchTerm, statusFilter, sortField, sortOrder, isProd]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <SectionHeader 
        title={isProd ? 'Catálogo Espejos' : 'Insumos'} 
        action={<Button onClick={() => setShowForm(!showForm)} icon={Plus} className="rounded-xl px-4 py-3 text-xs md:px-6 md:py-4 md:text-sm">{showForm ? 'Cerrar' : 'Nuevo'}</Button>} 
      />

      <Card className="p-4 md:p-6 border-none shadow-lg bg-white rounded-2xl md:rounded-3xl mb-4 md:mb-8">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-center">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              className="w-full pl-11 pr-10 py-3.5 bg-slate-50 border border-slate-100 rounded-xl md:rounded-2xl outline-none focus:border-blue-400 font-bold text-slate-600 text-sm placeholder:text-slate-300" 
              placeholder="Buscar..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl shrink-0 w-full md:w-auto">
            {['all', 'critical', 'ok'].map(f => (
              <button key={f} onClick={() => setStatusFilter(f as any)} className={`flex-1 md:flex-none px-4 py-2.5 text-[9px] font-black rounded-lg transition-all ${statusFilter === f ? 'bg-[#2B3860] text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'}`}>{f.toUpperCase()}</button>
            ))}
          </div>
        </div>
      </Card>

      {showForm && (
        <Card className="p-6 md:p-8 border-none shadow-2xl bg-[#2B3860] text-white rounded-[1.5rem] md:rounded-[2rem] space-y-6 animate-in zoom-in-95 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-blue-300">SKU</label>
              <Input placeholder="Código" value={newItem.sku} onChange={e=>setNewItem({...newItem, sku: e.target.value})} className="bg-white/10 border-none text-white py-4 font-bold" />
            </div>
            {isProd ? (
              <>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-blue-300">Marca</label>
                  <Input placeholder="Marca" value={newItem.brand} onChange={e=>setNewItem({...newItem, brand: e.target.value})} className="bg-white/10 border-none text-white py-4 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-blue-300">Modelo</label>
                  <Input placeholder="Modelo" value={newItem.model} onChange={e=>setNewItem({...newItem, model: e.target.value})} className="bg-white/10 border-none text-white py-4 font-bold" />
                </div>
              </>
            ) : (
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black uppercase text-blue-300">Descripción</label>
                <Input placeholder="Detalle técnico" value={newItem.desc} onChange={e=>setNewItem({...newItem, desc: e.target.value})} className="bg-white/10 border-none text-white py-4 font-bold" />
              </div>
            )}
          </div>
          <Button onClick={()=>{setData([...data, {...newItem, id: Math.random().toString(36).substr(2, 9), wip: 0, marca: newItem.brand, modelo: newItem.model}]); setShowForm(false); logMovement('NUEVO_ITEM', `Agregó ${newItem.sku}`); }} variant="success" className="w-full py-4 rounded-xl shadow-lg font-black" icon={Save}>Guardar Ítem</Button>
        </Card>
      )}

      <div className="md:hidden space-y-4">
        {filteredData.map((item:any) => (
          <Card key={item.id} className="p-4 bg-white border-none shadow-md rounded-2xl">
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[9px] font-mono text-slate-400 block">{item.sku}</span>
                <h4 className="font-black text-[#2B3860]">{isProd ? `${item.marca} ${item.modelo}` : item.desc}</h4>
              </div>
              {item.stock <= item.min && <Badge type="danger" text="Stock Bajo" />}
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-3">
              <div>
                <label className="text-[8px] font-black text-slate-400 uppercase">Stock Actual</label>
                <input 
                  type="number" 
                  className={`w-full text-center font-black rounded-lg p-2 text-lg mt-1 outline-none ${item.stock <= item.min ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`} 
                  value={item.stock} 
                  onChange={e=>handleUpdate(item.id, 'stock', e.target.value)} 
                />
              </div>
              {isProd ? (
                <div>
                  <label className="text-[8px] font-black text-slate-400 uppercase">En Planta</label>
                  <div className="w-full text-center font-black rounded-lg p-2 text-lg mt-1 bg-amber-50 text-amber-600 border border-amber-100">
                    {item.wip || 0}
                  </div>
                </div>
              ) : (
                 <div className="flex items-end">
                    <button onClick={() => { if(confirm("¿Eliminar?")) setData(data.filter((i:any)=>i.id !== item.id)) }} className="w-full p-2 text-red-500 bg-red-50 rounded-lg flex justify-center"><Trash2 size={16} /></button>
                 </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="hidden md:block overflow-hidden border-none shadow-2xl bg-white rounded-[2rem]">
        <table className="w-full text-left font-bold text-slate-700">
          <thead className="bg-[#2B3860] text-white text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-8 py-6 cursor-pointer" onClick={() => toggleSort('sku')}>Código <ArrowUpDown size={10} className="inline ml-1" /></th>
              <th className="px-8 py-6 cursor-pointer" onClick={() => toggleSort('detail')}>Detalle <ArrowUpDown size={10} className="inline ml-1" /></th>
              <th className="px-8 py-6 text-center cursor-pointer" onClick={() => toggleSort('stock')}>Stock <ArrowUpDown size={10} className="inline ml-1" /></th>
              {isProd && <th className="px-8 py-6 text-center text-amber-400">WIP</th>}
              <th className="px-8 py-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredData.map((item:any) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-8 py-6 font-mono text-xs text-slate-400">{item.sku}</td>
                <td className="px-8 py-6">{isProd ? `${item.marca} ${item.modelo}` : item.desc}</td>
                <td className="px-8 py-6 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <input 
                      type="number" 
                      className={`w-20 text-center font-black rounded-xl p-3 outline-none transition-all ${item.stock <= item.min ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600'}`} 
                      value={item.stock} 
                      onChange={e=>handleUpdate(item.id, 'stock', e.target.value)} 
                    />
                    {item.stock <= item.min && <AlertCircle className="text-red-500 animate-pulse" size={16} />}
                  </div>
                </td>
                {isProd && <td className="px-8 py-6 text-center font-black text-amber-600 bg-amber-50/30">{item.wip || 0}</td>}
                <td className="px-8 py-6 text-right">
                  <button onClick={() => { if(confirm("¿Eliminar?")) setData(data.filter((i:any)=>i.id !== item.id)) }} className="p-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button>
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
  const [selProdId, setSelProdId] = useState('');
  const [skuSearch, setSkuSearch] = useState('');
  const [selectedMpId, setSelectedMpId] = useState('');
  const [qty, setQty] = useState(1);

  const filteredProducts = useMemo(() => {
    if (!skuSearch) return products;
    return products.filter((p: any) => 
      p.sku.toLowerCase().includes(skuSearch.toLowerCase())
    );
  }, [products, skuSearch]);

  const currentRecipe = useMemo(() => recipes.filter((r:any) => r.prodId === selProdId), [recipes, selProdId]);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
      <div className="lg:col-span-5">
        <Card className="p-6 md:p-10 bg-[#2B3860] text-white shadow-2xl rounded-[1.5rem] md:rounded-[2.5rem] md:sticky md:top-32">
          <h3 className="font-black text-xl md:text-2xl mb-6 md:mb-8 flex items-center gap-3 text-blue-400">Diseño Receta</h3>
          <div className="space-y-6 md:space-y-8">
            <div className="space-y-3">
              <label className="text-[9px] font-black uppercase text-blue-300">Buscar Espejo (SKU)</label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/50" size={16} />
                <input 
                  className="w-full pl-11 pr-10 py-4 bg-white/10 border-none rounded-xl text-white font-bold text-sm placeholder:text-blue-300/30 outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" 
                  placeholder="Ej: ESP-MAR..." 
                  value={skuSearch}
                  onChange={e => setSkuSearch(e.target.value)}
                />
                {skuSearch && (
                  <button onClick={() => setSkuSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-blue-300">Seleccionar Resultado</label>
              <select 
                className="w-full p-4 md:p-5 bg-white/10 border-none rounded-xl md:rounded-2xl text-white font-black text-sm outline-none focus:ring-2 focus:ring-blue-500/50" 
                value={selProdId} 
                onChange={e => setSelProdId(e.target.value)}
              >
                <option value="" className="text-black">
                  {skuSearch ? `Resultados (${filteredProducts.length})` : 'Elegir del catálogo...'}
                </option>
                {filteredProducts.map((p:any) => (
                  <option key={p.id} value={p.id} className="text-black">
                    {p.sku} | {p.marca} {p.modelo}
                  </option>
                ))}
              </select>
            </div>

            {selProdId && (
              <div className="space-y-4 md:space-y-6 pt-6 border-t border-white/10 animate-in fade-in slide-in-from-top-2">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-blue-300">Material Requerido</label>
                  <select className="w-full p-4 bg-white/10 rounded-xl text-xs font-bold outline-none" value={selectedMpId} onChange={e=>setSelectedMpId(e.target.value)}>
                    <option value="" className="text-black">Elegir Insumo...</option>
                    {mps.map((m:any)=><option key={m.id} value={m.id} className="text-black">{m.desc}</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="w-24">
                    <label className="text-[9px] font-black text-blue-300 uppercase">Cantidad</label>
                    <Input type="number" step="0.1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="bg-white/10 border-none text-white text-center font-black py-4 text-lg" />
                  </div>
                  <Button onClick={() => { if(!selectedMpId) return; setRecipes([...recipes, {id: Math.random().toString(36).substr(2, 9), prodId: selProdId, mpId: selectedMpId, qty}]); setSelectedMpId(''); setQty(1); }} variant="special" className="flex-1 rounded-xl font-black bg-blue-500 shadow-xl" icon={Plus}>Vincular Insumo</Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
      <div className="lg:col-span-7">
        <Card className="min-h-[300px] md:min-h-[500px] shadow-2xl bg-white rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden">
          <div className="p-6 md:p-8 bg-slate-50 border-b flex items-center justify-between font-black uppercase text-[10px] md:text-xs text-slate-500">
            <span>Bill of Materials (BOM)</span>
            <Badge type="info" text="Ingeniería" />
          </div>
          <div className="p-6 md:p-10">
            {selProdId ? (
              <div className="space-y-4">
                <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-xl text-white"><Package size={20} /></div>
                  <div>
                    <h4 className="font-black text-[#2B3860]">
                      {products.find((p:any) => p.id === selProdId)?.marca} {products.find((p:any) => p.id === selProdId)?.modelo}
                    </h4>
                    <span className="text-[10px] font-mono text-blue-400 font-bold">{products.find((p:any) => p.id === selProdId)?.sku}</span>
                  </div>
                </div>
                {currentRecipe.map((r:any) => {
                  const mp = mps.find((m:any) => m.id === r.mpId);
                  return (
                    <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group">
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{mp?.desc}</span>
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">{mp?.sku}</span>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <span className="text-xl font-black text-[#2B3860] block leading-none">{r.qty}</span>
                          <span className="text-[8px] font-black text-slate-400 uppercase">UNIDADES</span>
                        </div>
                        <button onClick={()=>setRecipes(recipes.filter((x:any)=>x.id!==r.id))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  );
                })}
                {currentRecipe.length === 0 && <p className="text-center py-10 italic text-slate-400 text-sm">Sin materiales vinculados.</p>}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center py-20 opacity-20"><Settings size={64} className="mb-4" /><p className="font-black text-[10px] uppercase text-center">Seleccione un producto para ver receta</p></div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Planning: React.FC<any> = ({ products, mps, recipes }) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);
  const needed = recipes.filter((r:any) => r.prodId === sel).map((r:any) => ({ mp: mps.find((m:any) => m.id === r.mpId), req: r.qty * qty }));
  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-500">
      <Card className="p-6 md:p-10 bg-[#2B3860] text-white flex flex-col md:flex-row gap-6 md:gap-8 items-end rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl">
        <div className="flex-1 space-y-2 w-full">
          <label className="text-[9px] font-black uppercase text-blue-400">Simulador de Producción</label>
          <select className="w-full p-4 md:p-6 bg-white/10 rounded-xl md:rounded-2xl text-white font-black outline-none text-base md:text-lg" value={sel} onChange={e => setSel(e.target.value)}>
            <option value="" className="text-black">Seleccionar Modelo...</option>
            {products.map((p:any) => <option key={p.id} value={p.id} className="text-black">{p.sku} | {p.marca}</option>)}
          </select>
        </div>
        <div className="w-full md:w-40 space-y-2">
          <label className="text-[9px] font-black uppercase text-blue-400 text-center block">Cant. Lote</label>
          <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} className="bg-white/10 border-none text-white font-black text-2xl md:text-3xl text-center h-16 md:h-20 rounded-xl md:rounded-2xl" />
        </div>
      </Card>
      
      <Card className="overflow-hidden shadow-2xl rounded-[1.5rem] md:rounded-[2.5rem] bg-white">
        <div className="p-6 md:p-10 bg-slate-50 border-b flex items-center gap-4 font-black uppercase text-xs md:text-sm text-slate-800">
          <Calculator className="text-blue-600" size={24} /> Explosión de Materiales
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-bold text-slate-700">
            <thead>
              <tr className="bg-white text-[9px] md:text-[10px] font-black uppercase text-slate-400 border-b">
                <th className="px-6 md:px-10 py-4 md:py-6">Insumo</th>
                <th className="px-6 md:px-10 py-4 md:py-6 text-center">Req.</th>
                <th className="px-6 md:px-10 py-4 md:py-6 text-center">Factibilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {needed.map((n:any, i:any) => (
                <tr key={i} className="hover:bg-slate-50/50">
                  <td className="px-6 md:px-10 py-6 md:py-8">
                    <span className="font-black text-[#2B3860] block">{n.mp?.desc}</span>
                    <span className="text-[8px] font-black text-slate-400">Stock: {n.mp?.stock || 0}</span>
                  </td>
                  <td className="px-6 md:px-10 py-6 md:py-8 text-center font-black text-indigo-600 text-2xl md:text-3xl">{n.req}</td>
                  <td className="px-6 md:px-10 py-6 md:py-8 text-center">
                    {(n.mp?.stock || 0) >= n.req ? (
                      <Badge type="ok" text="LISTO" />
                    ) : (
                      <Badge type="danger" text={`FALTA ${Math.ceil(n.req - (n.mp?.stock || 0))}`} />
                    )}
                  </td>
                </tr>
              ))}
              {needed.length === 0 && <tr><td colSpan={3} className="text-center py-20 opacity-20"><Calculator size={48} className="mx-auto mb-2" /><p className="font-black uppercase text-[10px]">Inicie simulación</p></td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const DataManagement: React.FC<any> = ({ products, mps, recipes, history, setProducts, setMps, setRecipes, setHistory, isOnline, loadData, supaConfig, setSupaConfig, connectionError }) => {
  const [syncing, setSyncing] = useState(false);
  const [localConfig, setLocalConfig] = useState(supaConfig);

  const saveConfig = () => {
    localStorage.setItem(K.SUPA_URL, localConfig.url);
    localStorage.setItem(K.SUPA_KEY, localConfig.key);
    setSupaConfig(localConfig);
    alert("Credenciales guardadas.");
  };

  const handlePushToCloud = async () => {
    if (!isOnline) return alert("Offline.");
    if (!confirm("Esto reemplazará los datos en la nube. ¿Seguro?")) return;
    setSyncing(true);
    try {
      const client = createClient(supaConfig.url, supaConfig.key);
      await client.from('products').delete().neq('id', '0');
      await client.from('products').insert(products);
      await client.from('mps').delete().neq('id', '0');
      await client.from('mps').insert(mps);
      await client.from('recipes').delete().neq('id', '0');
      await client.from('recipes').insert(recipes);
      await client.from('history').delete().neq('id', '0');
      await client.from('history').insert(history);
      alert("Sincronización exitosa.");
    } catch (e) { alert("Error al subir."); }
    setSyncing(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 animate-in zoom-in-95 duration-500">
      <SectionHeader title="Sincronización Cloud" subtitle="Gestión de base de datos remota." />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-2 p-6 md:p-10 border-none shadow-2xl bg-white rounded-[1.5rem] md:rounded-[2.5rem]">
          <div className="flex justify-between items-start mb-8">
            <div className="flex gap-4">
              <div className="bg-slate-100 p-3 md:p-5 rounded-2xl text-slate-400"><Key size={24} /></div>
              <div>
                <h3 className="font-black text-lg md:text-xl text-[#2B3860]">Supabase Auth</h3>
                <p className="text-[10px] text-slate-500">Conectividad centralizada.</p>
              </div>
            </div>
            <Badge type={isOnline ? 'ok' : 'danger'} text={isOnline ? 'ONLINE' : 'OFFLINE'} />
          </div>
          
          <div className="space-y-4 md:space-y-6">
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Project URL</label>
                <input className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold" value={localConfig.url} onChange={e=>setLocalConfig({...localConfig, url: e.target.value})} />
             </div>
             <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Anon Key</label>
                <input type="password" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-bold" value={localConfig.key} onChange={e=>setLocalConfig({...localConfig, key: e.target.value})} />
             </div>
             <Button onClick={saveConfig} variant="primary" className="w-full py-4 shadow-xl font-black rounded-xl" icon={Save}>Guardar Configuración</Button>
          </div>
        </Card>

        <Card className="p-6 md:p-10 bg-gradient-to-br from-[#2B3860] to-indigo-900 text-white border-none shadow-2xl rounded-[1.5rem] md:rounded-[2.5rem]">
           <Server className="text-blue-300 mb-6" size={32} />
           <h3 className="font-black text-lg md:text-xl mb-4">Estado Sistema</h3>
           <p className="text-[11px] text-blue-100/70 mb-8">Esta app está preparada para trabajo cooperativo mediante Supabase.</p>
           <div className="pt-6 border-t border-white/10">
              <p className="text-[9px] uppercase font-black tracking-widest text-blue-400">Motor de IA</p>
              <div className="flex items-center gap-2 mt-2">
                 {process.env.API_KEY ? <Badge type="ok" text="Gemini Pro Ready" /> : <Badge type="danger" text="IA Off" />}
              </div>
           </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
        <Card className="p-6 md:p-10 border-none shadow-2xl bg-white rounded-[1.5rem] md:rounded-[2.5rem]">
          <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2"><Cloud className="text-emerald-500" /> Sincronizar</h3>
          <div className="space-y-4">
             <Button onClick={handlePushToCloud} disabled={syncing || !isOnline} variant="success" className="w-full py-4 md:py-5 font-black rounded-xl md:rounded-2xl" icon={RefreshCw}>{syncing ? 'Procesando...' : 'Empujar datos a Nube'}</Button>
             <Button onClick={() => { if(confirm("¿Descargar?")) loadData(true); }} disabled={!isOnline} variant="secondary" className="w-full py-4 md:py-5 font-black rounded-xl md:rounded-2xl" icon={Download}>Bajar datos de Nube</Button>
          </div>
        </Card>
        
        <Card className="p-6 md:p-10 border-none shadow-2xl bg-slate-100 rounded-[1.5rem] md:rounded-[2.5rem]">
          <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2"><Database className="text-amber-500" /> Backups</h3>
          <div className="space-y-4">
             <Button onClick={() => {
                const b = { products, mps, recipes, history };
                const blob = new Blob([JSON.stringify(b, null, 2)], { type: 'application/json' });
                const u = URL.createObjectURL(blob);
                const a = document.createElement('a'); a.href = u; a.download = `backup_${new Date().toISOString().slice(0,10)}.json`; a.click();
             }} variant="secondary" className="w-full py-4 md:py-5 font-black rounded-xl md:rounded-2xl" icon={FileUp}>Exportar Archivo JSON</Button>
             <Button onClick={() => { if(confirm("¿Resetear?")) { localStorage.clear(); window.location.reload(); } }} variant="danger" className="w-full py-4 md:py-5 font-black rounded-xl md:rounded-2xl" icon={Trash2}>Borrar Memoria Local</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const HistoryView: React.FC<any> = ({ history }) => (
  <Card className="overflow-hidden shadow-2xl rounded-[1.5rem] md:rounded-[2.5rem] border-none bg-white">
    <div className="p-6 md:p-8 bg-slate-50/50 border-b flex items-center gap-4">
      <History className="text-blue-600" size={24} />
      <h3 className="font-black text-slate-800 text-lg md:text-xl uppercase">Bitácora de Planta</h3>
    </div>
    
    <div className="md:hidden divide-y divide-slate-50">
      {history.map((h:any) => (
        <div key={h.id} className="p-5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{h.tipo}</span>
            <span className="text-[9px] font-mono text-slate-400">{new Date(h.ts).toLocaleTimeString()}</span>
          </div>
          <p className="text-xs font-bold text-slate-700 italic">"{h.detalle}"</p>
          <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase">
             <User size={10} /> {h.user}
          </div>
        </div>
      ))}
    </div>

    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-left font-bold text-slate-700">
        <thead className="bg-[#2B3860] text-white text-[10px] font-black uppercase tracking-widest">
          <tr>
            <th className="px-8 py-6">Fecha</th>
            <th className="px-8 py-6">Evento</th>
            <th className="px-8 py-6">Detalle</th>
            <th className="px-8 py-6 text-right">Operario</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.map((h:any) => (
            <tr key={h.id} className="text-sm hover:bg-slate-50 transition-colors">
              <td className="px-8 py-5 font-mono text-slate-400 text-xs">{new Date(h.ts).toLocaleString()}</td>
              <td className="px-8 py-5 font-black text-blue-600 uppercase text-xs">{h.tipo}</td>
              <td className="px-8 py-5 italic text-slate-600">"{h.detalle}"</td>
              <td className="px-8 py-5 text-right font-black text-slate-900 uppercase text-xs">{h.user}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </Card>
);

export default App;
