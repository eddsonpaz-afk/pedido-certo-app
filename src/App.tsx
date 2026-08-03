import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileText,
  LayoutDashboard,
  Menu,
  Minus,
  MoreHorizontal,
  Package2,
  Plus,
  Save,
  Search,
  Settings,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  UserRound,
  Users,
  X,
} from "lucide-react";

type View = "dashboard" | "novo" | "pedidos";

type Product = {
  codigo: string;
  descricao: string;
  unidade: string;
  precoAtacadoBrasil: number | null;
  precoVarejoBrasil: number | null;
  qtdCaixaMaster: number | null;
  qtdCaixaInner: number | null;
  qtdPacoteUnitario: number | null;
  precoMasterCeara: number | null;
  precoInnerCeara: number | null;
  precoUnitarioCeara: number | null;
  precoEspecialCeara: number | null;
  precoPromocaoExterna: number | null;
  precoPromocaoCeara: number | null;
};

type PriceKey =
  | "precoAtacadoBrasil"
  | "precoVarejoBrasil"
  | "precoMasterCeara"
  | "precoInnerCeara"
  | "precoUnitarioCeara"
  | "precoEspecialCeara"
  | "precoPromocaoExterna"
  | "precoPromocaoCeara";

type OrderItem = {
  product: Product;
  quantity: number;
  discount: number;
};

type Customer = {
  customerCode: string;
  companyName: string;
  tradeName: string;
  document: string;
  buyer: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  region: string;
  salesRep: string;
  seller: string;
  payment: string;
  notes: string;
};

type SavedOrder = {
  id: string;
  customer: string;
  createdAt: string;
  status: string;
  items: number;
  total: number;
};

const priceTables: Array<{ value: PriceKey; label: string; short: string }> = [
  { value: "precoAtacadoBrasil", label: "Atacado Brasil", short: "Atacado" },
  { value: "precoVarejoBrasil", label: "Varejo Brasil", short: "Varejo" },
  { value: "precoMasterCeara", label: "Master Ceará", short: "Master CE" },
  { value: "precoInnerCeara", label: "Inner Ceará", short: "Inner CE" },
  { value: "precoUnitarioCeara", label: "Unitário Ceará", short: "Unitário CE" },
  { value: "precoEspecialCeara", label: "Especial Ceará", short: "Especial CE" },
  { value: "precoPromocaoExterna", label: "Promoção externa", short: "Promo externa" },
  { value: "precoPromocaoCeara", label: "Promoção Ceará", short: "Promo CE" },
];

const payments = [
  "À vista (antecipado/depósito)",
  "Parcela única - 7 dias",
  "Parcela única - 28 dias",
  "Parcela única - 30 dias",
  "2 boletos - 30/45 dias",
  "2 boletos - 30/60 dias",
  "3 boletos - 30/45/60 dias",
  "3 boletos - 30/60/90 dias",
  "4 boletos - 30/60/90/120 dias",
  "5 boletos - 30/45/60/75/90 dias",
  "7 boletos - 30/45/60/75/90/105/120 dias",
];

const states = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];

const emptyCustomer: Customer = {
  customerCode: "",
  companyName: "",
  tradeName: "",
  document: "",
  buyer: "",
  phone: "",
  email: "",
  city: "",
  state: "CE",
  region: "Nordeste",
  salesRep: "",
  seller: "",
  payment: payments[0],
  notes: "",
};

const demoOrders: SavedOrder[] = [
  { id: "PED-2026-0084", customer: "Cliente Demonstração A", createdAt: "Hoje, 14:32", status: "Aprovado", items: 13, total: 15633.25 },
  { id: "PED-2026-0083", customer: "Cliente Demonstração B", createdAt: "Hoje, 11:08", status: "Em aprovação", items: 8, total: 8240.9 },
  { id: "PED-2026-0082", customer: "Cliente Demonstração C", createdAt: "Ontem, 16:47", status: "Rascunho", items: 5, total: 3198.4 },
];

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function priceOf(product: Product, table: PriceKey) {
  return Number(product[table] ?? 0);
}

function statusClass(status: string) {
  return status.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-");
}

function currentView(): View {
  const value = new URLSearchParams(window.location.search).get("view");
  return value === "novo" || value === "pedidos" ? value : "dashboard";
}

const productChunkPaths = Array.from(
  { length: 15 },
  (_, index) => `/products/chunk-${String(index).padStart(2, "0")}.ndjson`,
);

