import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase/config';

import ProductCard from './components/ProductCard.jsx';
import ProductDetailModal from './components/ProductDetailModal.jsx';
import AdminPanel from './components/AdminPanel';
import Checkout from './components/Checkout';
import AuthForm from './components/AuthForm';
import NoticeModal from './components/NoticeModal';
import Encargos from './components/Encargos';
import CartModal from './components/CartModal.jsx';

import logoHubKickz from './assets/logo-hubkickz.jpg';

function TitledText({ text }) {
  if (typeof text !== 'string') return text;
  const regex = /([ÁÉÍÓÚáéíóú])/g;
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const upper = part.toUpperCase();
        if (upper === 'Á') return <span key={index} className="tilde-char tilde-a">A</span>;
        if (upper === 'É') return <span key={index} className="tilde-char tilde-e">E</span>;
        if (upper === 'Í') return <span key={index} className="tilde-char tilde-i">I</span>;
        if (upper === 'Ó') return <span key={index} className="tilde-char tilde-o">O</span>;
        if (upper === 'Ú') return <span key={index} className="tilde-char tilde-u">U</span>;
        return part;
      })}
    </>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [showCartModal, setShowCartModal] = useState(false);
  const [selectedProductModal, setSelectedProductModal] = useState(null);

  const [productos, setProductos] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [activeCategory, setActiveCategory] = useState('INICIO'); 
  const [activeSubcategory, setActiveSubcategory] = useState(null);
  const [activeView, setActiveView] = useState('tienda'); 
  const [cart, setCart] = useState([]);

  const [showRopaDropdown, setShowRopaDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowRopaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const productosRef = collection(db, 'productos');
    const unsubscribe = onSnapshot(
      productosRef,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProductos(docs);
        setLoadingProducts(false);
      },
      (error) => {
        console.error('Error al cargar productos:', error);
        setLoadingProducts(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddToCart = (product, selectedSize, qty = 1) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.id === product.id && item.selectedSize === selectedSize
      );
      const parsedQty = Math.max(1, Number(qty) || 1);

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + parsedQty
        };
        return updated;
      }
      return [...prevCart, { ...product, selectedSize, quantity: parsedQty }];
    });
    setShowCartModal(true);
  };

  const handleUpdateCartQuantity = (productId, selectedSize, newQty) => {
    setCart((prevCart) => {
      if (newQty <= 0) {
        return prevCart.filter((item) => !(item.id === productId && item.selectedSize === selectedSize));
      }
      return prevCart.map((item) => {
        if (item.id === productId && item.selectedSize === selectedSize) {
          return { ...item, quantity: newQty };
        }
        return item;
      });
    });
  };

  const clearCart = () => setCart([]);

  const totalCartUSD = cart.reduce(
    (sum, item) => sum + (Number(item.precio || item.price) || 0) * item.quantity,
    0
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActiveView('tienda');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    if (activeCategory === 'INICIO' || activeCategory === 'TODOS') return true;
    
    const cat = (p.categoria || p.category || '').toUpperCase();
    const subcat = (p.subcategoria || p.subcategory || '').toUpperCase();

    if (activeSubcategory) {
      return cat === activeCategory.toUpperCase() && subcat === activeSubcategory.toUpperCase();
    }

    return cat === activeCategory.toUpperCase();
  });

  const handleNavClick = (category) => {
    setActiveView('tienda');
    setActiveCategory(category);
    setActiveSubcategory(null);
    setShowRopaDropdown(false);
  };

  const handleSubcategoryClick = (subcat) => {
    setActiveView('tienda');
    setActiveCategory('ROPA');
    setActiveSubcategory(subcat);
    setShowRopaDropdown(false);
  };

  const handleSelectProductFromCart = (product) => {
    setShowCartModal(false);
    setSelectedProductModal(product);
  };

  return (
    <div className="site-wrapper">
      <style>{`
        @keyframes dropdownSlide {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <NoticeModal 
        isOpen={showNotice} 
        onClose={() => setShowNotice(false)} 
      />

      <CartModal 
        isOpen={showCartModal}
        onClose={() => setShowCartModal(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onSelectProduct={handleSelectProductFromCart}
        onGoToCheckout={() => {
          setShowCartModal(false);
          setActiveView('checkout');
        }}
      />

      {selectedProductModal && (
        <ProductDetailModal 
          product={selectedProductModal}
          onClose={() => setSelectedProductModal(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      <header className="site-header">
        <div className="header-container">
          <div className="brand-logo-text" onClick={() => handleNavClick('INICIO')}>
            <h1 className="brand-title">HUB KICKZ</h1>
            <span className="brand-subtitle">HYPE 100% ORIGINAL</span>
          </div>

          <nav className="main-nav">
            <button type="button" className={`nav-link ${activeView === 'tienda' && activeCategory === 'INICIO' ? 'active' : ''}`} onClick={() => handleNavClick('INICIO')}>INICIO</button>
            
            <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                type="button" 
                className={`nav-link ${activeView === 'tienda' && activeCategory === 'ROPA' ? 'active' : ''}`} 
                onClick={() => setShowRopaDropdown(!showRopaDropdown)}
              >
                ROPA ▾
              </button>

              {showRopaDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: '#0c0c0f',
                  border: '1px solid #1f1f26',
                  borderRadius: '2px',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.6)',
                  zIndex: 1000,
                  minWidth: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '6px 0',
                  fontFamily: 'monospace, sans-serif',
                  animation: 'dropdownSlide 0.25s ease-out forwards'
                }}>
                  <button 
                    type="button" 
                    onClick={() => handleSubcategoryClick('SNEAKERS')}
                    style={{ background: 'none', border: 'none', color: activeSubcategory === 'SNEAKERS' ? '#ff1e2d' : '#ccc', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '1px' }}
                    onMouseEnter={(e) => e.target.style.color = '#ff1e2d'}
                    onMouseLeave={(e) => e.target.style.color = activeSubcategory === 'SNEAKERS' ? '#ff1e2d' : '#ccc'}
                  >
                    SNEAKERS
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSubcategoryClick('REMERAS')}
                    style={{ background: 'none', border: 'none', color: activeSubcategory === 'REMERAS' ? '#ff1e2d' : '#ccc', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '1px' }}
                    onMouseEnter={(e) => e.target.style.color = '#ff1e2d'}
                    onMouseLeave={(e) => e.target.style.color = activeSubcategory === 'REMERAS' ? '#ff1e2d' : '#ccc'}
                  >
                    REMERAS
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSubcategoryClick('BUZOS')}
                    style={{ background: 'none', border: 'none', color: activeSubcategory === 'BUZOS' ? '#ff1e2d' : '#ccc', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '1px' }}
                    onMouseEnter={(e) => e.target.style.color = '#ff1e2d'}
                    onMouseLeave={(e) => e.target.style.color = activeSubcategory === 'BUZOS' ? '#ff1e2d' : '#ccc'}
                  >
                    BUZOS
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSubcategoryClick('SHORTS')}
                    style={{ background: 'none', border: 'none', color: activeSubcategory === 'SHORTS' ? '#ff1e2d' : '#ccc', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '1px' }}
                    onMouseEnter={(e) => e.target.style.color = '#ff1e2d'}
                    onMouseLeave={(e) => e.target.style.color = activeSubcategory === 'SHORTS' ? '#ff1e2d' : '#ccc'}
                  >
                    SHORTS
                  </button>
                  <button 
                    type="button" 
                    onClick={() => handleSubcategoryClick('CAMPERAS')}
                    style={{ background: 'none', border: 'none', color: activeSubcategory === 'CAMPERAS' ? '#ff1e2d' : '#ccc', padding: '10px 16px', textAlign: 'left', cursor: 'pointer', fontSize: '0.8rem', letterSpacing: '1px' }}
                    onMouseEnter={(e) => e.target.style.color = '#ff1e2d'}
                    onMouseLeave={(e) => e.target.style.color = activeSubcategory === 'CAMPERAS' ? '#ff1e2d' : '#ccc'}
                  >
                    CAMPERAS
                  </button>
                </div>
              )}
            </div>

            <button type="button" className={`nav-link ${activeView === 'tienda' && activeCategory === 'PERFUMES' ? 'active' : ''}`} onClick={() => handleNavClick('PERFUMES')}>PERFUMES</button>
            <button type="button" className={`nav-link ${activeView === 'encargos' ? 'active' : ''}`} onClick={() => setActiveView('encargos')}>ENCARGOS</button>
            <button type="button" className={`nav-link ${activeView === 'tienda' && activeCategory === 'ENVIOS' ? 'active' : ''}`} onClick={() => handleNavClick('ENVIOS')}>ENVÍOS</button>
            <button type="button" className={`nav-link ${activeView === 'tienda' && activeCategory === 'NOSOTROS' ? 'active' : ''}`} onClick={() => handleNavClick('NOSOTROS')}>MÁS SOBRE NOSOTROS</button>
            <button type="button" className={`nav-link ${activeView === 'tienda' && activeCategory === 'CONTACTO' ? 'active' : ''}`} onClick={() => handleNavClick('CONTACTO')}>CONTACTO</button>
          </nav>

          <div className="nav-icons-group">
            {user && (
              <button type="button" className={`nav-icon-btn admin-badge-btn ${activeView === 'admin' ? 'active' : ''}`} onClick={() => setActiveView('admin')} title="Panel Admin">
                Admin
              </button>
            )}

            {user ? (
              <button type="button" className="nav-icon-btn logout-icon-btn" onClick={handleLogout} title="Cerrar Sesión">
                {user.email.split('@')[0]} (Salir)
              </button>
            ) : (
              <button type="button" className="nav-icon-btn" onClick={() => setShowAuthModal(true)} title="Iniciar Sesión">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            )}

            <button 
              type="button"
              className={`nav-icon-btn cart-icon-btn ${showCartModal ? 'active' : ''}`} 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCartModal(true);
              }}
              title="Ver Carrito"
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
              {cart.length > 0 && <span className="cart-badge">{cart.reduce((acc, item) => acc + item.quantity, 0)}</span>}
            </button>
          </div>
        </div>
      </header>

      {showAuthModal && !user && (
        <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close-modal-btn" onClick={() => setShowAuthModal(false)}>✕</button>
            <AuthForm onLoginSuccess={() => setShowAuthModal(false)} />
          </div>
        </div>
      )}

      {activeView === 'tienda' && (
        <>
          <section className="hero-banner">
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <div className="hk-hero-logo-wrapper">
                <img src={logoHubKickz} alt="HUB KICKZ Logo" className="hk-hero-logo-img" />
              </div>
            </div>
          </section>

          {activeCategory === 'ENVIOS' ? (
            <section className="catalog-section" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', color: '#ccc', fontFamily: 'monospace, sans-serif' }}>
              <div style={{ background: '#0b0b0e', border: '1px solid #1a1a22', padding: '30px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <h2 style={{ color: '#ff1e2d', fontSize: '1.4rem', fontFamily: 'serif', letterSpacing: '1px', marginBottom: '4px' }}>
                  Envíos a todo el país
                </h2>
                
                <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: '#ddd' }}>
                  Despachamos nuestros productos a todo el territorio nacional a través de Correo Argentino.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#ff1e2d' }}>•</span>
                    <div><strong style={{ color: '#fff' }}>Tiempos de entrega:</strong> 1 día (Corrientes Capital), 3 a 5 días hábiles (Resto del país) tras confirmar la compra.</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#ff1e2d' }}>•</span>
                    <div><strong style={{ color: '#fff' }}>Retiros en local:</strong> Disponibles sin costo adicional.</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <span style={{ color: '#ff1e2d' }}>•</span>
                    <div><strong style={{ color: '#fff' }}>Pagos:</strong> Mercado Pago (pesos al dólar oficial) o Transferencia.</div>
                  </div>
                </div>

              </div>
            </section>
          ) : activeCategory === 'NOSOTROS' ? (
            <section className="catalog-section" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', lineHeight: '1.8', color: '#ccc', fontFamily: 'monospace, sans-serif' }}>
              <div className="section-title-wrap" style={{ marginBottom: '30px' }}>
                <h2><TitledText text="MÁS SOBRE NOSOTROS" /></h2>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '0.95rem' }}>
                <p>HubKickz nace de una pasión: encontrar y acercar productos que realmente se diferencian.</p>
                
                <p>Somos una tienda especializada en sneakers, streetwear y productos exclusivos, enfocada en ofrecer ítems 100% originales y seleccionados cuidadosamente para quienes buscan algo que sobrepasa lo convencional.</p>
                
                <p>Trabajamos con marcas y modelos reconocidos a nivel mundial dentro de la cultura urbana, combinando calidad, autenticidad y una selección que prioriza lo distinto.</p>
                
                <p>Además, contamos con un sistema de encargos y pedidos personalizados para conseguir esas piezas específicas que no siempre se encuentran disponibles en el mercado, pero te llamaron la atención en algún lado que las viste.</p>
                
                <p>En HubKickz cuidamos cada parte de la experiencia: desde la selección y verificación de los productos hasta la presentación y atención personalizada. Buscamos que cada compra sea una experiencia segura, clara y a la altura de las cosas que ofrecemos para que cuando recibas el producto, tus expectativas hayan sido ampliamente superadas.</p>
                
                <div style={{ marginTop: '20px' }}>
                  <h3 style={{ fontSize: '1.2rem', color: '#fff', fontFamily: 'serif', marginBottom: '8px' }}>Originalidad, exclusividad y confianza.</h3>
                  <h3 style={{ fontSize: '1.2rem', color: '#ff1e2d', fontFamily: 'serif' }}>Eso es HubKickz.</h3>
                </div>

                <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#777', letterSpacing: '1px' }}>
                  Streetwear &bull; Sneakers &bull; Hype
                </div>
              </div>
            </section>
          ) : activeCategory === 'CONTACTO' ? (
            <section className="catalog-section" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', color: '#ccc', fontFamily: 'monospace, sans-serif' }}>
              <div style={{ background: '#0b0b0e', border: '1px solid #1a1a22', padding: '30px', borderRadius: '4px', display: 'flex', flexDirection: 'column', gap: '25px' }}>
                
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#ddd' }}>
                  ¿Tenés dudas sobre algún talle, modelo, método de envío o querés hacer un encargo personalizado? Ponete en contacto con nosotros a través de nuestros canales oficiales:
                </p>

                <div style={{ background: '#0e0e12', border: '1px solid #1f1f26', padding: '16px 20px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: '#ff1e2d', fontSize: '1.4rem' }}>📞</span>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '1.5px', display: 'block', marginBottom: '4px' }}>WHATSAPP / ATENCIÓN DIRECTA</span>
                    <a href="https://wa.me/543794123456" target="_blank" rel="noreferrer" style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '1px' }}>
                      +54 379 412-3456
                    </a>
                  </div>
                </div>

                <div style={{ background: '#0e0e12', border: '1px solid #1f1f26', padding: '16px 20px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: '#ff1e2d', fontSize: '1.4rem' }}>📸</span>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '1.5px', display: 'block', marginBottom: '4px' }}>INSTAGRAM OFICIAL</span>
                    <a href="https://instagram.com/hubkickz" target="_blank" rel="noreferrer" style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '1px' }}>
                      @hubkickz
                    </a>
                  </div>
                </div>

                <div style={{ background: '#0e0e12', border: '1px solid #1f1f26', padding: '16px 20px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ color: '#ff1e2d', fontSize: '1.4rem' }}>✉️</span>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: '#888', letterSpacing: '1.5px', display: 'block', marginBottom: '4px' }}>CORREO ELECTRÓNICO</span>
                    <a href="mailto:hubkickzcorrientes@gmail.com" style={{ color: '#fff', fontSize: '1.05rem', fontWeight: 'bold', textDecoration: 'none', letterSpacing: '1px' }}>
                      hubkickzcorrientes@gmail.com
                    </a>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #1f1f26', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#888' }}>
                  <div>
                    <span style={{ color: '#ff1e2d', marginRight: '6px' }}>📍</span>
                    <strong style={{ color: '#fff' }}>Ubicación:</strong> Corrientes Capital, Argentina.
                  </div>
                  <div>
                    <span style={{ color: '#ff1e2d', marginRight: '6px' }}>🕒</span>
                    <span>Horarios de atención: Lunes a Sábados de 10:00 a 20:00 hs.</span>
                  </div>
                </div>

              </div>
            </section>
          ) : (
            <section className="catalog-section">
              <div className="section-title-wrap">
                <h2><TitledText text={activeSubcategory ? `${activeCategory} / ${activeSubcategory}` : (activeCategory === 'INICIO' ? 'CATÁLOGO EXCLUSIVO' : activeCategory)} /></h2>
                <p className="subtitle-text">Todos los precios están expresados en USD (Se abonará en ARS al dólar oficial seleccionando Mercado Pago)</p>
              </div>

              {loadingProducts ? (
                <div className="status-message">Cargando colección...</div>
              ) : productosFiltrados.length === 0 ? (
                <div className="status-message">No se encontraron productos en esta subcategoría.</div>
              ) : (
                <div className="products-grid">
                  {productosFiltrados.map((producto) => (
                    <ProductCard 
                      key={producto.id} 
                      product={producto} 
                      onAddToCart={handleAddToCart} 
                      onSelectProduct={setSelectedProductModal}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {activeView === 'encargos' && (
        <div className="page-container"><Encargos /></div>
      )}

      {activeView === 'checkout' && (
        <div className="page-container">
          <Checkout
            cart={cart}
            totalAmount={totalCartUSD}
            clearCart={clearCart}
            onOrderSuccess={(orderId) => {
              alert(`¡Pedido #${orderId} realizado con éxito!`);
              setActiveView('tienda');
            }}
          />
        </div>
      )}

      {activeView === 'admin' && (
        <div className="page-container"><AdminPanel /></div>
      )}
    </div>
  );
}