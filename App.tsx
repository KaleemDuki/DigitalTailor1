
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserRole, AppState, Customer, Order, OrderStatus, PaymentStatus, Message, Measurements, PaymentDetails } from './types';
import { Icons, SUIT_TYPES } from './constants';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy } from "firebase/firestore";

const PROF_1 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%236366f1'/%3E%3Ccircle cx='50' cy='40' r='20' fill='%23fff'/%3E%3Ccircle cx='50' cy='110' r='45' fill='%23fff'/%3E%3C/svg%3E";
const PROF_2 = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%234f46e5'/%3E%3Ccircle cx='50' cy='40' r='20' fill='%23e0e7ff'/%3E%3Ccircle cx='50' cy='110' r='45' fill='%23e0e7ff'/%3E%3C/svg%3E";

const App: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role: UserRole; id?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Connect to Firebase for real-time data
  useEffect(() => {
    const unsubCustomers = onSnapshot(collection(db, "customers"), (snapshot) => {
      const custData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
      setCustomers(custData);
      setLoading(false);
    });

    const unsubOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
      const orderData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(orderData);
    });

    return () => { unsubCustomers(); unsubOrders(); };
  }, []);

  const loginAsTailor = () => setCurrentUser({ role: UserRole.TAILOR });
  const loginAsCustomer = (mobileNumber: string) => {
    const customer = customers.find(c => c.mobileNumber === mobileNumber);
    if (customer) {
      setCurrentUser({ role: UserRole.CUSTOMER, id: customer.id });
      return true;
    }
    return false;
  };
  const logout = () => setCurrentUser(null);

  const handleAddCustomer = async (customer: Omit<Customer, 'id'>) => {
    await addDoc(collection(db, "customers"), customer);
  };

  const handleAddOrder = async (orderData: { customerId: string; measurements: Measurements; payment: PaymentDetails }) => {
    await addDoc(collection(db, "orders"), {
      ...orderData,
      status: OrderStatus.PENDING,
      messages: [],
      photos: [],
      createdAt: new Date().toISOString()
    });
  };

  const handleUpdateStatus = async (id: string, status: OrderStatus) => {
    await updateDoc(doc(db, "orders", id), { status });
  };

  const handleSendMessage = async (id: string, urdu: string, english: string) => {
    const order = orders.find(o => o.id === id);
    if (!order) return;
    const newMessage = {
      id: Math.random().toString(36).substr(2, 9),
      urdu,
      english,
      timestamp: new Date().toISOString()
    };
    await updateDoc(doc(db, "orders", id), {
      messages: [newMessage, ...order.messages]
    });
  };

  const handlePhotoUpdate = async (id: string, photos: string[]) => {
    await updateDoc(doc(db, "orders", id), { photos });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  );

  if (!currentUser) return <LoginView onTailorLogin={loginAsTailor} onCustomerLogin={loginAsCustomer} />;

  const state: AppState = { customers, orders, currentUser };

  return currentUser.role === UserRole.TAILOR ? (
    <TailorDashboard 
      state={state} 
      onLogout={logout} 
      onAddCustomer={handleAddCustomer}
      onAddOrder={handleAddOrder}
      onUpdateStatus={handleUpdateStatus}
      onSendMessage={handleSendMessage}
      onPhotoUpdate={handlePhotoUpdate}
    />
  ) : (
    <CustomerDashboard 
      state={state} 
      customerId={currentUser.id!} 
      onLogout={logout} 
      onPhotoUpdate={handlePhotoUpdate}
    />
  );
};

// ... Rest of the UI components (LoginView, TailorDashboard, etc.) remain identical in structure 
// but use the props passed from App.tsx ...

