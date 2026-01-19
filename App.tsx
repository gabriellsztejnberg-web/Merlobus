import React, { useState, useEffect, useCallback } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { 
  Package, LogOut, Factory, AlertCircle, BrainCircuit, Loader2, 
  ArrowRight, Layers, Globe, History, LayoutDashboard, Calculator,
  Settings
} from 'lucide-react';
import { 
  ViewType, Product, RawMaterial, Recipe, ProductionOrder, Movement, UserProfile 
} from './types';
import { TABS, INITIAL_CATALOG } from './constants';
import { Card, Button, Input, Badge, SectionHeader } from './components/UI';
import { getAIInventoryAdvice } from './services/geminiService';

// CREDENCIALES HARDCODEADAS
const SUPABASE_URL = "https://ackljuztzpklddssbovs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFja2xqdXp0enBrbGRkc3Nib3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODQ3OTUsImV4cCI6MjA4NDM2MDc5NX0.Rf7HFaLikmKelpikr_3CiQsfzjS5sHp3T-HTv75XXyE";

const K = {
  PRODUCTS: 'mb_prods_v3',
  MPS: 'mb_mps_v3',
  RECIPES: 'mb_recipes_v3',
  ORDERS: 'mb_orders_v3',
  HISTORY: 'mb_history_v3',
  USER: 'mb_user_v3'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewType>(ViewType.DASHBOARD);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tempName, setTempName] = useState('');
  
  const [supabase] = useState(() => createClient(SUPABASE_URL, SUPABASE_KEY));
  const [isOnline, setIsOnline] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [mps, setMps] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);

  const [aiAdvice, setAiAdvice] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Verificar conexión
  useEffect(() => {
    supabase.from('products').select('count', { count: 'exact', head: true })
      .then(({ error }) => setIsOnline(!error))
      .catch(() => setIsOnline(false));
  }, [supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    let cloudSuccess = false;

    if (isOnline) {
      try {
        const { data: p } = await supabase.from('products').select('*');
        if (p && p.length > 0) {
          const { data: m } = await supabase.from('mps').select('*');
          const { data: r } = await supabase.from('recipes').select('*');
          const { data: o } = await supabase.from('orders').select('*');
          const { data: h } = await supabase.from('history').select('*').order('ts', { ascending: false }).limit(50);
          
          setProducts(p);
          setMps(m || []);
          setRecipes(r || []);
          setOrders(o || []);
          setHistory(h || []);
          cloudSuccess = true;
        }
      } catch (e) { console.error(e); }
    }

    if (!cloudSuccess) {
      const storedProds = localStorage.getItem(K.PRODUCTS);
      if (storedProds) setProducts(JSON.parse(storedProds));
      else setProducts(INITIAL_CATALOG.map(p => ({ ...p, id: Math.random().toString(36).substr(2, 9), wip: 0 })));
      
      const storedMps = localStorage.getItem(K.MPS);
      if (storedMps) setMps(JSON.parse(storedMps));
      
      const storedRecipes = localStorage.getItem(K.RECIPES);
      if (storedRecipes) setRecipes(JSON.parse(storedRecipes));

      const storedHistory = localStorage.getItem(K.HISTORY);
      if (storedHistory) setHistory(JSON.parse(storedHistory));
    }

    const storedUser = localStorage.getItem(K.USER);
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, [supabase, isOnline]);

  useEffect(() => { loadData(); }, [loadData]);

  const logMovement = useCallback(async (tipo: string, detalle: string) => {
    const newMov = {
      id: Math.random().toString(36).substr(2, 9),
      ts: new Date().toISOString(),
      tipo,
      detalle,
      user: user?.name || 'Sistema'
    };
    setHistory(prev => [newMov, ...prev].slice(0, 50));
    if (isOnline) await supabase.from('history').insert([newMov]);
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
        <Card className="w-full max-w-md p-8 shadow-2xl bg-white/90 rounded-[2.5rem]">
          <div className="text-center mb-10">
            <div className="bg-[#2B3860] w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl">
              <Package className="text-white w-10 h-10" />
            </div>
            <h1 className="text-3xl font-black text-[#2B3860]">Merlobus Pro</h1>
            <Badge type={isOnline ? 'ok' : 'danger'} text={isOnline ? 'Cloud Ready' : 'Local Mode'} />
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
          <span className="font-black text-xl text-[#2B3860]">MERLOBUS</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge type={isOnline ? 'ok' : 'warn'} text={isOnline ? 'Conectado' : 'Sin Nube'} />
          <button onClick={() => {setUser(null); localStorage.removeItem(K.USER)}} className="p-2 text-slate-400 hover:text-red-500"><LogOut /></button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-24 lg:w-64 bg-white border-r p-4 flex flex-col gap-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === tab.id ? 'bg-[#2B3860] text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon size={20} />
              <span className="hidden lg:block font-bold text-sm">{tab.label}</span>
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-8 lg:p-12">
          {activeTab === ViewType.DASHBOARD && (
            <div className="space-y-8">
              <SectionHeader title="Dashboard" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                  <p className="text-slate-400 text-xs font-bold uppercase">Espejos en Stock</p>
                  <p className="text-4xl font-black text-[#2B3860]">{products.reduce((a, b) => a + b.stock, 0)}</p>
                </Card>
                <Card className="p-6">
                  <p className="text-slate-400 text-xs font-bold uppercase">Insumos Críticos</p>
                  <p className="text-4xl font-black text-red-500">{mps.filter(m => m.stock <= m.min).length}</p>
                </Card>
                <Button onClick={() => { setIsAiLoading(true); getAIInventoryAdvice(products, mps).then(setAiAdvice).finally(()=>setIsAiLoading(false)) }} disabled={isAiLoading} variant="special" icon={BrainCircuit}>
                  {isAiLoading ? 'Analizando...' : 'IA: Consejos'}
                </Button>
              </div>
              {aiAdvice.length > 0 && (
                <Card className="p-6 bg-indigo-50 border-indigo-100">
                  <h3 className="font-bold text-indigo-900 mb-3">Recomendaciones de IA</h3>
                  <ul className="space-y-2">
                    {aiAdvice.map((a, i) => <li key={i} className="text-sm text-indigo-700 font-medium">• {a}</li>)}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {activeTab === ViewType.PRODUCTS && <InventoryTable data={products} type="products" />}
          {activeTab === ViewType.RAW_MATERIALS && <InventoryTable data={mps} type="mps" />}
          
          {activeTab === ViewType.REPORTS && (
            <Card className="p-8 max-w-xl mx-auto text-center space-y-6">
              <Globe className="mx-auto text-blue-600" size={48} />
              <h2 className="text-2xl font-bold">Estado de la Nube</h2>
              <div className="p-4 bg-slate-50 rounded-xl font-mono text-xs break-all">
                URL: {SUPABASE_URL}
              </div>
              <Badge type={isOnline ? 'ok' : 'danger'} text={isOnline ? "CONEXIÓN ACTIVA" : "ERROR DE CONEXIÓN"} />
              <Button onClick={() => window.location.reload()} className="w-full">Sincronizar ahora</Button>
            </Card>
          )}

          {activeTab === ViewType.HISTORY && (
            <Card className="overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-black uppercase text-slate-400">
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Evento</th>
                    <th className="p-4">Operario</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map(h => (
                    <tr key={h.id} className="text-xs hover:bg-slate-50">
                      <td className="p-4 font-mono">{new Date(h.ts).toLocaleString()}</td>
                      <td className="p-4 font-bold text-blue-700">{h.tipo}: <span className="text-slate-600 font-normal italic">{h.detalle}</span></td>
                      <td className="p-4 font-black uppercase">{h.user}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

const InventoryTable = ({ data, type }: { data: any[], type: string }) => (
  <Card className="overflow-hidden">
    <table className="w-full text-left">
      <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
        <tr>
          <th className="p-6">SKU / Código</th>
          <th className="p-6">Detalle</th>
          <th className="p-6 text-center">Stock</th>
          <th className="p-6">Estado</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {data.map(item => (
          <tr key={item.id} className="hover:bg-slate-50">
            <td className="p-6 font-mono text-xs">{item.sku}</td>
            <td className="p-6 text-sm">{type === 'products' ? `${item.marca} ${item.modelo} (${item.lado})` : item.desc}</td>
            <td className="p-6 text-center font-black text-lg">{item.stock}</td>
            <td className="p-6">
              {item.stock <= item.min ? <Badge type="danger" text="Stock Bajo" /> : <Badge type="ok" text="Normal" />}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);

export default App;
