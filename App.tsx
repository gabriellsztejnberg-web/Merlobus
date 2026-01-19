
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Package, 
  LogOut, 
  UserCircle, 
  CheckCircle,
  BarChart3,
  Search,
  Plus,
  ArrowUpRight,
  TrendingDown,
  Factory,
  AlertCircle,
  BrainCircuit,
  Loader2,
  User,
  Save,
  History,
  Layers,
  ArrowRight
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
import { TABS, INITIAL_CATALOG, INITIAL_MPS } from './constants';
import { Card, Button, Input, Badge, SectionHeader } from './components/UI';
import { getAIInventoryAdvice } from './services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const K = {
  PRODUCTS: 'mb_prods_v2',
  MPS: 'mb_mps_v2',
  RECIPES: 'mb_recipes_v2',
  ORDERS: 'mb_orders_v2',
  HISTORY: 'mb_history_v2',
  USER: 'mb_user_v2'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewType>(ViewType.DASHBOARD);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tempName, setTempName] = useState('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [mps, setMps] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [aiAdvice, setAiAdvice] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const load = () => {
      const storedProds = localStorage.getItem(K.PRODUCTS);
      const storedMps = localStorage.getItem(K.MPS);
      const storedRecipes = localStorage.getItem(K.RECIPES);
      const storedOrders = localStorage.getItem(K.ORDERS);
      const storedHistory = localStorage.getItem(K.HISTORY);
      const storedUser = localStorage.getItem(K.USER);

      if (storedProds) setProducts(JSON.parse(storedProds));
      else setProducts(INITIAL_CATALOG.map(p => ({ ...p, id: Math.random().toString(36).substr(2, 9) })));

      if (storedMps) setMps(JSON.parse(storedMps));
      else setMps(INITIAL_MPS.map(m => ({ ...m, id: Math.random().toString(36).substr(2, 9) })));

      if (storedRecipes) setRecipes(JSON.parse(storedRecipes));
      else if (!storedProds) {
        // Crear una receta por defecto si es la primera vez para testear
        setTimeout(() => {
          setRecipes((prev) => {
            if (prev.length > 0) return prev;
            // Usar IDs reales de los estados actuales
            const pId = products[0]?.id || 'p1';
            const mId = mps[0]?.id || 'm1';
            return [{ id: 'rec-test', prodId: pId, mpId: mId, qty: 1 }];
          });
        }, 500);
      }

      if (storedOrders) setOrders(JSON.parse(storedOrders));
      if (storedHistory) setHistory(JSON.parse(storedHistory));
      if (storedUser) setUser(JSON.parse(storedUser));

      setLoading(false);
    };
    load();
  }, [loading]);

  useEffect(() => { if (!loading) localStorage.setItem(K.PRODUCTS, JSON.stringify(products)); }, [products, loading]);
  useEffect(() => { if (!loading) localStorage.setItem(K.MPS, JSON.stringify(mps)); }, [mps, loading]);
  useEffect(() => { if (!loading) localStorage.setItem(K.RECIPES, JSON.stringify(recipes)); }, [recipes, loading]);
  useEffect(() => { if (!loading) localStorage.setItem(K.ORDERS, JSON.stringify(orders)); }, [orders, loading]);
  useEffect(() => { if (!loading) localStorage.setItem(K.HISTORY, JSON.stringify(history)); }, [history, loading]);
  useEffect(() => { if (user) localStorage.setItem(K.USER, JSON.stringify(user)); else localStorage.removeItem(K.USER); }, [user]);

  const logMovement = useCallback((tipo: string, detalle: string) => {
    const newMov: Movement = {
      id: Math.random().toString(36).substr(2, 9),
      ts: new Date().toISOString(),
      tipo,
      detalle,
      user: user?.name || 'Sistema'
    };
    setHistory(prev => [newMov, ...prev].slice(0, 100));
  }, [user]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setUser({ name: tempName, role: 'admin' });
      logMovement('LOGIN', `Ingreso de ${tempName}`);
    }
  };

  const getAiInsights = async () => {
    setIsAiLoading(true);
    const advice = await getAIInventoryAdvice(products, mps);
    setAiAdvice(advice);
    setIsAiLoading(false);
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-8 shadow-2xl bg-white/90 glass-effect">
          <div className="flex justify-center mb-6">
            <div className="bg-[#2B3860] p-5 rounded-3xl shadow-lg ring-8 ring-blue-50">
              <Package className="text-white w-10 h-10" />
            </div>
          </div>
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#2B3860]">Merlobus Stock</h1>
            <p className="text-slate-500 mt-2 font-medium italic">Gestión de Producción de Espejos</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              autoFocus 
              placeholder="Nombre del Operador" 
              value={tempName} 
              onChange={e => setTempName(e.target.value)} 
              className="text-lg py-4" 
            />
            <Button type="submit" className="w-full py-4 text-lg" disabled={!tempName.trim()} icon={CheckCircle}>Entrar al Sistema</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="text-blue-600 w-6 h-6" />
          <span className="font-bold text-xl text-[#2B3860]">Merlobus <span className="text-blue-600">PRO</span></span>
        </div>
        <div className="flex items-center gap-4">
          <Badge type="info" text={user.name} />
          <button onClick={() => setUser(null)} className="text-slate-400 hover:text-red-500 transition-colors"><LogOut size={20} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-20 md:w-64 bg-white border-r border-slate-200 flex flex-col z-20">
          <nav className="flex-1 p-4 space-y-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <Icon size={20} />
                  <span className="hidden md:block font-semibold text-sm">{tab.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="p-4"><Button onClick={getAiInsights} disabled={isAiLoading} className="w-full bg-indigo-600 text-white py-3 rounded-xl" icon={BrainCircuit}>{isAiLoading ? '...' : 'Asistente IA'}</Button></div>
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === ViewType.DASHBOARD && <Dashboard products={products} mps={mps} history={history} orders={orders} aiAdvice={aiAdvice} onGetAi={getAiInsights} isAiLoading={isAiLoading} />}
          {activeTab === ViewType.OPERATIONS && (
            <Operations 
              products={products} mps={mps} recipes={recipes} orders={orders} user={user} 
              setOrders={setOrders} setProducts={setProducts} setMps={setMps} logMovement={logMovement} 
              setErrorMsg={setErrorMsg} errorMsg={errorMsg}
            />
          )}
          {activeTab === ViewType.PRODUCTS && <InventoryManager type="products" data={products} orders={orders} setData={setProducts} logMovement={logMovement} />}
          {activeTab === ViewType.RAW_MATERIALS && <InventoryManager type="mps" data={mps} orders={[]} setData={setMps} logMovement={logMovement} />}
          {activeTab === ViewType.RECIPES && <RecipeManager products={products} mps={mps} recipes={recipes} setRecipes={setRecipes} />}
          {activeTab === ViewType.PLANNING && <Planning products={products} mps={mps} recipes={recipes} />}
          {activeTab === ViewType.HISTORY && <HistoryView history={history} />}
        </main>
      </div>
    </div>
  );
};