const LoginView: React.FC<{ onTailorLogin: () => void; onCustomerLogin: (mobile: string) => boolean }> = ({ onTailorLogin, onCustomerLogin }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [mobile, setMobile] = useState('');
  const [error, setError] = useState('');

  const handleCustomerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCustomerLogin(mobile)) setError('Customer not found. Ensure mobile number is correct.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-indigo-600 p-10 text-white text-center">
          <h1 className="text-4xl font-black tracking-tight mb-2">StitchFlow</h1>
          <p className="text-indigo-100 opacity-80">Connected to Cloud</p>
        </div>
        <div className="p-8">
          {!role ? (
            <div className="space-y-4">
              <button onClick={() => setRole(UserRole.TAILOR)} className="w-full p-5 flex items-center justify-center space-x-4 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-white"><Icons.User /></div>
                <span className="font-bold text-lg text-slate-800">I am a Tailor</span>
              </button>
              <button onClick={() => setRole(UserRole.CUSTOMER)} className="w-full p-5 flex items-center justify-center space-x-4 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group">
                <div className="p-3 bg-white rounded-xl shadow-sm group-hover:bg-white"><Icons.User /></div>
                <span className="font-bold text-lg text-slate-800">I am a Customer</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              <button onClick={() => setRole(null)} className="text-indigo-600 text-sm font-bold flex items-center hover:underline gap-1">← Go Back</button>
              <h2 className="text-2xl font-bold text-slate-900">{role === UserRole.TAILOR ? 'Tailor Access' : 'Customer View'}</h2>
              {role === UserRole.TAILOR ? (
                <button onClick={onTailorLogin} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]">Enter Dashboard</button>
              ) : (
                <form onSubmit={handleCustomerLogin} className="space-y-4">
                  <input type="tel" required value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Enter mobile number" className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl focus:border-indigo-600 outline-none text-lg" />
                  {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                  <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">Track My Order</button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TailorDashboard: React.FC<{ 
  state: AppState; 
  onLogout: () => void;
  onAddCustomer: (c: Omit<Customer, 'id'>) => void;
  onAddOrder: (d: { customerId: string; measurements: Measurements; payment: PaymentDetails }) => void;
  onUpdateStatus: (id: string, s: OrderStatus) => void;
  onSendMessage: (id: string, u: string, e: string) => void;
  onPhotoUpdate: (id: string, p: string[]) => void;
}> = ({ state, onLogout, onAddCustomer, onAddOrder, onUpdateStatus, onSendMessage, onPhotoUpdate }) => {
  const [activeTab, setActiveTab] = useState<'customers' | 'orders'>('customers');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAddingOrder, setIsAddingOrder] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return state.customers;
    const low = searchTerm.toLowerCase();
    return state.customers.filter(c => 
      c.name.toLowerCase().includes(low) || 
      c.mobileNumber.includes(searchTerm) || 
      c.fatherName.toLowerCase().includes(low)
    );
  }, [state.customers, searchTerm]);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return state.orders;
    const low = searchTerm.toLowerCase();
    return state.orders.filter(o => {
      const customer = state.customers.find(c => c.id === o.customerId);
      return o.id.toLowerCase().includes(low) || customer?.name.toLowerCase().includes(low);
    });
  }, [state.orders, state.customers, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <h2 className="text-2xl font-black text-indigo-600 tracking-tight">StitchFlow Tailor</h2>
        <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Icons.LogOut /></button>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex bg-slate-200 p-1.5 rounded-2xl w-full md:w-fit">
            <button onClick={() => { setActiveTab('customers'); setSearchTerm(''); }} className={`flex-1 md:flex-none py-3 px-8 rounded-xl text-sm font-bold transition-all ${activeTab === 'customers' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Customers</button>
            <button onClick={() => { setActiveTab('orders'); setSearchTerm(''); }} className={`flex-1 md:flex-none py-3 px-8 rounded-xl text-sm font-bold transition-all ${activeTab === 'orders' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-800'}`}>Orders</button>
          </div>
          
          <div className="relative flex-1 max-w-md group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
              <Icons.Search />
            </div>
            <input 
              type="text" 
              placeholder={activeTab === 'customers' ? "Search Name or Mobile..." : "Search Order ID or Name..."}
              className="w-full pl-11 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl outline-none focus:border-indigo-600 shadow-sm transition-all text-sm font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {activeTab === 'customers' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-3xl font-black text-slate-900">Your Customers</h3>
              <button onClick={() => setIsAddingCustomer(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"><Icons.Plus /><span>Add New</span></button>
            </div>
            {filteredCustomers.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200"><p className="text-slate-400 font-bold">No customers found.</p></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomers.map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-indigo-50 border-2 border-indigo-100 shrink-0 shadow-inner">
                        <img src={c.profilePicture || PROF_1} alt={c.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <h4 className="font-black text-lg text-slate-900 leading-tight">{c.name}</h4>
                        <p className="text-slate-400 text-sm font-medium">s/o {c.fatherName}</p>
                      </div>
                    </div>
                    <div className="space-y-3 mb-6 bg-slate-50 p-4 rounded-2xl text-xs">
                      <p className="text-slate-600 flex justify-between"><strong>Phone:</strong> {c.mobileNumber}</p>
                      <p className="text-slate-600 line-clamp-1"><strong>Address:</strong> {c.address}</p>
                    </div>
                    <button onClick={() => { setSelectedCustomerId(c.id); setIsAddingOrder(true); }} className="w-full py-3.5 bg-indigo-50 border-2 border-indigo-100 rounded-2xl text-indigo-600 font-black text-sm hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-wider">New Order</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8 animate-fadeIn">
            <h3 className="text-3xl font-black text-slate-900">Order Management</h3>
            {filteredOrders.map(order => {
              const customer = state.customers.find(c => c.id === order.customerId);
              return (
                <OrderCard
                  key={order.id}
                  order={order}
                  customerName={customer?.name || 'Unknown'}
                  customerPhoto={customer?.profilePicture}
                  onUpdateStatus={s => onUpdateStatus(order.id, s)}
                  onSendMessage={(u, e) => onSendMessage(order.id, u, e)}
                  onPhotoUpdate={p => onPhotoUpdate(order.id, p)}
                />
              );
            })}
          </div>
        )}
      </div>

      {isAddingCustomer && <Modal title="Add New Customer" onClose={() => setIsAddingCustomer(false)}><CustomerForm onSubmit={(c) => { onAddCustomer(c); setIsAddingCustomer(false); }} /></Modal>}
      {isAddingOrder && selectedCustomerId && (
        <Modal title="Add Order & Measurements" onClose={() => setIsAddingOrder(false)}>
          <OrderForm 
            customer={state.customers.find(c => c.id === selectedCustomerId)}
            onSubmit={(d) => { onAddOrder({ ...d, customerId: selectedCustomerId }); setIsAddingOrder(false); }} 
          />
        </Modal>
      )}
    </div>
  );
};

// ... Remaining UI components (OrderCard, CustomerForm, OrderForm, CustomerDashboard, Modal) 
// are largely the same but connected to the new Firestore props ...
const OrderCard: React.FC<{ order: Order; customerName: string; customerPhoto?: string; onUpdateStatus: (s: OrderStatus) => void; onSendMessage: (u: string, e: string) => void; onPhotoUpdate: (p: string[]) => void }> = ({ order, customerName, customerPhoto, onUpdateStatus, onSendMessage, onPhotoUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [urdu, setUrdu] = useState('');
  const [english, setEnglish] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const statusMap = { [OrderStatus.PENDING]: 'bg-amber-100 text-amber-700', [OrderStatus.STITCHING]: 'bg-blue-100 text-blue-700', [OrderStatus.READY]: 'bg-green-100 text-green-700', [OrderStatus.DELIVERED]: 'bg-slate-100 text-slate-500' };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden mb-6 hover:shadow-lg transition-shadow">
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 overflow-hidden border-2 border-indigo-100 shadow-inner">
              <img src={customerPhoto || PROF_1} alt={customerName} className="w-full h-full object-cover" />
            </div>
            <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ORDER #{order.id.substr(0, 6)}</span><h4 className="text-2xl font-black text-slate-900">{customerName}</h4><p className="text-indigo-600 font-bold">{order.measurements.suitType}</p></div>
          </div>
          <div className="flex items-center gap-4">
            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide ${statusMap[order.status]}`}>{order.status}</span>
            <div className="text-right"><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Due Date</p><p className="font-black text-slate-800">{order.measurements.deliveryDate}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 text-center">
          <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Total</p><p className="font-black text-slate-900">Rs. {order.payment.stitchingPrice}</p></div>
          <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Advance</p><p className="font-black text-slate-900">Rs. {order.payment.advancePaid}</p></div>
          <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Due</p><p className="font-black text-red-600">Rs. {order.payment.remainingAmount}</p></div>
          <div><p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Payment</p><p className={`font-black uppercase text-[10px] ${order.payment.status === PaymentStatus.PAID ? 'text-green-600' : 'text-amber-600'}`}>{order.payment.status}</p></div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button onClick={() => setExpanded(!expanded)} className="px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors">Details & Style</button>
          <button onClick={() => setMessaging(!messaging)} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors">Message Update</button>
          <select value={order.status} onChange={e => onUpdateStatus(e.target.value as OrderStatus)} className="ml-auto px-4 py-2.5 bg-white border-2 border-slate-100 rounded-xl font-bold text-sm focus:border-indigo-600 outline-none">
            {Object.values(OrderStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {expanded && (
          <div className="mt-8 pt-8 border-t border-slate-100 animate-fadeIn">
            <h5 className="font-black text-slate-900 mb-6 uppercase tracking-wider text-sm flex items-center gap-2"><div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div> Measurements (Inches)</h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 mb-8">
              {Object.entries(order.measurements).map(([k, v]) => {
                if (['specialNotes', 'measurementDate', 'deliveryDate', 'suitType'].includes(k)) return null;
                return <div key={k} className="bg-indigo-50/30 p-4 rounded-2xl border border-indigo-50"><p className="text-[10px] font-bold text-slate-400 uppercase mb-1 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p><p className="font-black text-indigo-700 text-xl">{v || '-'}</p></div>;
              })}
            </div>
            <div className="flex items-center justify-between mb-6">
              <h5 className="font-black text-slate-900 uppercase tracking-wider text-sm">Style Reference Gallery</h5>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:underline"><Icons.Camera /> Upload Style Photo</button>
              <input type="file" ref={fileRef} hidden accept="image/*" onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const reader = new FileReader();
                   reader.onload = () => onPhotoUpdate([...(order.photos || []), reader.result as string]);
                   reader.readAsDataURL(file);
                 }
              }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {order.photos?.map((p, i) => <div key={i} className="aspect-square rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-slate-50"><img src={p} className="w-full h-full object-cover" alt="" /></div>)}
            </div>
          </div>
        )}

        {messaging && (
          <div className="mt-8 p-8 bg-indigo-50 rounded-3xl border border-indigo-100 animate-slideIn">
            <h5 className="font-black text-indigo-900 mb-6 flex items-center gap-2"><Icons.Message /> Notify Customer</h5>
            <div className="space-y-4">
              <textarea placeholder="Message in English..." value={english} onChange={e => setEnglish(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-indigo-100 outline-none focus:border-indigo-600 h-24 text-sm" />
              <textarea dir="rtl" placeholder="Urdu mein message..." value={urdu} onChange={e => setUrdu(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-indigo-100 outline-none focus:border-indigo-600 h-24 font-bold text-right text-lg" />
              <div className="flex justify-end space-x-3">
                <button onClick={() => setMessaging(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-all">Cancel</button>
                <button onClick={() => { onSendMessage(urdu, english); setUrdu(''); setEnglish(''); setMessaging(false); }} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 transition-all active:scale-95">Send Notification</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CustomerForm: React.FC<{ onSubmit: (data: Omit<Customer, 'id'>) => void }> = ({ onSubmit }) => {
  const [data, setData] = useState({ name: '', fatherName: '', address: '', cnic: '', mobileNumber: '', profilePicture: PROF_1 });
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePic = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setData({ ...data, profilePicture: reader.result as string });
    reader.readAsDataURL(file);
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(data); }} className="space-y-6">
      <div className="flex flex-col items-center group cursor-pointer" onClick={() => fileRef.current?.click()}>
        <div className="w-24 h-24 rounded-3xl bg-indigo-50 overflow-hidden border-2 border-indigo-200 shadow-xl shadow-indigo-50 transition-transform group-hover:scale-105 relative">
          <img src={data.profilePicture} className="w-full h-full object-cover" alt="Profile" />
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Icons.Camera /></div>
        </div>
        <p className="mt-4 text-sm font-black text-indigo-600 flex items-center gap-1 uppercase tracking-wider">Change Profile Picture</p>
        <input type="file" ref={fileRef} hidden accept="image/*" onChange={handlePic} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['name', 'fatherName', 'mobileNumber', 'cnic'].map(f => (
          <div key={f}>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
            <input required={f !== 'cnic'} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white font-bold transition-all" value={(data as any)[f]} onChange={e => setData({ ...data, [f]: e.target.value })} />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Permanent Address</label>
        <textarea required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white h-24 font-bold transition-all" value={data.address} onChange={e => setData({ ...data, address: e.target.value })} />
      </div>
      <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">REGISTER CUSTOMER</button>
    </form>
  );
};

const OrderForm: React.FC<{ customer?: Customer; onSubmit: (d: { measurements: Measurements; payment: PaymentDetails }) => void }> = ({ customer, onSubmit }) => {
  const [meas, setMeas] = useState<Measurements>({ suitType: SUIT_TYPES[0], shoulder: '', chest: '', waist: '', neck: '', armLength: '', wrist: '', shirtLength: '', shalwarLength: '', paincha: '', damain: '', numPockets: 2, numSuits: 1, clothLengthGiven: '', measurementDate: new Date().toISOString().split('T')[0], deliveryDate: '', specialNotes: '' });
  const [pay, setPay] = useState({ stitchingPrice: 1500, advancePaid: 500 });
  const due = pay.stitchingPrice - pay.advancePaid;

  const quickFill = () => { setMeas({ ...meas, shoulder: '18', chest: '42', waist: '38', neck: '15.5', armLength: '24', wrist: '9.5', shirtLength: '39', shalwarLength: '40', paincha: '8.5', damain: '22' }); };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ measurements: meas, payment: { ...pay, remainingAmount: due, status: due <= 0 ? PaymentStatus.PAID : PaymentStatus.UNPAID } }); }} className="space-y-8 max-h-[75vh] overflow-y-auto pr-2 custom-scroll">
      {customer && (
        <div className="flex items-center gap-4 p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/50 bg-indigo-700 shadow-inner">
            <img src={customer.profilePicture || PROF_1} className="w-full h-full object-cover" alt="" />
          </div>
          <div><h4 className="text-xl font-black leading-tight">{customer.name}</h4><p className="text-xs text-indigo-100 font-bold uppercase tracking-widest opacity-80">s/o {customer.fatherName}</p></div>
        </div>
      )}

      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-xl font-black text-slate-900 flex items-center gap-2"><Icons.Order /> Suit Configuration</h4>
          <button type="button" onClick={quickFill} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-white border-2 border-indigo-100 px-3 py-1.5 rounded-full hover:bg-indigo-600 hover:text-white transition-all">Quick Fill Data</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Style / Category</label>
            <select className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black outline-none focus:border-indigo-600 transition-all" value={meas.suitType} onChange={e => setMeas({ ...meas, suitType: e.target.value })}>{SUIT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Delivery Target</label>
            <input type="date" required className="w-full p-4 bg-white border-2 border-slate-200 rounded-2xl font-black outline-none focus:border-indigo-600 transition-all" value={meas.deliveryDate} onChange={e => setMeas({ ...meas, deliveryDate: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {['shoulder', 'chest', 'waist', 'neck', 'armLength', 'wrist', 'shirtLength', 'shalwarLength', 'paincha', 'damain'].map(f => (
          <div key={f}>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
            <input required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-indigo-600 focus:bg-white font-bold transition-all" placeholder="Inches" value={(meas as any)[f]} onChange={e => setMeas({ ...meas, [f]: e.target.value })} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100">
        <div><label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Bill</label><input type="number" className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none focus:border-indigo-600 transition-all" value={pay.stitchingPrice} onChange={e => setPay({ ...pay, stitchingPrice: Number(e.target.value) })} /></div>
        <div><label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Advance Paid</label><input type="number" className="w-full p-4 bg-white border-2 border-indigo-100 rounded-2xl font-black text-indigo-700 outline-none focus:border-indigo-600 transition-all" value={pay.advancePaid} onChange={e => setPay({ ...pay, advancePaid: Number(e.target.value) })} /></div>
        <div className="flex flex-col justify-center items-center"><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Remaining Due</p><p className="text-3xl font-black text-indigo-600">Rs. {due}</p></div>
      </div>

      <div className="sticky bottom-0 bg-white/80 backdrop-blur-md pt-6 pb-2 border-t border-slate-100">
        <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-2xl shadow-indigo-100 transition-all active:scale-95">FINALIZE ORDER & MEASUREMENTS</button>
      </div>
    </form>
  );
};

const CustomerDashboard: React.FC<{ 
  state: AppState; 
  customerId: string; 
  onLogout: () => void;
  onPhotoUpdate: (id: string, p: string[]) => void;
}> = ({ state, customerId, onLogout, onPhotoUpdate }) => {
  const customer = state.customers.find(c => c.id === customerId);
  const orders = useMemo(() => state.orders.filter(o => o.customerId === customerId), [state.orders, customerId]);

  if (!customer) return <div className="p-10 text-center font-bold">Authentication Error. Redirecting...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border-2 border-indigo-100 overflow-hidden shadow-inner">
            <img src={customer.profilePicture || PROF_1} className="w-full h-full object-cover" alt={customer.name} />
          </div>
          <div><h2 className="text-lg font-black text-indigo-600 leading-tight">Customer Portal</h2><p className="text-xs text-slate-400 font-bold uppercase tracking-tighter">Account: {customer.name}</p></div>
        </div>
        <button onClick={onLogout} className="p-3 text-slate-400 hover:text-red-600 transition-all rounded-xl hover:bg-red-50"><Icons.LogOut /></button>
      </header>
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="mb-10 text-center"><h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Track Your Style</h1><p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Hello {customer.name}, your stitching progress is below.</p></div>
        <div className="space-y-8">{orders.map(o => <CustomerOrderView key={o.id} order={o} onPhotoUpdate={p => onPhotoUpdate(o.id, p)} />)}</div>
        {orders.length === 0 && <div className="py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200"><p className="text-slate-400 font-black">No active orders found.</p></div>}
      </main>
    </div>
  );
};

const CustomerOrderView: React.FC<{ order: Order; onPhotoUpdate: (p: string[]) => void }> = ({ order, onPhotoUpdate }) => {
  const [tab, setTab] = useState<'status' | 'measure' | 'style' | 'chat'>('status');
  const fileRef = useRef<HTMLInputElement>(null);
  const statusMap = { [OrderStatus.PENDING]: 'amber', [OrderStatus.STITCHING]: 'blue', [OrderStatus.READY]: 'green', [OrderStatus.DELIVERED]: 'slate' };
  const color = (statusMap as any)[order.status] || 'indigo';

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-lg overflow-hidden transition-all hover:shadow-2xl">
      <div className={`p-8 bg-${color}-50 border-b border-${color}-100 flex flex-wrap items-center justify-between gap-6`}>
        <div><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">ORDER #{order.id.substr(0, 6)}</span><h3 className="text-3xl font-black text-slate-900">{order.measurements.suitType}</h3></div>
        <div className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border-2 border-${color}-200 bg-white text-${color}-600 shadow-sm animate-pulse`}>{order.status}</div>
      </div>
      <div className="flex bg-slate-50 border-b border-slate-100 overflow-x-auto p-2 gap-2">
        {['status', 'measure', 'style', 'chat'].map(t => (
          <button key={t} onClick={() => setTab(t as any)} className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${tab === t ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
        ))}
      </div>
      <div className="p-8 min-h-[350px]">
        {tab === 'status' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col items-center justify-center p-10 bg-slate-50 rounded-[2rem] text-center border border-slate-100 shadow-inner">
              <div className="p-6 bg-white rounded-3xl shadow-xl mb-6"><Icons.Status /></div>
              <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Status Update</p>
              <h4 className={`text-4xl font-black text-${color}-600 mb-2`}>{order.status}</h4>
              <p className="text-slate-500 font-bold">Delivery on: <span className="text-indigo-600">{order.measurements.deliveryDate}</span></p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm"><p className="text-slate-400 text-[10px] font-black uppercase mb-1">Total Package</p><p className="text-3xl font-black text-slate-900">Rs. {order.payment.stitchingPrice}</p></div>
              <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm"><p className="text-slate-400 text-[10px] font-black uppercase mb-1">Pending Amount</p><p className={`text-3xl font-black ${order.payment.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>Rs. {order.payment.remainingAmount}</p></div>
            </div>
          </div>
        )}
        {tab === 'measure' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-fadeIn">
            {Object.entries(order.measurements).map(([k, v]) => {
              if (['specialNotes', 'measurementDate', 'deliveryDate', 'suitType'].includes(k)) return null;
              return <div key={k} className="p-5 bg-slate-50 rounded-2xl border border-slate-100"><p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p><p className="text-2xl font-black text-slate-800">{v || '-'}</p></div>;
            })}
          </div>
        )}
        {tab === 'style' && (
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
              <div><h4 className="text-xl font-black text-slate-900">Design Board</h4><p className="text-sm text-slate-400 font-medium">Add photos for style references.</p></div>
              <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all"><Icons.Camera /> Upload Style</button>
              <input type="file" ref={fileRef} hidden accept="image/*" onChange={(e) => {
                 const file = e.target.files?.[0];
                 if (file) {
                   const reader = new FileReader();
                   reader.onload = () => onPhotoUpdate([...(order.photos || []), reader.result as string]);
                   reader.readAsDataURL(file);
                 }
              }} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {order.photos?.map((p, i) => <div key={i} className="aspect-square rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-slate-100"><img src={p} className="w-full h-full object-cover" alt="" /></div>)}
            </div>
          </div>
        )}
        {tab === 'chat' && (
          <div className="space-y-6 animate-fadeIn">
            {order.messages.map(m => (
              <div key={m.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"><Icons.Message /></div>
                  <div className="flex-1">
                    <p className="text-slate-800 text-xl font-medium mb-6">{m.english}</p>
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100"><p className="text-indigo-600 text-2xl font-black text-right" dir="rtl">{m.urdu}</p></div>
                    <p className="text-[10px] text-slate-300 mt-6 font-black uppercase tracking-widest">{new Date(m.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void }> = ({ title, children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl animate-scaleIn border border-white">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-8 overflow-y-auto max-h-[calc(92vh-6rem)] custom-scroll">{children}</div>
      </div>
    </div>
  );
};

export default App;