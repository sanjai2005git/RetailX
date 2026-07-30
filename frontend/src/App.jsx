import React, { useState, useEffect } from 'react';
import './App.css';

// Initial sample data for simulation fallback
const SAMPLE_PRODUCTS = [
  { id: 1, name: "Premium Wireless Headphones", description: "Noise-cancelling over-ear headphones with 40h battery life.", price: 299.99, stockQuantity: 45 },
  { id: 2, name: "Mechanical Gaming Keyboard", description: "Tactile brown switches, RGB backlit, aluminum frame.", price: 129.50, stockQuantity: 30 },
  { id: 3, name: "Ultra-Wide Gaming Monitor", description: "34-inch curved display, 144Hz refresh rate, 1ms response.", price: 499.00, stockQuantity: 15 },
  { id: 4, name: "Smart Fitness Watch", description: "Heart rate monitor, GPS tracking, waterproof, 7-day battery.", price: 189.99, stockQuantity: 60 }
];

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login | register
  const [user, setUser] = useState(null);
  
  // Form States
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Domain States
  const [products, setProducts] = useState(SAMPLE_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [sysLogs, setSysLogs] = useState([]);
  
  // Connectivity Sandbox Mode
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [cacheStatus, setCacheStatus] = useState({}); // tracking redis cache hits

  // API base (Routes via API Gateway)
  const API_BASE = "http://localhost:8088/api/v1";

  // Add system log helper
  const addLog = (message, service = 'SYSTEM') => {
    const timestamp = new Date().toLocaleTimeString();
    setSysLogs(prev => [{ time: timestamp, service, msg: message }, ...prev].slice(0, 30));
  };

  // Test gateway connectivity on mount
  useEffect(() => {
    addLog("Initializing RetailX platform...", "GATEWAY");
    fetch(`${API_BASE}/products`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setProducts(data);
        setIsSandboxMode(false);
        addLog("Connected to API Gateway. Fetching product catalog.", "GATEWAY");
      })
      .catch(() => {
        setIsSandboxMode(true);
        addLog("API Gateway / Services offline. Enabled Local Sandbox Environment.", "SANDBOX");
        // Prepopulate sandbox history
        setOrders([
          { id: 101, productId: 2, userId: 1, quantity: 1, totalPrice: 129.50, status: "SUCCESS", createdAt: new Date(Date.now() - 3600000).toISOString() }
        ]);
        setNotifications([
          { id: 'n1', userId: 1, orderId: 101, message: "Success! Your payment of $129.50 for Order #101 was processed successfully. Transaction ID: txn-8b2a5d-f938.", status: "SUCCESS", timestamp: new Date(Date.now() - 3590000).toISOString() }
        ]);
      });
  }, []);

  // Handle Authentication
  const handleAuth = (e) => {
    e.preventDefault();
    setAuthError('');

    if (isSandboxMode) {
      // Sandbox login
      if (authMode === 'login' && !usernameInput) {
        setAuthError("Please fill username");
        return;
      }
      const loggedUser = {
        username: usernameInput || "john_doe",
        email: emailInput || "john@retailx.com",
        token: "sandbox-jwt-token-xyz123",
        roles: ["USER"]
      };
      setUser(loggedUser);
      setIsAuthenticated(true);
      addLog(`Authenticated User: ${loggedUser.username}`, "USER-SERVICE");
      addLog("Issued mock JWT token", "USER-SERVICE");
    } else {
      // Real API authentication
      const path = authMode === 'login' ? '/auth/login' : '/auth/register';
      const body = authMode === 'login' 
        ? { username: usernameInput, password: passwordInput }
        : { username: usernameInput, email: emailInput, password: passwordInput };

      fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      .then(res => {
        if (!res.ok) throw new Error("Auth failed");
        return res.json();
      })
      .then(data => {
        setUser(data); // token, username, email, roles
        setIsAuthenticated(true);
        addLog(`Authenticated User: ${data.username}`, "USER-SERVICE");
      })
      .catch(err => {
        setAuthError("Authentication failed. Please verify credentials or run in local sandbox.");
      });
    }
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setCart([]);
    addLog("User logged out.", "USER-SERVICE");
  };

  // Add Product to Cart
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
    addLog(`Added to cart: ${product.name}`, "FRONTEND");
  };

  // Fetch product from redis simulation
  const simulateRedisFetch = (productId) => {
    // Redis cache simulation visualization
    const isCached = cacheStatus[productId];
    setCacheStatus(prev => ({ ...prev, [productId]: true }));
    
    if (isCached) {
      addLog(`Redis Cache Hit for Product ID: ${productId} (Response latency: ~2ms)`, "PRODUCT-SERVICE");
    } else {
      addLog(`Redis Cache Miss for Product ID: ${productId}. Loaded from PostgreSQL (Response latency: ~120ms)`, "PRODUCT-SERVICE");
      addLog(`Cached Product ID: ${productId} in Redis for subsequent loads`, "REDIS");
    }
  };

  // Place Order
  const handleCheckout = () => {
    if (cart.length === 0) return;

    // We process the first item for event visualization
    const item = cart[0];
    const total = item.price * item.qty;

    if (isSandboxMode) {
      // Sandbox Simulation Mode
      const newOrderId = Math.floor(Math.random() * 900) + 100;
      const newOrder = {
        id: newOrderId,
        productId: item.id,
        userId: 1,
        quantity: item.qty,
        totalPrice: total,
        status: "PENDING",
        createdAt: new Date().toISOString()
      };

      setOrders(prev => [newOrder, ...prev]);
      setCart([]);
      addLog(`Order #${newOrderId} inserted in PostgreSQL (PENDING)`, "ORDER-SERVICE");
      addLog(`AMQP: Published OrderEvent for Order #${newOrderId} to 'order_exchange'`, "ORDER-SERVICE");

      // Stage 2: Payment Service consumes from RabbitMQ
      setTimeout(() => {
        addLog(`AMQP: Consumer received OrderEvent for Order #${newOrderId}`, "PAYMENT-SERVICE");
        addLog(`Processing payment check for $${total.toFixed(2)}`, "PAYMENT-SERVICE");

        // Stage 3: Payment processed, saved to Payment Service PostgreSQL database
        setTimeout(() => {
          const txnId = 'txn-' + Math.random().toString(36).substr(2, 6) + '-' + Math.random().toString(36).substr(2, 4);
          addLog(`Payment APPROVED. Saved transaction ${txnId} to PostgreSQL`, "PAYMENT-SERVICE");
          addLog(`AMQP: Published PaymentEvent to 'payment_exchange'`, "PAYMENT-SERVICE");

          // Stage 4: Notification service consumes PaymentEvent
          setTimeout(() => {
            addLog(`AMQP: Consumer received PaymentEvent for Order #${newOrderId}`, "NOTIFICATION-SERVICE");
            
            // Register Notification
            const newNotif = {
              id: 'n-' + Date.now(),
              userId: 1,
              orderId: newOrderId,
              message: `Success! Your payment of $${total.toFixed(2)} for Order #${newOrderId} was processed successfully. Transaction ID: ${txnId}.`,
              status: "SUCCESS",
              timestamp: new Date().toISOString()
            };
            setNotifications(prev => [newNotif, ...prev]);
            
            // Update order status in order-service
            setOrders(prev => prev.map(o => o.id === newOrderId ? { ...o, status: "SUCCESS" } : o));
            addLog(`Dispatched user alert notification. Order #${newOrderId} status set to SUCCESS`, "NOTIFICATION-SERVICE");

          }, 1000);

        }, 1200);

      }, 1000);

    } else {
      // Real API checkout
      fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          productId: item.id,
          userId: 1, // Assume sandbox user id
          quantity: item.qty,
          totalPrice: total
        })
      })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(order => {
        setOrders(prev => [order, ...prev]);
        setCart([]);
        addLog(`Placed Order #${order.id} via API Gateway`, "FRONTEND");
      })
      .catch(() => {
        addLog("Order creation failed on remote server.", "ORDER-SERVICE");
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <div className="card login-card">
          <h2 style={{ marginBottom: '0.5rem' }}>RetailX E-Commerce</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Microservices System Demo Console
          </p>
          
          <form onSubmit={handleAuth}>
            <div className="form-group">
              <label>Username</label>
              <input 
                type="text" 
                className="form-control" 
                value={usernameInput} 
                onChange={e => setUsernameInput(e.target.value)} 
                placeholder="enter username" 
                required
              />
            </div>
            
            {authMode === 'register' && (
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={emailInput} 
                  onChange={e => setEmailInput(e.target.value)} 
                  placeholder="name@example.com" 
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                className="form-control" 
                value={passwordInput} 
                onChange={e => setPasswordInput(e.target.value)} 
                placeholder="••••••••" 
                required
              />
            </div>

            {authError && <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', marginBottom: '1rem' }}>{authError}</div>}

            <button type="submit" className="btn-success" style={{ width: '100%', padding: '0.85rem' }}>
              {authMode === 'login' ? 'Sign In to Console' : 'Register Account'}
            </button>
          </form>

          <div className="auth-toggle">
            {authMode === 'login' ? (
              <>First time here? <span onClick={() => setAuthMode('register')}>Create account</span></>
            ) : (
              <>Already registered? <span onClick={() => setAuthMode('login')}>Sign In</span></>
            )}
          </div>
          
          <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Note: System will use local simulator if Gateway backend is unreachable.
          </div>
        </div>
      </div>
    );
  }

  const cartTotal = cart.reduce((acc, curr) => acc + (curr.price * curr.qty), 0);

  return (
    <div className="app-container">
      <div className="header">
        <div className="brand-section">
          <h1>RetailX Console 
            <span className="architecture-tag">
              {isSandboxMode ? "Sandbox Simulator" : "Gateway Connected"}
            </span>
          </h1>
          <p>Real-time microservices coordination dashboard (Spring Boot, RabbitMQ, Redis, PostgreSQL)</p>
        </div>
        
        <div className="auth-badge">
          <div className="user-dot"></div>
          <span style={{ fontWeight: 600 }}>{user?.username}</span>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Storefront, Orders */}
        <div className="main-content">
          
          {/* Product Catalog */}
          <div className="card">
            <div className="card-title">
              <h2>Product Catalog</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click catalog items to check Redis Caching</span>
            </div>
            <div className="product-grid">
              {products.map(prod => (
                <div className="product-item" key={prod.id}>
                  <div>
                    <div className="product-name" onClick={() => simulateRedisFetch(prod.id)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                      {prod.name}
                    </div>
                    <div className="product-desc">{prod.description}</div>
                  </div>
                  <div className="product-meta">
                    <div className="product-price">${prod.price.toFixed(2)}</div>
                    <button className="btn-primary" onClick={() => addToCart(prod)}>Add to Cart</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Orders History */}
          <div className="card">
            <div className="card-title">
              <h2>Orders History</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PostgreSQL Store</span>
            </div>
            
            <div className="table-container">
              {orders.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No orders placed yet.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const prod = products.find(p => p.id === order.productId) || { name: `Product ID: ${order.productId}` };
                      return (
                        <tr key={order.id}>
                          <td style={{ fontWeight: 600 }}>#{order.id}</td>
                          <td>{prod.name}</td>
                          <td>{order.quantity}</td>
                          <td>${order.totalPrice.toFixed(2)}</td>
                          <td>
                            <span className={`status-pill ${order.status.toLowerCase()}`}>
                              {order.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Cart, Notifications & Event Stream */}
        <div className="sidebar">
          
          {/* Shopping Cart */}
          <div className="card">
            <div className="card-title">
              <h2>Shopping Cart</h2>
            </div>
            {cart.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Cart is empty.</p>
            ) : (
              <div>
                <div className="cart-list">
                  {cart.map(item => (
                    <div className="cart-item" key={item.id}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Qty: {item.qty} × ${item.price.toFixed(2)}</div>
                      </div>
                      <div style={{ fontWeight: 600 }}>${(item.price * item.qty).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                
                <div className="cart-totals">
                  <span>Total Amount</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>
                
                <button className="btn-success" onClick={handleCheckout}>
                  Place Order (Triggers Event Flow)
                </button>
              </div>
            )}
          </div>

          {/* User Notifications */}
          <div className="card">
            <div className="card-title">
              <h2>User Notifications</h2>
              <span className="status-pill success" style={{ animation: 'pulse 2s infinite' }}>Real-time</span>
            </div>
            
            <div className="notification-list">
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No notifications received.</p>
              ) : (
                notifications.map(notif => (
                  <div className={`notification-item ${notif.status.toLowerCase()}`} key={notif.id}>
                    <p style={{ margin: 0 }}>{notif.message}</p>
                    <span className="notification-time">{new Date(notif.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Microservices System Logs */}
          <div className="card" style={{ background: '#020617', border: '1px solid #1e293b' }}>
            <div className="card-title">
              <h2 style={{ color: '#38bdf8' }}>Async Event Stream</h2>
              <button 
                className="btn-secondary" 
                style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}
                onClick={() => setSysLogs([])}
              >
                Clear
              </button>
            </div>
            <div style={{ maxHeight: '250px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.75rem' }}>
              {sysLogs.length === 0 ? (
                <div style={{ color: '#475569' }}>Logs empty. Trigger checkout to spawn asynchronous microservice events...</div>
              ) : (
                sysLogs.map((log, index) => (
                  <div key={index} style={{ marginBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.25rem' }}>
                    <span style={{ color: '#64748b' }}>[{log.time}]</span>{' '}
                    <span style={{ 
                      color: log.service.includes('AMQP') || log.service.includes('RABBIT') ? '#f43f5e' 
                            : log.service.includes('REDIS') ? '#fbbf24' 
                            : log.service.includes('SERVICE') ? '#34d399' 
                            : '#60a5fa', 
                      fontWeight: 'bold' 
                    }}>[{log.service}]</span>:{' '}
                    <span style={{ color: '#cbd5e1' }}>{log.msg}</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