function App() {
  const [view, setView] = useState<View>(currentView);
  const [mobileNav, setMobileNav] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [priceTable, setPriceTable] = useState<PriceKey>("precoVarejoBrasil");
  const [customer, setCustomer] = useState<Customer>(emptyCustomer);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [orderDiscount, setOrderDiscount] = useState(0);
  const [toast, setToast] = useState("");
  const [savedOrders, setSavedOrders] = useState<SavedOrder[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("pedido-certo-orders") ?? "[]") as SavedOrder[];
    } catch {
      return [];
    }
  });

  const demoMode = new URLSearchParams(window.location.search).get("demo") === "1";

  useEffect(() => {
    Promise.all(
      productChunkPaths.map((path) =>
        fetch(path).then((response) => {
          if (!response.ok) throw new Error(`Falha ao carregar ${path}`);
          return response.text();
        }),
      ),
    )
      .then((chunks) =>
        chunks.flatMap((chunk) =>
          chunk
            .trim()
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line) as Product),
        ),
      )
      .then((data) => setProducts(data))
      .catch(() => setProducts([]));
  }, []);

  useEffect(() => {
    if (!demoMode || products.length === 0 || items.length > 0) return;
    const demoCodes = ["10032", "10108", "7943"];
    const demoItems = demoCodes
      .map((code, index) => {
        const product = products.find((candidate) => candidate.codigo === code);
        return product ? { product, quantity: [500, 20, 40][index], discount: 0 } : null;
      })
      .filter(Boolean) as OrderItem[];
    setItems(demoItems);
    setCustomer({
      customerCode: "CLI-DEMO",
      companyName: "CLIENTE DEMONSTRAÇÃO LTDA.",
      tradeName: "Cliente Demonstração",
      document: "",
      buyer: "Comprador de exemplo",
      phone: "",
      email: "",
      city: "Fortaleza",
      state: "CE",
      region: "Nordeste",
      salesRep: "Representante de exemplo",
      seller: "Vendedor de exemplo",
      payment: "5 boletos - 30/45/60/75/90 dias",
      notes: "Pedido preenchido apenas para demonstração do layout.",
    });
  }, [demoMode, products, items.length]);

  useEffect(() => {
    const onPopState = () => setView(currentView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products.slice(0, 6);
    return products
      .filter((product) => product.codigo.includes(query) || product.descricao.toLowerCase().includes(query))
      .slice(0, 8);
  }, [products, search]);

  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => {
        const base = priceOf(item.product, priceTable) * item.quantity;
        return total + base * (1 - item.discount / 100);
      }, 0),
    [items, priceTable],
  );
  const discountValue = subtotal * (orderDiscount / 100);
  const total = subtotal - discountValue;

  function navigate(next: View) {
    const params = new URLSearchParams(window.location.search);
    params.set("view", next);
    window.history.pushState({}, "", `?${params.toString()}`);
    setView(next);
    setMobileNav(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateCustomer<K extends keyof Customer>(key: K, value: Customer[K]) {
    setCustomer((current) => ({ ...current, [key]: value }));
  }

  function addProduct(product: Product) {
    setItems((current) => {
      const existing = current.find((item) => item.product.codigo === product.codigo);
      if (existing) {
        return current.map((item) =>
          item.product.codigo === product.codigo ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      return [...current, { product, quantity: 1, discount: 0 }];
    });
    setSearch("");
    setSearchOpen(false);
  }

  function changeQuantity(code: string, quantity: number) {
    if (quantity < 1) return;
    setItems((current) => current.map((item) => (item.product.codigo === code ? { ...item, quantity } : item)));
  }

  function changeItemDiscount(code: string, discount: number) {
    const safe = Math.min(100, Math.max(0, discount));
    setItems((current) => current.map((item) => (item.product.codigo === code ? { ...item, discount: safe } : item)));
  }

  function removeItem(code: string) {
    setItems((current) => current.filter((item) => item.product.codigo !== code));
  }

  function saveDraft() {
    const id = `PED-${new Date().getFullYear()}-${String(savedOrders.length + 85).padStart(4, "0")}`;
    const order: SavedOrder = {
      id,
      customer: customer.tradeName || customer.companyName || "Cliente não informado",
      createdAt: new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date()),
      status: "Rascunho",
      items: items.length,
      total,
    };
    const updated = [order, ...savedOrders];
    setSavedOrders(updated);
    localStorage.setItem("pedido-certo-orders", JSON.stringify(updated));
    setToast("Rascunho salvo neste navegador. A conexão de escrita com o Google Sheets será ativada na próxima etapa.");
    window.setTimeout(() => setToast(""), 4500);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark"><Package2 size={22} strokeWidth={2.4} /></div>
          <div>
            <strong>Pedido Certo</strong>
            <span>CBS + Waves Plus</span>
          </div>
          <button className="sidebar-close" onClick={() => setMobileNav(false)} aria-label="Fechar menu"><X size={20} /></button>
        </div>

        <nav className="main-nav" aria-label="Navegação principal">
          <button className={view === "dashboard" ? "active" : ""} onClick={() => navigate("dashboard")}>
            <LayoutDashboard size={19} /><span>Visão geral</span>
          </button>
          <button className={view === "novo" ? "active" : ""} onClick={() => navigate("novo")}>
            <ShoppingCart size={19} /><span>Novo pedido</span>
          </button>
          <button className={view === "pedidos" ? "active" : ""} onClick={() => navigate("pedidos")}>
            <ClipboardList size={19} /><span>Pedidos</span><span className="nav-count">{savedOrders.length || 3}</span>
          </button>
          <button disabled><Users size={19} /><span>Clientes</span><span className="soon">em breve</span></button>
        </nav>

        <div className="sidebar-spacer" />
        <div className="sync-card">
          <div className="sync-icon"><Check size={16} /></div>
          <div><strong>Base atualizada</strong><span>562 produtos • Junho</span></div>
        </div>
        <nav className="main-nav secondary-nav">
          <button disabled><Settings size={19} /><span>Configurações</span></button>
        </nav>
        <div className="sidebar-profile">
          <div className="avatar">EP</div>
          <div><strong>Edson Paz</strong><span>Gerente de Marketing</span></div>
          <MoreHorizontal size={18} />
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileNav(true)} aria-label="Abrir menu"><Menu size={22} /></button>
          <div className="mobile-brand">Pedido Certo</div>
          <div className="topbar-spacer" />
          <div className="base-status"><span className="status-dot" /> Preços atualizados</div>
          <button className="icon-button" aria-label="Notificações"><Bell size={19} /><span className="notification-dot" /></button>
        </header>

        {view === "dashboard" && (
          <Dashboard orders={savedOrders.length ? savedOrders : demoOrders} onNewOrder={() => navigate("novo")} onViewOrders={() => navigate("pedidos")} />
        )}
        {view === "pedidos" && <OrdersPage orders={savedOrders.length ? savedOrders : demoOrders} onNewOrder={() => navigate("novo")} />}
        {view === "novo" && (
          <NewOrderPage
            customer={customer}
            updateCustomer={updateCustomer}
            products={products}
            filteredProducts={filteredProducts}
            search={search}
            setSearch={setSearch}
            searchOpen={searchOpen}
            setSearchOpen={setSearchOpen}
            addProduct={addProduct}
            items={items}
            priceTable={priceTable}
            setPriceTable={setPriceTable}
            changeQuantity={changeQuantity}
            changeItemDiscount={changeItemDiscount}
            removeItem={removeItem}
            orderDiscount={orderDiscount}
            setOrderDiscount={setOrderDiscount}
            subtotal={subtotal}
            discountValue={discountValue}
            total={total}
            saveDraft={saveDraft}
          />
        )}
      </main>
      {toast && <div className="toast"><CheckCircle2 size={19} /><span>{toast}</span><button onClick={() => setToast("")}><X size={16} /></button></div>}
    </div>
  );
}

function Dashboard({ orders, onNewOrder, onViewOrders }: { orders: SavedOrder[]; onNewOrder: () => void; onViewOrders: () => void }) {
  const total = orders.reduce((sum, order) => sum + order.total, 0);
  return (
    <div className="page dashboard-page">
      <section className="page-heading heading-with-action">
        <div><span className="eyebrow">SEGUNDA-FEIRA, 3 DE AGOSTO</span><h1>Bom dia, Edson.</h1><p>Seus pedidos e oportunidades, sem planilha aberta em quinze abas.</p></div>
        <button className="primary-button" onClick={onNewOrder}><Plus size={19} /> Novo pedido</button>
      </section>

      <section className="metrics-grid">
        <MetricCard icon={<CircleDollarSign size={20} />} label="Volume em pedidos" value={currency.format(total)} detail="mês atual" tone="navy" />
        <MetricCard icon={<ClipboardList size={20} />} label="Pedidos no período" value={String(orders.length + 21).padStart(2, "0")} detail="+12% versus julho" tone="yellow" />
        <MetricCard icon={<Clock3 size={20} />} label="Aguardando aprovação" value="04" detail="2 precisam de atenção" tone="red" />
        <MetricCard icon={<TrendingUp size={20} />} label="Ticket médio" value={currency.format(total / Math.max(orders.length, 1))} detail="mês atual" tone="green" />
      </section>

      <section className="dashboard-grid">
        <div className="panel recent-panel">
          <div className="panel-heading"><div><h2>Pedidos recentes</h2><p>Acompanhe o andamento das últimas negociações.</p></div><button className="text-button" onClick={onViewOrders}>Ver todos <ArrowRight size={16} /></button></div>
          <div className="recent-list">
            {orders.slice(0, 4).map((order) => <OrderRow key={order.id} order={order} />)}
          </div>
        </div>
        <div className="panel quick-panel">
          <div className="panel-heading"><div><h2>Acesso rápido</h2><p>Comece pelo que importa.</p></div></div>
          <button className="quick-action featured" onClick={onNewOrder}><span className="quick-icon"><ShoppingCart size={21} /></span><span><strong>Criar novo pedido</strong><small>Busque o cliente e adicione produtos</small></span><ArrowRight size={18} /></button>
          <button className="quick-action"><span className="quick-icon light"><FileText size={21} /></span><span><strong>Continuar rascunho</strong><small>Retome o último pedido salvo</small></span><ArrowRight size={18} /></button>
          <div className="data-note"><Package2 size={18} /><div><strong>Catálogo pronto</strong><span>562 códigos ligados à tabela de preços.</span></div></div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ icon, label, value, detail, tone }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><strong>{value}</strong><span>{detail}</span></div>;
}

function OrderRow({ order }: { order: SavedOrder }) {
  return <div className="order-row"><div className="order-symbol"><FileText size={18} /></div><div className="order-main"><strong>{order.customer}</strong><span>{order.id} • {order.items} itens</span></div><div className="order-date">{order.createdAt}</div><span className={`status-pill ${statusClass(order.status)}`}>{order.status}</span><strong className="order-total">{currency.format(order.total)}</strong><button className="row-menu"><MoreHorizontal size={18} /></button></div>;
}

function OrdersPage({ orders, onNewOrder }: { orders: SavedOrder[]; onNewOrder: () => void }) {
  return <div className="page orders-page"><section className="page-heading heading-with-action"><div><span className="eyebrow">GESTÃO COMERCIAL</span><h1>Pedidos</h1><p>Consulte rascunhos, aprovações e pedidos faturados.</p></div><button className="primary-button" onClick={onNewOrder}><Plus size={19} /> Novo pedido</button></section><section className="panel order-table-panel"><div className="table-tools"><div className="search-field compact"><Search size={18} /><input placeholder="Buscar pedido ou cliente" /></div><button className="filter-button"><SlidersHorizontal size={17} /> Filtros</button><button className="filter-button"><CalendarDays size={17} /> Este mês</button></div><div className="orders-table"><div className="orders-table-head"><span>Pedido</span><span>Cliente</span><span>Data</span><span>Status</span><span>Itens</span><span>Total</span><span /></div>{orders.concat(demoOrders).slice(0, 6).map((order, index) => <div className="orders-table-row" key={`${order.id}-${index}`}><strong>{order.id}</strong><span>{order.customer}</span><span>{order.createdAt}</span><span className={`status-pill ${statusClass(order.status)}`}>{order.status}</span><span>{order.items}</span><strong>{currency.format(order.total)}</strong><button className="row-menu"><MoreHorizontal size={18} /></button></div>)}</div></section></div>;
}

type NewOrderProps = {
  customer: Customer;
  updateCustomer: <K extends keyof Customer>(key: K, value: Customer[K]) => void;
  products: Product[];
  filteredProducts: Product[];
  search: string;
  setSearch: (value: string) => void;
  searchOpen: boolean;
  setSearchOpen: (value: boolean) => void;
  addProduct: (product: Product) => void;
  items: OrderItem[];
  priceTable: PriceKey;
  setPriceTable: (value: PriceKey) => void;
  changeQuantity: (code: string, quantity: number) => void;
  changeItemDiscount: (code: string, discount: number) => void;
  removeItem: (code: string) => void;
  orderDiscount: number;
  setOrderDiscount: (value: number) => void;
  subtotal: number;
  discountValue: number;
  total: number;
  saveDraft: () => void;
};

function NewOrderPage(props: NewOrderProps) {
  const { customer, updateCustomer, filteredProducts, search, setSearch, searchOpen, setSearchOpen, addProduct, items, priceTable, setPriceTable, changeQuantity, changeItemDiscount, removeItem, orderDiscount, setOrderDiscount, subtotal, discountValue, total, saveDraft } = props;
  return <div className="page new-order-page"><section className="page-heading order-heading"><div><span className="eyebrow">NOVO PEDIDO</span><h1>Monte o pedido</h1><p>Cliente, produtos e condição comercial em um fluxo só.</p></div><div className="stepper"><span className="step active"><b>1</b> Cliente</span><i /><span className={`step ${items.length ? "active" : ""}`}><b>2</b> Produtos</span><i /><span className="step"><b>3</b> Revisão</span></div></section><div className="order-layout"><div className="order-content"><section className="form-section panel"><div className="section-title"><span className="section-number">01</span><div><h2>Dados do cliente</h2><p>Informações comerciais e de entrega.</p></div><button className="link-button"><Search size={16} /> Buscar cliente</button></div><div className="form-grid"><Field label="Código do cliente"><input value={customer.customerCode} onChange={(e) => updateCustomer("customerCode", e.target.value)} placeholder="Ex.: CLI-0284" /></Field><Field label="Razão social" wide><input value={customer.companyName} onChange={(e) => updateCustomer("companyName", e.target.value)} placeholder="Nome empresarial do cliente" /></Field><Field label="Nome fantasia"><input value={customer.tradeName} onChange={(e) => updateCustomer("tradeName", e.target.value)} placeholder="Como o cliente é conhecido" /></Field><Field label="CNPJ/CPF"><input value={customer.document} onChange={(e) => updateCustomer("document", e.target.value)} placeholder="00.000.000/0000-00" /></Field><Field label="Comprador"><input value={customer.buyer} onChange={(e) => updateCustomer("buyer", e.target.value)} placeholder="Responsável pela compra" /></Field><Field label="Telefone"><input value={customer.phone} onChange={(e) => updateCustomer("phone", e.target.value)} placeholder="(85) 00000-0000" /></Field><Field label="E-mail"><input value={customer.email} onChange={(e) => updateCustomer("email", e.target.value)} placeholder="compras@cliente.com.br" /></Field><Field label="Cidade"><input value={customer.city} onChange={(e) => updateCustomer("city", e.target.value)} placeholder="Cidade" /></Field><Field label="UF"><select value={customer.state} onChange={(e) => updateCustomer("state", e.target.value)}>{states.map((state) => <option key={state}>{state}</option>)}</select></Field><Field label="Região"><select value={customer.region} onChange={(e) => updateCustomer("region", e.target.value)}><option>Norte</option><option>Nordeste</option><option>Centro-Oeste</option><option>Sudeste</option><option>Sul</option></select></Field><Field label="Representante"><input value={customer.salesRep} onChange={(e) => updateCustomer("salesRep", e.target.value)} placeholder="Representante" /></Field><Field label="Vendedor"><input value={customer.seller} onChange={(e) => updateCustomer("seller", e.target.value)} placeholder="Vendedor responsável" /></Field></div></section><section className="form-section panel products-section"><div className="section-title"><span className="section-number">02</span><div><h2>Produtos e preços</h2><p>O código identifica o produto; a tabela define o preço.</p></div><div className="catalog-badge"><span /> {props.products.length || 562} produtos</div></div><div className="commercial-bar"><Field label="Tabela de preço"><select value={priceTable} onChange={(e) => setPriceTable(e.target.value as PriceKey)}>{priceTables.map((table) => <option key={table.value} value={table.value}>{table.label}</option>)}</select></Field><Field label="Condição de pagamento" wide><select value={customer.payment} onChange={(e) => updateCustomer("payment", e.target.value)}>{payments.map((payment) => <option key={payment}>{payment}</option>)}</select></Field></div><div className="product-search-wrap"><div className="search-field product-search"><Search size={20} /><input value={search} onFocus={() => setSearchOpen(true)} onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }} placeholder="Digite o código ou a descrição do produto" /><span className="shortcut">⌘ K</span></div>{searchOpen && <div className="search-results"><div className="search-results-title">{search ? "Resultados encontrados" : "Produtos sugeridos"}</div>{filteredProducts.length ? filteredProducts.map((product) => <button key={product.codigo} onMouseDown={() => addProduct(product)}><span className="product-mini-icon"><Package2 size={18} /></span><span className="result-main"><strong>{product.descricao}</strong><small>Cód. {product.codigo} • {product.unidade || "UN"}</small></span><span className="result-price"><small>{priceTables.find((table) => table.value === priceTable)?.short}</small><strong>{currency.format(priceOf(product, priceTable))}</strong></span><Plus size={18} /></button>) : <div className="no-results">Nenhum produto encontrado.</div>}</div>}</div>{items.length ? <div className="items-table"><div className="items-head"><span>Produto</span><span>Quantidade</span><span>Preço unitário</span><span>Desc.</span><span>Total</span><span /></div>{items.map((item) => { const unit = priceOf(item.product, priceTable); const itemTotal = unit * item.quantity * (1 - item.discount / 100); return <div className="item-row" key={item.product.codigo}><div className="item-product"><span className="product-icon"><Package2 size={19} /></span><div><strong>{item.product.descricao}</strong><span>Cód. {item.product.codigo} • {item.product.unidade || "UN"}</span></div></div><div className="quantity-control"><button onClick={() => changeQuantity(item.product.codigo, item.quantity - 1)}><Minus size={14} /></button><input type="number" min="1" value={item.quantity} onChange={(e) => changeQuantity(item.product.codigo, Number(e.target.value))} /><button onClick={() => changeQuantity(item.product.codigo, item.quantity + 1)}><Plus size={14} /></button></div><div className="unit-price"><strong>{currency.format(unit)}</strong><span>{priceTables.find((table) => table.value === priceTable)?.short}</span></div><div className="discount-input"><input type="number" min="0" max="100" value={item.discount} onChange={(e) => changeItemDiscount(item.product.codigo, Number(e.target.value))} /><span>%</span></div><strong className="item-total">{currency.format(itemTotal)}</strong><button className="delete-button" onClick={() => removeItem(item.product.codigo)} aria-label="Excluir item"><Trash2 size={17} /></button></div>; })}<button className="add-another" onClick={() => setSearchOpen(true)}><Plus size={17} /> Adicionar outro produto</button></div> : <div className="empty-items"><span><ShoppingCart size={25} /></span><div><strong>Nenhum produto adicionado</strong><p>Use a busca acima para montar o pedido.</p></div></div>}</section><section className="form-section panel notes-section"><div className="section-title"><span className="section-number">03</span><div><h2>Observações</h2><p>Informações para faturamento, separação ou entrega.</p></div></div><textarea value={customer.notes} onChange={(e) => updateCustomer("notes", e.target.value)} placeholder="Digite alguma orientação importante para este pedido..." /></section></div><aside className="order-summary panel"><div className="summary-heading"><div><span>RESUMO DO PEDIDO</span><h2>Novo pedido</h2></div><span className="draft-pill">Rascunho</span></div><div className="summary-customer"><Building2 size={18} /><div><strong>{customer.tradeName || customer.companyName || "Cliente não informado"}</strong><span>{customer.city ? `${customer.city} • ${customer.state}` : "Preencha os dados do cliente"}</span></div></div><div className="summary-lines"><div><span>Itens</span><strong>{items.length}</strong></div><div><span>Tabela</span><strong>{priceTables.find((table) => table.value === priceTable)?.label}</strong></div><div><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div><div className="summary-discount"><span>Desconto geral</span><label><input type="number" min="0" max="100" value={orderDiscount} onChange={(e) => setOrderDiscount(Math.min(100, Math.max(0, Number(e.target.value))))} /><span>%</span></label></div>{discountValue > 0 && <div className="discount-line"><span>Valor do desconto</span><strong>- {currency.format(discountValue)}</strong></div>}<div><span>IPI e ST</span><span className="pending-tax">Calculados na aprovação</span></div></div><div className="grand-total"><span>Total estimado</span><strong>{currency.format(total)}</strong><small>Impostos serão validados antes do envio.</small></div><button className="primary-button full" onClick={saveDraft} disabled={!items.length}><Save size={18} /> Salvar rascunho</button><button className="secondary-button full" disabled={!items.length}><CheckCircle2 size={18} /> Revisar pedido</button><div className="summary-foot"><Clock3 size={15} /><span>Rascunhos ficam salvos neste navegador.</span></div></aside></div></div>;
}

function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}</span><div className="field-control">{children}<ChevronDown size={15} className="select-chevron" /></div></label>;
}

export default App;
