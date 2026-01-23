
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Package, LogOut, Factory, AlertCircle, BrainCircuit, Loader2, 
  ArrowRight, Layers, Globe, History, LayoutDashboard, Calculator,
  Settings, Save, Plus, Trash2, CheckCircle, Truck, ArrowUpRight, X, 
  ShoppingCart, Download, ClipboardCheck, FileUp, ListOrdered
} from 'lucide-react';
import { 
  ViewType, Product, RawMaterial, Recipe, ProductionOrder, Movement, UserProfile 
} from './types';
import { TABS, INITIAL_CATALOG } from './constants';
import { Card, Button, Input, Badge, SectionHeader } from './components/UI';
import { getAIInventoryAdvice } from './services/geminiService';

// CREDENCIALES FIJAS
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
  const [showAddProduct, setShowAddProduct] = useState(false);

  useEffect(() => {
    const checkConn = async () => {
      const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
      setIsOnline(!error);
    };
    checkConn();
  }, [supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    let cloudLoaded = false;

    if (isOnline) {
      try {
        const [pRes, mRes, rRes, oRes, hRes] = await Promise.all([
          supabase.from('products').select('*'),
          supabase.from('mps').select('*'),
          supabase.from('recipes').select('*'),
          supabase.from('orders').select('*').eq('status', 'in_progress'),
          supabase.from('history').select('*').order('ts', { ascending: false }).limit(50)
        ]);

        if (pRes.data && pRes.data.length > 0) {
          setProducts(pRes.data);
          setMps(mRes.data || []);
          setRecipes(rRes.data || []);
          setOrders(oRes.data || []);
          setHistory(hRes.data || []);
          cloudLoaded = true;
        }
      } catch (e) { console.error("Cloud load error:", e); }
    }

    if (!cloudLoaded) {
      const storedProds = localStorage.getItem(K.PRODUCTS);
      setProducts(storedProds ? JSON.parse(storedProds) : INITIAL_CATALOG.map((p, i) => ({ ...p, id: `p-${i}`, wip: 0 })));
      setMps(JSON.parse(localStorage.getItem(K.MPS) || '[]'));
      setRecipes(JSON.parse(localStorage.getItem(K.RECIPES) || '[]'));
      setHistory(JSON.parse(localStorage.getItem(K.HISTORY) || '[]'));
      setOrders(JSON.parse(localStorage.getItem(K.ORDERS) || '[]'));
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
  }, [products, mps, recipes, orders, history, loading]);

  const logMovement = useCallback(async (tipo: string, detalle: string) => {
    const newMov = { id: Math.random().toString(36).substr(2, 9), ts: new Date().toISOString(), tipo, detalle, user: user?.name || 'Sistema' };
    setHistory(prev => [newMov, ...prev].slice(0, 50));
    if (isOnline) await supabase.from('history').insert([newMov]);
  }, [user, isOnline, supabase]);

  const updateProductStock = async (id: string, newStock: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
    if (isOnline) await supabase.from('products').update({ stock: newStock }).eq('id', id);
  };

  const updateProductMin = async (id: string, newMin: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, min: newMin } : p));
    if (isOnline) await supabase.from('products').update({ min: newMin }).eq('id', id);
  };

  // Fix: Added missing updateMpStock function to update raw material stock levels
  const updateMpStock = async (id: string, newStock: number) => {
    setMps(prev => prev.map(m => m.id === id ? { ...m, stock: newStock } : m));
    if (isOnline) await supabase.from('mps').update({ stock: newStock }).eq('id', id);
  };

  // Fix: Added missing updateMpMin function to update raw material minimum stock levels
  const updateMpMin = async (id: string, newMin: number) => {
    setMps(prev => prev.map(m => m.id === id ? { ...m, min: newMin } : m));
    if (isOnline) await supabase.from('mps').update({ min: newMin }).eq('id', id);
  };

  const deleteProduct = async (id: string) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar el SKU ${prod.sku}?`)) return;

    setProducts(prev => prev.filter(p => p.id !== id));
    logMovement('ELIMINAR_SKU', `Se eliminó el producto ${prod.sku}`);
    if (isOnline) await supabase.from('products').delete().eq('id', id);
  };

  const handleAddProduct = async (data: Partial<Product>) => {
    const newProd: Product = {
      id: Math.random().toString(36).substr(2, 9),
      sku: data.sku || 'NUEVO-SKU',
      marca: data.marca || '-',
      modelo: data.modelo || '-',
      lado: data.lado || '-',
      min: data.min || 5,
      stock: data.stock || 0,
      wip: 0
    };
    setProducts(prev => [newProd, ...prev]);
    logMovement('NUEVO_SKU', `Se creó manualmente el SKU ${newProd.sku}`);
    if (isOnline) await supabase.from('products').insert([newProd]);
    setShowAddProduct(false);
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const newItems: Product[] = [];

      lines.forEach((line, i) => {
        if (i === 0 && line.toLowerCase().includes('sku')) return; // Header skip
        const cols = line.split(',');
        if (cols.length >= 2) {
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            sku: cols[0]?.trim() || 'CSV-SKU',
            marca: cols[1]?.trim() || '-',
            modelo: cols[2]?.trim() || '-',
            lado: cols[3]?.trim() || '-',
            min: Number(cols[4]) || 5,
            stock: Number(cols[5]) || 0,
            wip: 0
          });
        }
      });

      if (newItems.length > 0) {
        setProducts(prev => [...newItems, ...prev]);
        logMovement('CARGA_MASIVA', `Se cargaron ${newItems.length} SKUs vía CSV`);
        if (isOnline) await supabase.from('products').insert(newItems);
        alert(`Carga completada: ${newItems.length} productos añadidos.`);
      }
    };
    reader.readAsText(file);
  };

  const handleDispatch = async (id: string, qty: number) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    if (prod.stock < qty) {
      alert(`⚠️ ERROR: Stock insuficiente. Solo tienes ${prod.stock} unidades.`);
      return;
    }
    
    const newStock = prod.stock - qty;
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
    logMovement('DESPACHO', `Se despacharon ${qty}u de ${prod.sku}`);
    if (isOnline) await supabase.from('products').update({ stock: newStock }).eq('id', id);
  };

  const handleMpEntry = async (id: string, qty: number) => {
    const mp = mps.find(m => m.id === id);
    if (!mp) return;
    
    const newStock = mp.stock + qty;
    setMps(prev => prev.map(m => m.id === id ? { ...m, stock: newStock } : m));
    logMovement('INGRESO_MP', `Ingreso de proveedor: ${qty}u de ${mp.desc}`);
    if (isOnline) await supabase.from('mps').update({ stock: newStock }).eq('id', id);
    alert(`✅ Ingreso registrado: +${qty}u de ${mp.desc}`);
  };

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
            <div className="bg-[#2B3860] w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl text-white">
              <Package size={40} />
            </div>
            <h1 className="text-3xl font-black text-[#2B3860]">Merlobus Pro</h1>
            <Badge type={isOnline ? 'ok' : 'danger'} text={isOnline ? 'Conexión Cloud' : 'Modo Local'} />
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
          <span className="font-black text-xl text-[#2B3860] tracking-tight">MERLOBUS</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge type={isOnline ? 'ok' : 'warn'} text={isOnline ? 'CONECTADO' : 'SIN NUBE'} />
          <button onClick={() => {setUser(null); localStorage.removeItem(K.USER)}} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-20 lg:w-64 bg-white border-r p-4 flex flex-col gap-2 shadow-sm overflow-y-auto">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as ViewType)} className={`flex items-center gap-3 p-4 rounded-xl transition-all ${isActive ? 'bg-[#2B3860] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                <tab.icon size={20} />
                <span className="hidden lg:block font-bold text-sm">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {activeTab === ViewType.DASHBOARD && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <SectionHeader title="Panel de Gestión" subtitle={`Bienvenido, ${user.name}`} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Sábanas" value={products.reduce((a, b) => a + b.stock, 0)} icon={Package} color="blue" />
                <StatCard title="Alertas Críticas" value={products.filter(p => p.stock < p.min).length} icon={AlertCircle} color="red" />
                <Button onClick={() => { setIsAiLoading(true); getAIInventoryAdvice(products, mps).then(setAiAdvice).finally(()=>setIsAiLoading(false)) }} disabled={isAiLoading} variant="special" icon={BrainCircuit} className="h-full">
                  {isAiLoading ? 'Analizando...' : 'Consejo de IA'}
                </Button>
              </div>
              {aiAdvice.length > 0 && (
                <Card className="p-6 bg-indigo-50 border-indigo-200">
                  <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><BrainCircuit size={18} /> Sugerencias Estratégicas</h3>
                  <ul className="space-y-2">
                    {aiAdvice.map((a, i) => <li key={i} className="text-sm text-indigo-700 bg-white/50 p-3 rounded-lg border border-indigo-100 font-medium">• {a}</li>)}
                  </ul>
                </Card>
              )}
            </div>
          )}

          {activeTab === ViewType.OPERATIONS && (
            <OperationsManager 
              products={products} mps={mps} recipes={recipes} orders={orders} 
              onCompleteOrder={async (order) => {
                const prod = products.find(p => p.id === order.prodId);
                if (prod) {
                  const newStock = prod.stock + order.qty;
                  const newWip = Math.max(0, (prod.wip || 0) - order.qty);
                  setProducts(products.map(p => p.id === prod.id ? { ...p, stock: newStock, wip: newWip } : p));
                  setOrders(orders.filter(o => o.id !== order.id));
                  logMovement('PRODUCCION', `Finalizó lote de ${order.qty}u de ${prod.sku}`);
                  if (isOnline) {
                    await supabase.from('products').update({ stock: newStock, wip: newWip }).eq('id', prod.id);
                    await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id);
                  }
                }
              }}
              onStartOrder={async (prodId, qty) => {
                const prod = products.find(p => p.id === prodId);
                if (!prod) return;
                const recipeItems = recipes.filter(r => r.prodId === prodId);
                const missingItems: string[] = [];
                recipeItems.forEach(r => {
                  const mp = mps.find(m => m.id === r.mpId);
                  const needed = r.qty * qty;
                  if (!mp || mp.stock < needed) {
                    missingItems.push(`${mp?.desc || 'Material'}: faltan ${needed - (mp?.stock || 0)}u`);
                  }
                });

                if (missingItems.length > 0) {
                  alert(`⚠️ FALTA MATERIA PRIMA:\n\n- ${missingItems.join('\n- ')}`);
                  return;
                }

                const updatedMps = [...mps];
                for (const r of recipeItems) {
                  const mpIndex = updatedMps.findIndex(m => m.id === r.mpId);
                  if (mpIndex > -1) {
                    updatedMps[mpIndex].stock -= (r.qty * qty);
                    if (isOnline) await supabase.from('mps').update({ stock: updatedMps[mpIndex].stock }).eq('id', updatedMps[mpIndex].id);
                  }
                }
                setMps(updatedMps);
                const newOrder: ProductionOrder = { id: Math.random().toString(36).substr(2, 9), prodId, productName: prod.sku, qty, status: 'in_progress', startedAt: new Date().toISOString(), startedBy: user.name };
                setOrders([newOrder, ...orders]);
                const newWip = (prod.wip || 0) + qty;
                setProducts(products.map(p => p.id === prodId ? { ...p, wip: newWip } : p));
                logMovement('PRODUCCION', `Inició producción de ${qty}u de ${prod.sku}.`);
                if (isOnline) {
                  await supabase.from('orders').insert([newOrder]);
                  await supabase.from('products').update({ wip: newWip }).eq('id', prodId);
                }
              }}
            />
          )}

          {activeTab === ViewType.PLANNING && <PlanningView products={products} mps={mps} recipes={recipes} />}

          {activeTab === ViewType.PRODUCTS && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <SectionHeader title="Listado de Sábanas / Espejos" subtitle="Gestión completa de SKUs y stocks" />
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all font-medium text-xs">
                    <FileUp size={16} /> Carga CSV
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </label>
                  <Button onClick={() => setShowAddProduct(true)} icon={Plus} size="sm">Nuevo SKU</Button>
                </div>
              </div>

              {showAddProduct && (
                <Card className="p-6 bg-blue-50 border-blue-200 animate-in slide-in-from-top-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-blue-900 uppercase tracking-widest text-xs">Añadir Nuevo Producto Manualmente</h3>
                    <button onClick={() => setShowAddProduct(false)}><X size={18} className="text-blue-400" /></button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleAddProduct({
                      sku: formData.get('sku') as string,
                      marca: formData.get('marca') as string,
                      modelo: formData.get('modelo') as string,
                      lado: formData.get('lado') as string,
                      min: Number(formData.get('min')),
                      stock: Number(formData.get('stock'))
                    });
                  }} className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <Input name="sku" placeholder="SKU" required />
                    <Input name="marca" placeholder="Marca" required />
                    <Input name="modelo" placeholder="Modelo" />
                    <Input name="lado" placeholder="Lado" />
                    <Input name="min" type="number" placeholder="Min" defaultValue="5" />
                    <Button type="submit" variant="special">Guardar</Button>
                  </form>
                </Card>
              )}
              
              <InventoryTable 
                data={products} 
                type="products" 
                onUpdate={updateProductStock} 
                onUpdateMin={updateProductMin}
                onDelete={deleteProduct}
                onAction={handleDispatch} 
              />
            </div>
          )}

          {activeTab === ViewType.RAW_MATERIALS && (
            <div className="space-y-8">
              <SectionHeader title="Materias Primas" subtitle="Gestión de insumos" />
              <InventoryTable 
                data={mps} 
                type="mps" 
                onUpdate={updateMpStock} 
                onUpdateMin={updateMpMin} 
                onAction={handleMpEntry} 
              />
            </div>
          )}

          {activeTab === ViewType.RECIPES && <RecipeManager products={products} mps={mps} recipes={recipes} />}
          
          {activeTab === ViewType.REPORTS && (
            <div className="max-w-2xl mx-auto py-10">
              <SectionHeader title="Configuración de la Nube" />
              <Card className="p-10 text-center space-y-6">
                <Globe size={48} className="mx-auto text-blue-500" />
                <h3 className="text-2xl font-bold">{isOnline ? 'Sincronizado' : 'Modo Offline'}</h3>
                <Button onClick={() => window.location.reload()} className="w-full">Reconectar</Button>
              </Card>
            </div>
          )}

          {activeTab === ViewType.HISTORY && (
            <div className="space-y-6">
              <SectionHeader title="Historial" />
              <Card className="overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-800 text-white text-[10px] uppercase font-black">
                    <tr><th className="p-4">Fecha</th><th className="p-4">Tipo</th><th className="p-4">Detalle</th><th className="p-4 text-right">Usuario</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map(h => (
                      <tr key={h.id} className="text-xs">
                        <td className="p-4 text-slate-400">{new Date(h.ts).toLocaleString()}</td>
                        <td className="p-4 font-bold text-blue-600">{h.tipo}</td>
                        <td className="p-4 italic text-slate-600">{h.detalle}</td>
                        <td className="p-4 text-right font-black uppercase">{h.user}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => {
  const colors: any = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600" };
  return (
    <Card className="p-6 flex items-center gap-5">
      <div className={`p-4 rounded-2xl ${colors[color]}`}><Icon size={28} /></div>
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-[#2B3860]">{value}</p>
      </div>
    </Card>
  );
};

const OperationsManager = ({ products, orders, onCompleteOrder, onStartOrder }: any) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Card className="p-8 space-y-4">
        <h3 className="font-black text-xl flex items-center gap-2"><ClipboardCheck className="text-blue-600" /> Lanzamiento</h3>
        <select className="w-full p-3 border rounded-xl" value={sel} onChange={e=>setSel(e.target.value)}>
          <option value="">Elegir producto...</option>
          {products.map((p:any) => <option key={p.id} value={p.id}>{p.sku} ({p.stock}u)</option>)}
        </select>
        <Input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} />
        <Button onClick={() => onStartOrder(sel, qty)} disabled={!sel} className="w-full" icon={Factory}>Lanzar</Button>
      </Card>
      <Card className="p-8">
        <h3 className="font-black text-xl mb-4">Activos</h3>
        <div className="space-y-3">
          {orders.map((o:any) => (
            <div key={o.id} className="p-4 bg-slate-50 border rounded-xl flex justify-between items-center">
              <div><p className="font-black text-sm">{o.productName}</p><p className="text-[10px] text-slate-400">Cant: {o.qty}</p></div>
              <Button onClick={() => onCompleteOrder(o)} variant="success" size="sm">Listo</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

const InventoryTable = ({ data, type, onUpdate, onUpdateMin, onDelete, onAction }: any) => {
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [actionQty, setActionQty] = useState<number>(1);

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
          <tr>
            <th className="p-4 w-12">#</th>
            <th className="p-4">SKU / Insumo</th>
            {type === 'products' && <th className="p-4">Marca / Modelo</th>}
            <th className="p-4 text-center">Mínimo</th>
            <th className="p-4 text-center">Stock Actual</th>
            <th className="p-4 text-center">Estado</th>
            <th className="p-4 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map((item: any, idx: number) => {
            const isCritical = item.stock < item.min;
            return (
              <tr key={item.id} className="hover:bg-slate-50 text-sm">
                <td className="p-4 font-bold text-slate-300">{idx + 1}</td>
                <td className="p-4 font-mono font-bold text-slate-600">{item.sku || item.desc}</td>
                {type === 'products' && <td className="p-4 text-slate-500">{item.marca} {item.modelo}</td>}
                <td className="p-4 text-center">
                  <input 
                    type="number" 
                    className="w-16 text-center p-1 border rounded-lg bg-transparent focus:bg-white transition-all outline-none" 
                    value={item.min} 
                    onChange={e => onUpdateMin?.(item.id, Number(e.target.value))} 
                  />
                </td>
                <td className="p-4 text-center">
                  <input 
                    type="number" 
                    className={`w-16 text-center p-1 border rounded-lg font-black bg-transparent focus:bg-white outline-none ${isCritical ? 'text-red-600' : 'text-emerald-600'}`} 
                    value={item.stock} 
                    onChange={e => onUpdate(item.id, Number(e.target.value))} 
                  />
                </td>
                <td className="p-4 text-center">
                  {isCritical ? <Badge type="danger" text="CRÍTICO" /> : <Badge type="ok" text="LISTO" />}
                </td>
                <td className="p-4 text-right space-x-2">
                  {activeActionId === item.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <Input type="number" className="w-14 h-7 p-1 text-center" value={actionQty} onChange={e=>setActionQty(Number(e.target.value))} />
                      <button onClick={() => {onAction(item.id, actionQty); setActiveActionId(null)}} className="bg-blue-600 text-white p-1 rounded"><CheckCircle size={14}/></button>
                      <button onClick={() => setActiveActionId(null)} className="text-slate-400"><X size={14}/></button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setActiveActionId(item.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><Truck size={16}/></button>
                      {type === 'products' && (
                        <button onClick={() => onDelete(item.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16}/></button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const RecipeManager = ({ products, mps, recipes }: any) => {
  const [sel, setSel] = useState('');
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Card className="p-6 h-fit">
        <h3 className="font-bold mb-4">Selección</h3>
        <select className="w-full p-3 border rounded-xl" value={sel} onChange={e=>setSel(e.target.value)}>
          <option value="">Elegir espejo...</option>
          {products.map((p:any)=><option key={p.id} value={p.id}>{p.sku}</option>)}
        </select>
      </Card>
      <Card className="md:col-span-2 p-8 min-h-[400px]">
        <h3 className="font-bold mb-6 flex items-center gap-2"><Save className="text-blue-600" /> Receta</h3>
        {sel ? (
          <div className="space-y-3">
            {recipes.filter((r:any)=>r.prodId === sel).map((r:any) => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-xl flex justify-between items-center border">
                <span className="font-medium">{mps.find((m:any)=>m.id === r.mpId)?.desc || 'Material'}</span>
                <span className="font-black text-blue-700">{r.qty} unidades</span>
              </div>
            ))}
          </div>
        ) : <p className="text-center py-20 opacity-30 italic">Selecciona para ver receta</p>}
      </Card>
    </div>
  );
};

const PlanningView = ({ products, mps, recipes }: any) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);
  const requirements = recipes
    .filter((r:any) => r.prodId === sel)
    .map((r:any) => ({ mp: mps.find((m:any) => m.id === r.mpId), needed: r.qty * qty }));

  return (
    <div className="space-y-8">
      <SectionHeader title="Simulación" />
      <Card className="p-8 bg-[#2B3860] text-white flex flex-col md:flex-row gap-8 items-end">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-black uppercase text-blue-200 mb-2 block">Modelo</label>
          <select className="w-full p-4 rounded-xl text-slate-900 font-bold" value={sel} onChange={e=>setSel(e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {products.map((p:any)=><option key={p.id} value={p.id}>{p.sku}</option>)}
          </select>
        </div>
        <div className="w-full md:w-32">
          <label className="text-[10px] font-black uppercase text-blue-200 mb-2 block">Cantidad</label>
          <Input type="number" value={qty} onChange={e=>setQty(Number(e.target.value))} className="p-4 font-black text-center" />
        </div>
      </Card>
      {sel && (
        <Card className="p-8">
          <h3 className="font-black text-xl mb-6">Materiales</h3>
          <table className="w-full">
            <thead className="text-[10px] uppercase font-black text-slate-400">
              <tr className="border-b"><th className="pb-4 text-left">Insumo</th><th className="pb-4">Stock</th><th className="pb-4">Req</th><th className="pb-4 text-right">Estado</th></tr>
            </thead>
            <tbody className="divide-y">
              {requirements.map((req:any, i:number) => {
                const diff = (req.mp?.stock || 0) - req.needed;
                return (
                  <tr key={i} className="text-sm">
                    <td className="py-4 font-bold">{req.mp?.desc}</td>
                    <td className="py-4 text-center">{req.mp?.stock || 0}</td>
                    <td className="py-4 text-center font-black text-blue-600">{req.needed}</td>
                    <td className="py-4 text-right">
                      {diff >= 0 ? <Badge type="ok" text="LISTO" /> : <Badge type="danger" text="FALTA" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default App;