const Dashboard: React.FC<any> = ({ products, mps, history, orders, aiAdvice, onGetAi, isAiLoading }) => {
  const wipCount = orders.reduce((acc, o) => acc + o.qty, 0);
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <SectionHeader title="Estado de Planta" subtitle="Resumen ejecutivo del inventario y la producción actual." />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="En Stock Físico" value={products.reduce((acc, p) => acc + p.stock, 0)} icon={Package} color="blue" />
        <StatCard title="En Producción (WIP)" value={wipCount} icon={Factory} color="amber" />
        <StatCard title="Mat. Primas OK" value={mps.filter(m => m.stock > m.min).length} icon={Layers} color="emerald" />
        <StatCard title="Alertas Reposición" value={mps.filter(m => m.stock <= m.min).length} icon={AlertCircle} color="red" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2"><BrainCircuit className="text-indigo-600" /> Consejos de la IA para hoy</h3>
          <div className="space-y-4">
            {aiAdvice.length > 0 ? aiAdvice.map((a, i) => (
              <div key={i} className="p-4 bg-indigo-50 border-l-4 border-indigo-500 rounded-r-xl text-indigo-900 text-sm font-medium">{a}</div>
            )) : <div className="text-center py-10 text-slate-400 italic">Haz clic en 'Asistente IA' en el menú lateral para recibir recomendaciones basadas en tu stock.</div>}
          </div>
        </Card>
        <Card className="p-6 h-fit">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><History size={18} className="text-slate-400" /> Actividad Reciente</h3>
          <div className="space-y-3">
            {history.slice(0, 5).map(h => (
              <div key={h.id} className="text-xs border-b border-slate-100 pb-2">
                <span className="font-bold text-blue-600">{h.tipo}:</span> {h.detalle}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const StatCard: React.FC<any> = ({ title, value, icon: Icon, color }) => {
  const c = { blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600' };
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className={`p-4 rounded-2xl ${c[color]}`}><Icon size={24} /></div>
      <div><p className="text-slate-500 text-xs font-bold uppercase">{title}</p><p className="text-2xl font-black text-slate-900">{value}</p></div>
    </Card>
  );
};

const Operations: React.FC<any> = ({ products, mps, recipes, orders, user, setOrders, setProducts, setMps, logMovement, setErrorMsg, errorMsg }) => {
  const [selectedProd, setSelectedProd] = useState('');
  const [qty, setQty] = useState(1);

  const handleStartProd = () => {
    setErrorMsg(null);
    const prod = products.find(p => p.id === selectedProd);
    const recipe = recipes.filter(r => r.prodId === selectedProd);
    
    if (!prod) return setErrorMsg("Selecciona un producto.");
    if (recipe.length === 0) return setErrorMsg(`El producto ${prod.sku} no tiene una receta configurada.`);

    // Validar Stock
    for (const item of recipe) {
      const mp = mps.find(m => m.id === item.mpId);
      if (!mp || mp.stock < (item.qty * qty)) {
        return setErrorMsg(`Falta materia prima: ${mp?.desc || 'Desconocida'}. Stock actual: ${mp?.stock || 0}`);
      }
    }

    // Descontar MP
    setMps(prev => prev.map(m => {
      const ing = recipe.find(i => i.mpId === m.id);
      return ing ? { ...m, stock: m.stock - (ing.qty * qty) } : m;
    }));

    // Agregar a WIP
    const newOrder = {
      id: Math.random().toString(36).substr(2, 9),
      prodId: selectedProd,
      productName: `${prod.marca} ${prod.modelo}`,
      qty,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      startedBy: user.name
    };
    setOrders(prev => [newOrder, ...prev]);
    logMovement('PROD_INICIO', `Iniciada fabricación de ${qty}u de ${prod.sku}`);
    setSelectedProd('');
  };

  const handleFinish = (order: ProductionOrder) => {
    setProducts(prev => prev.map(p => p.id === order.prodId ? { ...p, stock: p.stock + order.qty } : p));
    setOrders(prev => prev.filter(o => o.id !== order.id));
    logMovement('PROD_FIN', `Ingresado a Stock Real: ${order.qty}u de ${order.productName}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><ArrowUpRight className="text-blue-600" /> Orden de Producción</h2>
        {errorMsg && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mb-4 border border-red-100 flex items-center gap-2"><AlertCircle size={16}/> {errorMsg}</div>}
        <div className="space-y-6">
          <div>
            <label className="text-xs font-black text-slate-500 uppercase block mb-1">Producto a Fabricar</label>
            <select className="w-full p-3 border rounded-xl bg-slate-50 font-bold" value={selectedProd} onChange={e => setSelectedProd(e.target.value)}>
              <option value="">Seleccionar...</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.sku} ({p.marca})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-500 uppercase block mb-1">Cantidad del Lote</label>
            <Input type="number" value={qty} min={1} onChange={e => setQty(Number(e.target.value))} className="text-lg py-3" />
          </div>
          <Button onClick={handleStartProd} className="w-full py-4 text-lg" variant="success" icon={Factory}>Comenzar Proceso de Planta</Button>
          <p className="text-[10px] text-slate-400 italic">Al iniciar, se descontarán automáticamente las piezas de Materia Prima según la receta.</p>
        </div>
      </Card>

      <Card className="flex flex-col">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Loader2 size={18} className="animate-spin text-amber-500" /> Línea de Producción (WIP)</h3>
          <Badge type="process" text={`${orders.length} LOTES`} />
        </div>
        <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
          {orders.length === 0 ? (
            <div className="text-center py-20 text-slate-300 italic">No hay órdenes en proceso de fabricación.</div>
          ) : orders.map(o => (
            <div key={o.id} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex justify-between items-center group hover:border-blue-300 transition-all">
              <div>
                <p className="font-black text-slate-900">{o.productName}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">{o.qty} Unidades • {new Date(o.startedAt).toLocaleTimeString()}</p>
              </div>
              <Button onClick={() => handleFinish(o)} variant="special" className="px-6 py-3" icon={CheckCircle}>Ingresar a Stock Real</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const InventoryManager: React.FC<any> = ({ type, data, orders, setData, logMovement }) => {
  const isProd = type === 'products';
  const [filter, setFilter] = useState('');
  
  const filtered = data.filter(i => (i.sku + (i.marca || '') + (i.desc || '')).toLowerCase().includes(filter.toLowerCase()));

  const getInWIP = (pId: string) => orders.filter(o => o.prodId === pId).reduce((acc, o) => acc + o.qty, 0);

  return (
    <div className="space-y-6">
      <SectionHeader title={isProd ? 'Stock de Productos Terminados' : 'Almacén de Materias Primas'} />
      <div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/><Input placeholder="Buscar por código o descripción..." className="pl-12 py-3 rounded-2xl" value={filter} onChange={e => setFilter(e.target.value)} /></div>
      <Card>
        <table className="w-full text-left">
          <thead className="bg-[#2B3860] text-white text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="px-6 py-4">Ficha / Código</th>
              <th className="px-6 py-4">Detalle</th>
              <th className="px-6 py-4 text-center">Stock Físico</th>
              {isProd && <th className="px-6 py-4 text-center text-amber-300 bg-slate-800">En Fabricación (WIP)</th>}
              <th className="px-6 py-4 text-center">Mínimo</th>
              <th className="px-6 py-4 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-400">{item.sku}</td>
                <td className="px-6 py-4 font-bold text-slate-700">{isProd ? `${item.marca} ${item.modelo} (${item.lado})` : item.desc}</td>
                <td className="px-6 py-4 text-center font-black text-lg text-slate-900">{item.stock}</td>
                {isProd && <td className="px-6 py-4 text-center font-black text-amber-600 bg-amber-50/30">{getInWIP(item.id)}</td>}
                <td className="px-6 py-4 text-center text-slate-400 font-bold">{item.min}</td>
                <td className="px-6 py-4 text-center">{item.stock <= item.min ? <Badge type="danger" text="PEDIR" /> : <Badge type="ok" text="OK" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const RecipeManager: React.FC<any> = ({ products, mps, recipes, setRecipes }) => {
  const [selProd, setSelProd] = useState('');
  const [selMp, setSelMp] = useState('');
  const [qty, setQty] = useState(1);
  const [projection, setProjection] = useState(1);

  const filtered = recipes.filter(r => r.prodId === selProd);

  const handleAdd = () => {
    if (!selProd || !selMp) return;
    setRecipes(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), prodId: selProd, mpId: selMp, qty }]);
    setSelMp('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <Card className="p-6 h-fit space-y-4">
        <h3 className="font-bold text-slate-800">Definir Receta</h3>
        <select className="w-full p-2 border rounded-lg font-bold" value={selProd} onChange={e => setSelProd(e.target.value)}>
          <option value="">Producto Final...</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.sku}</option>)}
        </select>
        <div className={`pt-4 border-t space-y-4 ${!selProd ? 'opacity-30 pointer-events-none' : ''}`}>
          <select className="w-full p-2 border rounded-lg" value={selMp} onChange={e => setSelMp(e.target.value)}>
            <option value="">Insumo...</option>
            {mps.map(m => <option key={m.id} value={m.id}>{m.desc}</option>)}
          </select>
          <div className="flex gap-2">
            <Input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} />
            <Button onClick={handleAdd} icon={Plus}>Añadir</Button>
          </div>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold">Composición de {products.find(p => p.id === selProd)?.sku || '...'}</h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Escalar Lote:</span>
            <Input type="number" className="w-20 py-1" value={projection} onChange={e => setProjection(Number(e.target.value))} />
          </div>
        </div>
        <table className="w-full text-left">
          <thead className="text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="px-6 py-4">Insumo</th>
              <th className="px-6 py-4 text-center">Unidad x1</th>
              <th className="px-6 py-4 text-center text-blue-600">Total Lote</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(r => (
              <tr key={r.id}>
                <td className="px-6 py-4 font-bold">{mps.find(m => m.id === r.mpId)?.desc}</td>
                <td className="px-6 py-4 text-center">{r.qty}</td>
                <td className="px-6 py-4 text-center font-black text-blue-600 text-lg">{r.qty * projection}</td>
                <td className="px-6 py-4 text-right"><button onClick={() => setRecipes(prev => prev.filter(x => x.id !== r.id))} className="text-red-300 hover:text-red-500"><LogOut size={16}/></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const Planning: React.FC<any> = ({ products, mps, recipes }) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);
  const needed = recipes.filter(r => r.prodId === sel).map(r => {
    const mp = mps.find(m => m.id === r.mpId);
    return { ...mp, req: r.qty * qty };
  });

  return (
    <div className="space-y-8">
      <SectionHeader title="Simulador de Escala" subtitle="Calcula cuánta materia prima necesitas antes de mandar a fabricar." />
      <div className="flex gap-4">
        <select className="p-3 border rounded-xl font-bold bg-white shadow-sm" value={sel} onChange={e => setSel(e.target.value)}>
          <option value="">Elegir Producto...</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.sku}</option>)}
        </select>
        <Input type="number" className="w-32 py-3" value={qty} onChange={e => setQty(Number(e.target.value))} />
      </div>
      <Card>
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr><th className="px-6 py-4">Insumo</th><th className="px-6 py-4 text-center">Requerido</th><th className="px-6 py-4 text-center">En Stock</th><th className="px-6 py-4 text-center">Estado</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {needed.map((n, i) => (
              <tr key={i}>
                <td className="px-6 py-4 font-bold">{n.desc}</td>
                <td className="px-6 py-4 text-center font-black">{n.req}</td>
                <td className="px-6 py-4 text-center">{n.stock}</td>
                <td className="px-6 py-4 text-center">{n.stock >= n.req ? <Badge type="ok" text="DISPONIBLE" /> : <Badge type="danger" text="FALTA" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const HistoryView: React.FC<any> = ({ history }) => (
  <Card>
    <table className="w-full text-left text-sm">
      <thead className="bg-[#2B3860] text-white uppercase text-[10px] font-black">
        <tr><th className="px-6 py-4">Hora</th><th className="px-6 py-4">Tipo</th><th className="px-6 py-4">Detalle</th><th className="px-6 py-4">Operador</th></tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {history.map(h => (
          <tr key={h.id}>
            <td className="px-6 py-4 font-mono text-xs">{new Date(h.ts).toLocaleTimeString()}</td>
            <td className="px-6 py-4"><Badge type="neutral" text={h.tipo} /></td>
            <td className="px-6 py-4 font-medium">{h.detalle}</td>
            <td className="px-6 py-4 italic text-slate-500">{h.user}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Card>
);

export default App;
