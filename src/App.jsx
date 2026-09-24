import React, { useState, useRef, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification
} from "firebase/auth";
import { collection, onSnapshot, addDoc, deleteDoc, doc, setDoc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from './firebase/config'; 
import SalesDashboard from './SalesDashboard';
import Checkout from './components/Checkout';

const logoUrl = "/logo-hubkickz.jpg";
const ADMIN_EMAIL = "hubkickzcorrientes@gmail.com";

const TALLES_ROPA_OPCIONES = ["S", "M", "L", "XL", "XXL"];
const TALLES_KICKZ_OPCIONES = ["US 7", "US 8", "US 9", "US 10", "US 11", "US 12"];

const uploadToCloudinary = async (file) => {
  const data = new FormData();
  data.append("file", file);
  data.append("upload_preset", "hubkickz_productos");
  
  const res = await fetch("https://api.cloudinary.com/v1_1/geavvy5g/image/upload", {
    method: "POST",
    body: data,
  });

  const json = await res.json();
  return json.secure_url;
};

// Configuraciones de animación suaves
const smoothTransition = { duration: 0.4, ease: [0.16, 1, 0.3, 1] };
const springTransition = { type: "spring", stiffness: 300, damping: 25 };

export default function App() {
  const [showNotice, setShowNotice] = useState(true);
  const heroRef = useRef(null);

  // --- ESTADOS DE FIREBASE & NAVEGACIÓN ---
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login"); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [canResendVerification, setCanResendVerification] = useState(false);
  
  const [currentView, setCurrentView] = useState("store"); 
  const [adminTab, setAdminTab] = useState("productos"); // "productos" | "pedidos" | "dashboard"
  const [selectedCategory, setSelectedCategory] = useState("TODOS");
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [isRopaHovered, setIsRopaHovered] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [showProdModal, setShowProdModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodCategory, setProdCategory] = useState("ROPA");
  const [prodSubcategory, setProdSubcategory] = useState("REMERAS");
  const [prodTag, setProdTag] = useState("NEW DROP");
  const [prodTalles, setProdTalles] = useState([]);
  
  const [imagenFrenteFile, setImagenFrenteFile] = useState(null);
  const [previewFrente, setPreviewFrente] = useState("");
  const [imagenEspaldaFile, setImagenEspaldaFile] = useState(null);
  const [previewEspalda, setPreviewEspalda] = useState("");

  const loadUserData = async (currentUser) => {
    try {
      const userDocRef = doc(db, "usuarios", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const data = userDoc.exists() ? userDoc.data() : {};
      
      const isAdmin = currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      const fullUserData = {
        uid: currentUser.uid,
        email: currentUser.email,
        nombre: data.nombre || currentUser.displayName || "",
        telefono: data.telefono || "",
        direccion: data.direccion || "",
        ciudad: data.ciudad || "",
        isAdmin: isAdmin
      };

      setUser(fullUserData);
      setNombre(fullUserData.nombre);
      setTelefono(fullUserData.telefono);
      setDireccion(fullUserData.direccion);
      setCiudad(fullUserData.ciudad);
    } catch (err) {
      console.error("Error al cargar datos del usuario:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (!currentUser.emailVerified && currentUser.providerData[0]?.providerId === "password") {
          setUser(null);
        } else {
          await loadUserData(currentUser);
        }
      } else {
        setUser(null);
        setNombre("");
        setTelefono("");
        setDireccion("");
        setCiudad("");
        if (currentView === "admin") setCurrentView("store");
      }
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, [currentView]);

  useEffect(() => {
    const productsRef = collection(db, "productos");
    const unsubscribe = onSnapshot(productsRef, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setProducts(docs);
    }, (err) => console.error("Error al sincronizar productos de Firestore:", err));

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.isAdmin && currentView === "admin") {
      const ordersRef = collection(db, "pedidos");
      const unsubscribe = onSnapshot(ordersRef, (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        docs.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        setOrders(docs);
      }, (err) => console.error("Error al sincronizar pedidos de Firestore:", err));

      return () => unsubscribe();
    }
  }, [user, currentView]);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    setCanResendVerification(false);
    setAuthLoading(true);

    try {
      if (authMode === "login") {
        const res = await signInWithEmailAndPassword(auth, email, password);
        
        if (!res.user.emailVerified && res.user.providerData[0]?.providerId === "password") {
          setAuthError("Tu casilla de correo aún no ha sido verificada.");
          setCanResendVerification(true);
          await signOut(auth);
          setAuthLoading(false);
          return;
        }

        if (res.user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          setCurrentView("admin");
        }
        setShowAuthModal(false);
      } else if (authMode === "register") {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        await sendEmailVerification(newUser);

        const profileData = {
          uid: newUser.uid,
          email: newUser.email,
          nombre,
          telefono,
          direccion,
          ciudad,
          createdAt: serverTimestamp(),
          role: newUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "cliente"
        };

        await setDoc(doc(db, "usuarios", newUser.uid), profileData);
        await signOut(auth);
        
        setAuthSuccess("Cuenta creada. Te enviamos un correo de verificación. Por favor verifícalo antes de ingresar.");
        setAuthMode("login");
      } else if (authMode === "reset") {
        await sendPasswordResetEmail(auth, email);
        setAuthSuccess("Enlace enviado a tu correo electrónico.");
        setAuthLoading(false);
        return;
      } else if (authMode === "profile") {
        if (!user) return;
        
        await setDoc(doc(db, "usuarios", user.uid), {
          nombre,
          telefono,
          direccion,
          ciudad,
          updatedAt: serverTimestamp()
        }, { merge: true });

        setUser((prev) => ({
          ...prev,
          nombre,
          telefono,
          direccion,
          ciudad
        }));

        setAuthSuccess("Perfil actualizado con éxito.");
        setTimeout(() => setShowAuthModal(false), 1200);
      }

      if (authMode !== "register") {
        setEmail("");
        setPassword("");
      }
    } catch (err) {
      console.error(err);
      switch (err.code) {
        case "auth/email-already-in-use":
          setAuthError("El correo electrónico ya está registrado.");
          break;
        case "auth/invalid-email":
          setAuthError("El formato del correo es inválido.");
          break;
        case "auth/weak-password":
          setAuthError("La contraseña debe tener mínimo 6 caracteres.");
          break;
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setAuthError("Credenciales incorrectas.");
          break;
        default:
          setAuthError("Error al procesar la solicitud.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendVerificationModal = async () => {
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      if (res.user) {
        await sendEmailVerification(res.user);
        await signOut(auth);
        setAuthSuccess("Correo de verificación reenviado. Revisa tu bandeja de entrada.");
        setCanResendVerification(false);
      }
    } catch (err) {
      if (err.code === "auth/too-many-requests") {
        setAuthError("Demasiados intentos. Aguarda unos minutos antes de reintentar.");
      } else {
        setAuthError("No se pudo reenviar la verificación. Confirma tu clave.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setAuthSuccess("");
    setCanResendVerification(false);
    setAuthLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const res = await signInWithPopup(auth, provider);
      const googleUser = res.user;

      await setDoc(doc(db, "usuarios", googleUser.uid), {
        uid: googleUser.uid,
        email: googleUser.email,
        nombre: googleUser.displayName || "",
        lastLogin: serverTimestamp(),
        role: googleUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "cliente"
      }, { merge: true });

      if (googleUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setCurrentView("admin");
      }
      setShowAuthModal(false);
    } catch (err) {
      console.error(err);
      setAuthError("Error al iniciar sesión con Google.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCart([]);
    setShowUserMenu(false);
    setCurrentView("store");
  };

  const addToCart = (product, selectedTalle) => {
    const itemKey = `${product.id}-${selectedTalle || 'UNICO'}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.cartKey === itemKey);
      if (existing) {
        return prev.map((item) =>
          item.cartKey === itemKey ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, talleElegido: selectedTalle || null, cartKey: itemKey, quantity: 1 }];
    });
  };

  const removeFromCart = (cartKey) => {
    setCart((prev) => prev.filter((item) => item.cartKey !== cartKey));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (parseFloat(item.precio) || 0) * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setIsCartOpen(false);
    setCurrentView("checkout");
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "pedidos", orderId), {
        estado: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Error al actualizar estado del pedido:", err);
      alert("No se pudo actualizar el estado del pedido.");
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setProdName("");
    setProdPrice("");
    setProdCategory("ROPA");
    setProdSubcategory("REMERAS");
    setProdTag("NEW DROP");
    setProdTalles(["S", "M", "L", "XL"]);
    setImagenFrenteFile(null);
    setPreviewFrente("");
    setImagenEspaldaFile(null);
    setPreviewEspalda("");
    setShowProdModal(true);
  };

  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setProdName(product.nombre || "");
    setProdPrice(product.precio || "");
    setProdCategory(product.categoria || "ROPA");
    setProdSubcategory(product.subcategoria || "REMERAS");
    setProdTag(product.tag || "NEW DROP");
    setProdTalles(product.talles || []);
    setImagenFrenteFile(null);
    setPreviewFrente(product.imagenFrente || product.imagen || "");
    setImagenEspaldaFile(null);
    setPreviewEspalda(product.imagenEspalda || "");
    setShowProdModal(true);
  };

  const toggleTalleOption = (talle) => {
    setProdTalles((prev) => 
      prev.includes(talle) ? prev.filter((t) => t !== talle) : [...prev, talle]
    );
  };

  const handleFrenteChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagenFrenteFile(file);
      setPreviewFrente(URL.createObjectURL(file));
    }
  };

  const handleDropFrente = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImagenFrenteFile(file);
      setPreviewFrente(URL.createObjectURL(file));
    }
  };

  const handleEspaldaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagenEspaldaFile(file);
      setPreviewEspalda(URL.createObjectURL(file));
    }
  };

  const handleDropEspalda = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      setImagenEspaldaFile(file);
      setPreviewEspalda(URL.createObjectURL(file));
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!prodName || !prodPrice) return;

    setUploadingImage(true);

    try {
      let urlFrente = editingProduct ? (editingProduct.imagenFrente || editingProduct.imagen) : "";
      let urlEspalda = editingProduct ? (editingProduct.imagenEspalda || "") : "";

      if (imagenFrenteFile) {
        urlFrente = await uploadToCloudinary(imagenFrenteFile);
      }

      if (imagenEspaldaFile) {
        urlEspalda = await uploadToCloudinary(imagenEspaldaFile);
      }

      const fallbackImg = "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80";

      const payload = {
        nombre: prodName,
        precio: prodPrice,
        categoria: prodCategory,
        subcategoria: prodCategory === "ROPA" ? prodSubcategory : "",
        tag: prodTag,
        talles: (prodCategory === "ROPA" || prodCategory === "KICKZ") ? prodTalles : [],
        imagen: urlFrente || fallbackImg,
        imagenFrente: urlFrente || fallbackImg,
        imagenEspalda: urlEspalda || urlFrente || fallbackImg,
        updatedAt: serverTimestamp()
      };

      if (editingProduct) {
        await updateDoc(doc(db, "productos", editingProduct.id), payload);
      } else {
        await addDoc(collection(db, "productos"), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }
      setShowProdModal(false);
    } catch (err) {
      console.error("Error al guardar producto:", err);
      alert("No se pudo guardar el producto.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm("¿Eliminar este producto permanentemente de Firestore?")) {
      await deleteDoc(doc(db, "productos", id));
    }
  };

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const destacadosFallback = [
    {
      id: "1",
      nombre: "REMERA ESSENTIALS FEAR OF GOD BLACK",
      precio: "75.000",
      tag: "NEW DROP",
      categoria: "ROPA",
      subcategoria: "REMERAS",
      talles: ["S", "M", "L", "XL"],
      imagenFrente: "https://i.ibb.co/vz12Ld2/essentials-front.jpg",
      imagenEspalda: "https://i.ibb.co/S3GzQZ4/essentials-back.jpg",
    },
    {
      id: "2",
      nombre: "PERFUME HUB KICKZ NOIR",
      precio: "65.000",
      tag: "BEST SELLER",
      categoria: "PERFUMES",
      talles: [],
      imagenFrente: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
      imagenEspalda: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
    },
    {
      id: "3",
      nombre: "AIR JORDAN 1 RETRO HIGH",
      precio: "185.000",
      tag: "HOT ITEM",
      categoria: "KICKZ",
      talles: ["US 8", "US 9", "US 10", "US 11"],
      imagenFrente: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80",
      imagenEspalda: "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?auto=format&fit=crop&w=800&q=80",
    },
  ];

  const fullCatalog = products.length > 0 ? products : destacadosFallback;

  const filteredCatalog = fullCatalog.filter((item) => {
    const matchesCategory = selectedCategory === "TODOS" || item.categoria?.toUpperCase() === selectedCategory;
    const matchesSubcategory = !selectedSubcategory || 
      item.subcategoria?.toUpperCase() === selectedSubcategory || 
      item.nombre?.toUpperCase().includes(selectedSubcategory);
    const matchesSearch = item.nombre.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSubcategory && matchesSearch;
  });

  const totalCartCount = cart.reduce((a, b) => a + b.quantity, 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: smoothTransition,
    },
  };

  const handleSelectRopaSubcategory = (subcat) => {
    setCurrentView("store");
    setSelectedCategory("ROPA");
    setSelectedSubcategory(subcat);
    setIsRopaHovered(false);
  };

  return (
    <div style={styles.container}>
      <AnimatePresence>
        {showNotice && (
          <motion.div
            style={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div
              style={styles.modalCard}
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={smoothTransition}
            >
              <div style={styles.modalImageWrapper}>
                <img
                  src="https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=800&q=80"
                  alt="Store local"
                  style={styles.modalImg}
                />
              </div>

              <div style={styles.modalContent}>
                <h2 style={styles.modalTitle}>
                  Los precios están expresados en USD
                </h2>
                <p style={styles.modalText}>
                  Al finalizar tu compra, podés elegir abonar en{" "}
                  <strong style={{ fontWeight: 700, color: "#111" }}>pesos argentinos</strong> al dólar oficial seleccionando{" "}
                  Mercado Pago como medio de pago.
                </p>
                <motion.button
                  style={styles.modalBtn}
                  whileHover={{ scale: 1.02, backgroundColor: "#1f1f1f" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowNotice(false)}
                >
                  ENTENDIDO
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header style={styles.header}>
        <div style={styles.headerInner}>
          <motion.div 
            style={styles.brandContainer} 
            onClick={() => { setCurrentView("store"); setSelectedCategory("TODOS"); setSelectedSubcategory(null); }}
            whileHover={{ scale: 1.02 }}
            transition={springTransition}
          >
            <h1 className="brand-title-tight" style={styles.mainTitle}>
              HUBKICKZ
            </h1>
            <div className="brand-subtitle-spaced">STREETWEAR</div>
          </motion.div>

          <nav style={styles.navMenu}>
            <div style={styles.navSideSpacer} />

            <div style={styles.navCenterGroup}>
              <motion.button 
                style={currentView === "store" && selectedCategory === "TODOS" ? styles.navLinkActive : styles.navLink} 
                onClick={() => { setCurrentView("store"); setSelectedCategory("TODOS"); setSelectedSubcategory(null); }}
                whileHover={{ scale: 1.05, color: "#ffffff" }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                INICIO
              </motion.button>

              <div 
                style={styles.dropdownContainer}
                onMouseEnter={() => setIsRopaHovered(true)}
                onMouseLeave={() => setIsRopaHovered(false)}
              >
                <motion.button 
                  style={currentView === "store" && selectedCategory === "ROPA" ? styles.navLinkActive : styles.navLink} 
                  onClick={() => { setCurrentView("store"); setSelectedCategory("ROPA"); setSelectedSubcategory(null); }}
                  whileHover={{ scale: 1.05, color: "#ffffff" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  ROPA
                </motion.button>

                <AnimatePresence>
                  {isRopaHovered && (
                    <motion.div
                      style={styles.dropdownMenu}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {["REMERAS", "BUZOS", "SHORTS", "PANTALONES"].map((subcat) => (
                        <motion.button
                          key={subcat}
                          style={selectedSubcategory === subcat ? styles.dropdownItemActive : styles.dropdownItem}
                          onClick={() => handleSelectRopaSubcategory(subcat)}
                          whileHover={{ backgroundColor: "#1c1c24", color: "#ffffff", x: 4 }}
                          transition={{ duration: 0.15 }}
                        >
                          {subcat}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button 
                style={currentView === "store" && selectedCategory === "PERFUMES" ? styles.navLinkActive : styles.navLink} 
                onClick={() => { setCurrentView("store"); setSelectedCategory("PERFUMES"); setSelectedSubcategory(null); }}
                whileHover={{ scale: 1.05, color: "#ffffff" }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                PERFUMES
              </motion.button>

              <motion.button 
                style={currentView === "envios" ? styles.navLinkActive : styles.navLink} 
                onClick={() => setCurrentView("envios")}
                whileHover={{ scale: 1.05, color: "#ffffff" }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                ENVIOS
              </motion.button>

              <motion.button 
                style={currentView === "mas-sobre-nosotros" ? styles.navLinkActive : styles.navLink} 
                onClick={() => setCurrentView("mas-sobre-nosotros")}
                whileHover={{ scale: 1.05, color: "#ffffff" }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                MÁS SOBRE NOSOTROS
              </motion.button>

              <motion.button 
                style={currentView === "contacto" ? styles.navLinkActive : styles.navLink} 
                onClick={() => setCurrentView("contacto")}
                whileHover={{ scale: 1.05, color: "#ffffff" }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                CONTACTO
              </motion.button>
              
              {user?.isAdmin && (
                <motion.button 
                  style={currentView === "admin" ? styles.navLinkActive : styles.navLink} 
                  onClick={() => setCurrentView("admin")}
                  whileHover={{ scale: 1.05, color: "#ffffff" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  PANEL ADMIN
                </motion.button>
              )}
            </div>

            <div style={styles.iconActionsGroup}>
              <motion.button 
                style={styles.iconBtn} 
                onClick={() => setShowSearchBar(!showSearchBar)}
                title="Buscar productos"
                whileHover={{ scale: 1.15, color: "#e50914" }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </motion.button>

              <div style={{ position: "relative" }}>
                <motion.button 
                  style={styles.iconBtn} 
                  onClick={() => {
                    if (user) {
                      setShowUserMenu(!showUserMenu);
                    } else {
                      setAuthMode("login");
                      setAuthError("");
                      setAuthSuccess("");
                      setCanResendVerification(false);
                      setShowAuthModal(true);
                    }
                  }}
                  title={user ? `Cuenta: ${user.email}` : "Iniciar sesión / Registrarse"}
                  whileHover={{ scale: 1.15, color: "#e50914" }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={user ? "#e50914" : "currentColor"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </motion.button>

                <AnimatePresence>
                  {user && showUserMenu && (
                    <motion.div
                      style={styles.userDropdownMenu}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <div style={styles.userMenuHeader}>
                        <span style={styles.userMenuLabel}>SESIÓN ACTIVA</span>
                        <span style={styles.userMenuEmail}>{user.email}</span>
                      </div>
                      
                      <motion.button 
                        style={styles.userMenuProfileBtn} 
                        onClick={() => {
                          setAuthMode("profile");
                          setAuthError("");
                          setAuthSuccess("");
                          setCanResendVerification(false);
                          setShowUserMenu(false);
                          setShowAuthModal(true);
                        }}
                        whileHover={{ color: "#ffffff", x: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        EDITAR MI PERFIL
                      </motion.button>

                      <motion.button 
                        style={styles.userMenuLogoutBtn} 
                        onClick={handleLogout}
                        whileHover={{ color: "#ff4d4d", x: 4 }}
                        transition={{ duration: 0.15 }}
                      >
                        CERRAR SESIÓN
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button 
                style={styles.iconBtn} 
                onClick={() => setIsCartOpen(!isCartOpen)}
                title="Carrito de compras"
                whileHover={{ scale: 1.15, color: "#e50914" }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <div style={{ position: "relative" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <path d="M16 10a4 4 0 0 1-8 0"></path>
                  </svg>
                  {totalCartCount > 0 && (
                    <motion.span 
                      style={styles.cartBadge}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={springTransition}
                    >
                      {totalCartCount}
                    </motion.span>
                  )}
                </div>
              </motion.button>
            </div>
          </nav>

          <AnimatePresence>
            {showSearchBar && (
              <motion.div 
                style={styles.searchBarWrapper}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={smoothTransition}
              >
                <input 
                  type="text" 
                  placeholder="BUSCAR PRODUCTOS EN HUBKICKZ..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={styles.searchInput}
                  autoFocus
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {currentView === "store" ? (
        <>
          <section ref={heroRef} style={styles.heroSection}>
            <motion.div
              style={{
                ...styles.heroBg,
                backgroundImage: `url("https://images.unsplash.com/photo-1552346154-21d32810aba3?auto=format&fit=crop&w=1600&q=80")`,
                y: backgroundY,
              }}
            />
            <motion.div style={{ ...styles.heroOverlay, opacity: heroOpacity }}>
              <div style={styles.sunGradient} />

              <div style={styles.badgeWrapper}>
                <motion.svg
                  style={styles.svgRing}
                  viewBox="0 0 200 200"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                >
                  <path
                    id="textPath"
                    d="M 100, 100 m -75, 0 a 75,75 0 1,1 150,0 a 75,75 0 1,1 -150,0"
                    fill="none"
                  />
                  <text fill="#ffffff" fontSize="12.5" fontWeight="700" letterSpacing="2.5">
                    <textPath href="#textPath">
                      HUB KICKZ • HUB KICKZ • HUB KICKZ • HUB KICKZ •
                    </textPath>
                  </text>
                </motion.svg>

                <div style={styles.gothicCenter}>
                  <motion.img
                    src={logoUrl}
                    alt="Logo HK"
                    style={styles.heroLogoImg}
                    animate={{
                      scale: [1, 1.04, 1],
                      filter: [
                        "drop-shadow(0 0 10px rgba(229, 9, 20, 0.5))",
                        "drop-shadow(0 0 25px rgba(229, 9, 20, 0.95))",
                        "drop-shadow(0 0 10px rgba(229, 9, 20, 0.5))",
                      ],
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3.5,
                      ease: "easeInOut",
                    }}
                  />
                </div>
              </div>
            </motion.div>
          </section>

          <section style={styles.section}>
            <motion.div
              style={styles.sectionHeader}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={smoothTransition}
            >
              <div>
                <h2 style={styles.sectionTitle} className="brand-title-tight">
                  // CATÁLOGO {selectedSubcategory ? `> ${selectedSubcategory}` : ""}
                </h2>
                <div style={styles.filterGroup}>
                  {["TODOS", "ROPA", "KICKZ", "PERFUMES"].map((cat) => (
                    <motion.button
                      key={cat}
                      style={selectedCategory === cat && !selectedSubcategory ? styles.filterBtnActive : styles.filterBtn}
                      onClick={() => { setSelectedCategory(cat); setSelectedSubcategory(null); }}
                      whileHover={{ scale: 1.05, backgroundColor: selectedCategory === cat && !selectedSubcategory ? "#ff0d1a" : "#1c1c24", borderColor: "#e50914", color: "#ffffff" }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      {cat}
                    </motion.button>
                  ))}
                  {selectedSubcategory && (
                    <motion.button
                      style={styles.filterBtnActive}
                      onClick={() => setSelectedSubcategory(null)}
                      whileHover={{ scale: 1.05, backgroundColor: "#ff0d1a" }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                    >
                      {selectedSubcategory} ✕
                    </motion.button>
                  )}
                </div>
              </div>
              <span style={styles.sectionCode}>[ 01 / FEATURED ]</span>
            </motion.div>

            {filteredCatalog.length === 0 ? (
              <p style={{ color: "#71717a", padding: "20px 0" }}>
                No se encontraron productos para tu búsqueda.
              </p>
            ) : (
              <motion.div
                style={styles.productGrid}
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.1 }}
              >
                {filteredCatalog.map((item) => (
                  <ProductCard 
                    key={item.id} 
                    item={item} 
                    cardVariants={cardVariants} 
                    onAddToCart={addToCart}
                  />
                ))}
              </motion.div>
            )}
          </section>
        </>
      ) : currentView === "checkout" ? (
        <section style={styles.section}>
          <Checkout 
            cart={cart} 
            total={cartTotal} 
            user={user} 
            onSuccess={() => {
              setCart([]);
              setCurrentView("store");
            }}
            onBack={() => setCurrentView("store")}
          />
        </section>
      ) : currentView === "mas-sobre-nosotros" ? (
        <section style={styles.section}>
          <motion.div 
            style={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={smoothTransition}
          >
            <h2 style={styles.sectionTitle}>// MÁS SOBRE NOSOTROS</h2>
            <span style={styles.sectionCode}>[ NUESTRA IDENTIDAD ]</span>
          </motion.div>
          <motion.div 
            style={{ backgroundColor: "#0a0a0d", border: "1px solid #18181c", padding: "40px", maxWidth: "800px", borderRadius: "2px" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.1 }}
          >
            <p style={{ color: "#ccc", lineHeight: "1.8", marginBottom: "20px", fontSize: "1rem" }}>
              HubKickz nace de una pasión: encontrar y acercar productos que realmente se diferencian.
            </p>
            <p style={{ color: "#ccc", lineHeight: "1.8", marginBottom: "20px", fontSize: "1rem" }}>
              Somos una tienda especializada en sneakers, streetwear y productos exclusivos, enfocada en ofrecer ítems 100% originales y seleccionados cuidadosamente para quienes buscan algo que sobrepasa lo convencional.
            </p>
            <p style={{ color: "#ccc", lineHeight: "1.8", marginBottom: "20px", fontSize: "1rem" }}>
              Trabajamos con marcas y modelos reconocidos a nivel mundial dentro de la cultura urbana, combinando calidad, autenticidad y una selección que prioriza lo distinto.
            </p>
            <p style={{ color: "#ccc", lineHeight: "1.8", marginBottom: "25px", fontSize: "1rem" }}>
              Además, contamos con un sistema de encargos y pedidos personalizados para conseguir esas piezas específicas que no siempre se encuentran disponibles en el mercado, pero te llamaron la atención en algún lado que las viste.
            </p>
            <p style={{ color: "#ccc", lineHeight: "1.8", marginBottom: "25px", fontSize: "1rem" }}>
              En HubKickz cuidamos cada parte de la experiencia: desde la selección y verificación de los productos hasta la presentación y atención personalizada. Buscamos que cada compra sea una experiencia segura, clara y a la altura de las cosas que ofrecemos para que cuando recibas el producto, tus expectativas hayan sido ampliamente superadas.
            </p>
            <p style={{ color: "#ffffff", fontWeight: "bold", fontSize: "1.1rem", marginBottom: "15px", letterSpacing: "1px" }}>
              Originalidad, exclusividad y confianza.
            </p>
            <p style={{ color: "#e50914", fontWeight: "bold", fontSize: "1.2rem", margin: 0, letterSpacing: "2px" }}>
              Eso es HubKickz.
            </p>
            <div style={{ marginTop: "15px", color: "#888893", fontSize: "0.9rem", fontFamily: "monospace" }}>
              Streetwear • Sneakers • Hype
            </div>
          </motion.div>
        </section>
      ) : currentView === "envios" ? (
        <section style={styles.section}>
          <motion.div 
            style={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={smoothTransition}
          >
            <h2 style={styles.sectionTitle}>// INFORMACIÓN DE ENVÍOS</h2>
            <span style={styles.sectionCode}>[ LOGÍSTICA & ENTREGA ]</span>
          </motion.div>
          <motion.div 
            style={{ backgroundColor: "#0a0a0d", border: "1px solid #18181c", padding: "30px", maxWidth: "800px" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.1 }}
          >
            <h3 style={{ color: "#e50914", marginTop: 0 }}>Envíos a todo el país</h3>
            <p style={{ color: "#ccc", lineHeight: "1.6" }}>
              Despachamos nuestros productos a todo el territorio nacional a través de Correo Argentino.
            </p>
            <ul style={{ color: "#888893", lineHeight: "1.8", marginTop: "15px" }}>
              <li><strong>Tiempos de entrega:</strong> 1 día (Corrientes Capital), 3 a 5 días hábiles (Resto del país) tras confirmar la compra.</li>
              <li><strong>Retiros en local:</strong> Disponibles sin costo adicional.</li>
              <li><strong>Pagos:</strong> Mercado Pago (pesos al dólar oficial) o Transferencia.</li>
            </ul>
          </motion.div>
        </section>
      ) : currentView === "contacto" ? (
        <section style={styles.section}>
          <motion.div 
            style={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={smoothTransition}
          >
            <h2 style={styles.sectionTitle}>// CONTACTO</h2>
            <span style={styles.sectionCode}>[ CANALES DE ATENCIÓN ]</span>
          </motion.div>
          <motion.div 
            style={{ backgroundColor: "#0a0a0d", border: "1px solid #18181c", padding: "35px", maxWidth: "800px", borderRadius: "2px" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...smoothTransition, delay: 0.1 }}
          >
            <p style={{ color: "#ccc", lineHeight: "1.8", marginBottom: "25px", fontSize: "1rem" }}>
              ¿Tenés dudas sobre algún talle, modelo, método de envío o querés hacer un encargo personalizado? Ponete en contacto con nosotros a través de nuestros canales oficiales:
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "15px", backgroundColor: "#111116", padding: "18px 20px", border: "1px solid #22222a", borderRadius: "2px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#888893", fontFamily: "monospace" }}>WHATSAPP / ATENCIÓN DIRECTA</div>
                  <a href="https://wa.me/543794123456" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", fontWeight: "bold", textDecoration: "none", fontSize: "1rem" }}>
                    +54 379 412-3456
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "15px", backgroundColor: "#111116", padding: "18px 20px", border: "1px solid #22222a", borderRadius: "2px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#888893", fontFamily: "monospace" }}>INSTAGRAM OFICIAL</div>
                  <a href="https://instagram.com/hubkickz" target="_blank" rel="noopener noreferrer" style={{ color: "#ffffff", fontWeight: "bold", textDecoration: "none", fontSize: "1rem" }}>
                    @hubkickz
                  </a>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "15px", backgroundColor: "#111116", padding: "18px 20px", border: "1px solid #22222a", borderRadius: "2px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e50914" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#888893", fontFamily: "monospace" }}>CORREO ELECTRÓNICO</div>
                  <a href="mailto:hubkickzcorrientes@gmail.com" style={{ color: "#ffffff", fontWeight: "bold", textDecoration: "none", fontSize: "1rem" }}>
                    hubkickzcorrientes@gmail.com
                  </a>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "30px", borderTop: "1px solid #1c1c24", paddingTop: "20px" }}>
              <div style={{ color: "#a1a1aa", fontSize: "0.85rem" }}>
                📍 <strong>Ubicación:</strong> Corrientes Capital, Argentina.
              </div>
              <div style={{ color: "#888893", fontSize: "0.8rem", marginTop: "5px" }}>
                Horarios de atención: Lunes a Sábados de 10:00 a 20:00 hs.
              </div>
            </div>
          </motion.div>
        </section>
      ) : (
        <section style={styles.section}>
          <motion.div 
            style={styles.sectionHeader}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={smoothTransition}
          >
            <div>
              <h2 style={styles.sectionTitle}>// PANEL DE ADMINISTRACIÓN</h2>
              <div style={styles.adminSubNav}>
                <motion.button 
                  style={adminTab === "productos" ? styles.adminTabActive : styles.adminTab}
                  onClick={() => setAdminTab("productos")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  PRODUCTOS ({products.length})
                </motion.button>
                <motion.button 
                  style={adminTab === "pedidos" ? styles.adminTabActive : styles.adminTab}
                  onClick={() => setAdminTab("pedidos")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  PEDIDOS ({orders.length})
                </motion.button>
                <motion.button 
                  style={adminTab === "dashboard" ? styles.adminTabActive : styles.adminTab}
                  onClick={() => setAdminTab("dashboard")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  ESTADÍSTICAS
                </motion.button>
              </div>
            </div>

            {adminTab === "productos" && (
              <motion.button 
                style={styles.adminAddMainBtn} 
                onClick={handleOpenAddModal}
                whileHover={{ scale: 1.05, backgroundColor: "#ff0d1a" }}
                whileTap={{ scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                + NUEVO PRODUCTO
              </motion.button>
            )}
          </motion.div>

          {adminTab === "productos" ? (
            <motion.div 
              style={styles.adminTableContainer}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.1 }}
            >
              <table style={styles.adminTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>PRODUCTO</th>
                    <th style={styles.th}>CATEGORÍA</th>
                    <th style={styles.th}>SUBCATEGORÍA</th>
                    <th style={styles.th}>TALLES DISPONIBLES</th>
                    <th style={styles.th}>TAG</th>
                    <th style={styles.th}>PRECIO</th>
                    <th style={styles.thStyleRight}>ACCIONES</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: "center", padding: "30px", color: "#52525b" }}>
                        No hay productos registrados en Firestore.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => (
                      <motion.tr 
                        key={p.id} 
                        style={styles.tr}
                        whileHover={{ backgroundColor: "#111116" }}
                        transition={{ duration: 0.15 }}
                      >
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                            <img 
                              src={p.imagenFrente || p.imagen || "https://via.placeholder.com/40"} 
                              alt={p.nombre} 
                              style={styles.adminThumb} 
                            />
                            <span style={{ fontWeight: "600" }}>{p.nombre}</span>
                          </div>
                        </td>
                        <td style={styles.td}><span style={styles.badgeCode}>{p.categoria}</span></td>
                        <td style={styles.td}>{p.subcategoria || "-"}</td>
                        <td style={styles.td}>
                          {p.talles && p.talles.length > 0 ? (
                            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                              {p.talles.map((t) => (
                                <span key={t} style={styles.talleBadgeAdmin}>{t}</span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "#52525b" }}>S/N</span>
                          )}
                        </td>
                        <td style={styles.td}><span style={{ color: "#e50914" }}>{p.tag}</span></td>
                        <td style={styles.td}><strong>${p.precio}</strong></td>
                        <td style={styles.tdRight}>
                          <motion.button 
                            style={styles.editBtn} 
                            onClick={() => handleOpenEditModal(p)}
                            whileHover={{ backgroundColor: "#3f3f46", color: "#ffffff" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                          >
                            EDITAR
                          </motion.button>
                          <motion.button 
                            style={styles.deleteBtn} 
                            onClick={() => handleDeleteProduct(p.id)}
                            whileHover={{ backgroundColor: "#e50914", color: "#ffffff" }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                          >
                            ELIMINAR
                          </motion.button>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </motion.div>
          ) : adminTab === "pedidos" ? (
            <motion.div 
              style={styles.adminTableContainer}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...smoothTransition, delay: 0.1 }}
            >
              <table style={styles.adminTable}>
                <thead>
                  <tr>
                    <th style={styles.th}>ID PEDIDO</th>
                    <th style={styles.th}>CLIENTE</th>
                    <th style={styles.th}>ENVÍO & TELÉFONO</th>
                    <th style={styles.th}>ARTÍCULOS</th>
                    <th style={styles.th}>TOTAL</th>
                    <th style={styles.th}>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#52525b" }}>
                        No hay pedidos registrados hasta el momento.
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => (
                      <motion.tr 
                        key={o.id} 
                        style={styles.tr}
                        whileHover={{ backgroundColor: "#111116" }}
                        transition={{ duration: 0.15 }}
                      >
                        <td style={styles.td}><span style={styles.badgeCode}>{o.id.substring(0, 8)}</span></td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: "600" }}>{o.clienteNombre}</div>
                          <div style={{ fontSize: "0.75rem", color: "#888893" }}>{o.userEmail}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontSize: "0.8rem" }}>{o.direccionEnvio}</div>
                          <div style={{ fontSize: "0.75rem", color: "#888893" }}>Tel: {o.clienteTelefono}</div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            {o.items?.map((it, idx) => (
                              <span key={idx} style={{ fontSize: "0.8rem", color: "#ccc" }}>
                                • {it.quantity}x {it.nombre} {it.talleElegido ? `(Talle: ${it.talleElegido})` : ""}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={styles.td}><strong>${o.total?.toLocaleString()}</strong></td>
                        <td style={styles.td}>
                          <select
                            value={o.estado || "Pendiente"}
                            onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                            style={{
                              ...styles.gothicInput,
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              backgroundColor: o.estado === "Entregado" ? "#14532d" : o.estado === "Enviado" ? "#1e3a8a" : "#1f1f23"
                            }}
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="En preparación">En preparación</option>
                            <option value="Enviado">Enviado</option>
                            <option value="Entregado">Entregado</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </motion.div>
          ) : (
            <div style={{ backgroundColor: "#0a0a0d", border: "1px solid #1c1c24", padding: "20px", borderRadius: "4px" }}>
              <SalesDashboard />
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {isCartOpen && (
          <motion.div 
            style={styles.drawerOverlay} 
            onClick={() => setIsCartOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              style={styles.drawerContent} 
              onClick={(e) => e.stopPropagation()}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div style={styles.drawerHeader}>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>CARRITO DE COMPRAS</h3>
                <motion.button 
                  style={styles.closeDrawerBtn} 
                  onClick={() => setIsCartOpen(false)}
                  whileHover={{ scale: 1.2, color: "#e50914" }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.15 }}
                >
                  ✕
                </motion.button>
              </div>

              {cart.length === 0 ? (
                <p style={{ color: "#71717a", marginTop: "2rem" }}>El carrito está vacío.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                  <div style={{ marginTop: "1rem", overflowY: "auto", maxHeight: "calc(100vh - 220px)" }}>
                    {cart.map((item) => (
                      <div key={item.cartKey} style={styles.cartItem}>
                        <div>
                          <p style={{ margin: "0 0 4px 0", fontWeight: "bold", fontSize: "0.85rem" }}>{item.nombre}</p>
                          {item.talleElegido && (
                            <span style={styles.cartItemTalle}>Talle: {item.talleElegido}</span>
                          )}
                          <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "2px" }}>
                            ${item.precio} x {item.quantity}
                          </div>
                        </div>
                        <motion.button 
                          style={styles.removeCartItemBtn} 
                          onClick={() => removeFromCart(item.cartKey)}
                          whileHover={{ scale: 1.2, color: "#e50914" }}
                          whileTap={{ scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                        >
                          ✕
                        </motion.button>
                      </div>
                    ))}
                  </div>

                  <div style={styles.drawerFooter}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", fontWeight: "bold" }}>
                      <span>TOTAL:</span>
                      <span>${cartTotal.toLocaleString()}</span>
                    </div>
                    <motion.button 
                      style={styles.checkoutBtn} 
                      onClick={handleCheckout}
                      whileHover={{ scale: 1.02, backgroundColor: "#ff0d1a" }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      FINALIZAR COMPRA
                    </motion.button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showProdModal && (
          <motion.div 
            style={styles.modalOverlay}
            onClick={() => setShowProdModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              style={styles.gothicAuthCard}
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={smoothTransition}
            >
              <motion.button 
                style={styles.gothicCloseBtn} 
                onClick={() => setShowProdModal(false)}
                whileHover={{ scale: 1.2, color: "#ffffff" }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                ✕
              </motion.button>
              
              <div style={styles.gothicAuthHeader}>
                <span style={styles.gothicAuthTag}>// CATALOG MANAGEMENT</span>
                <h2 style={styles.gothicAuthTitle}>
                  {editingProduct ? "EDITAR PRODUCTO" : "NUEVO PRODUCTO"}
                </h2>
              </div>

              <form onSubmit={handleSaveProduct} style={styles.gothicForm}>
                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>NOMBRE DEL PRODUCTO</label>
                  <input 
                    type="text" 
                    value={prodName} 
                    onChange={(e) => setProdName(e.target.value)} 
                    required 
                    style={styles.gothicInput}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>PRECIO (USD / ARS)</label>
                  <input 
                    type="text" 
                    value={prodPrice} 
                    onChange={(e) => setProdPrice(e.target.value)} 
                    required 
                    style={styles.gothicInput}
                  />
                </div>

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>CATEGORÍA</label>
                  <select 
                    value={prodCategory} 
                    onChange={(e) => {
                      setProdCategory(e.target.value);
                      if (e.target.value === "ROPA") setProdTalles(["S", "M", "L", "XL"]);
                      else if (e.target.value === "KICKZ") setProdTalles(["US 8", "US 9", "US 10"]);
                      else setProdTalles([]);
                    }}
                    style={styles.gothicInput}
                  >
                    <option value="ROPA">ROPA</option>
                    <option value="KICKZ">KICKZ</option>
                    <option value="PERFUMES">PERFUMES</option>
                  </select>
                </div>

                {prodCategory === "ROPA" && (
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>SUBCATEGORÍA</label>
                    <select 
                      value={prodSubcategory} 
                      onChange={(e) => setProdSubcategory(e.target.value)}
                      style={styles.gothicInput}
                    >
                      <option value="REMERAS">REMERAS</option>
                      <option value="BUZOS">BUZOS</option>
                      <option value="SHORTS">SHORTS</option>
                      <option value="PANTALONES">PANTALONES</option>
                    </select>
                  </div>
                )}

                {(prodCategory === "ROPA" || prodCategory === "KICKZ") && (
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>TALLES DISPONIBLES</label>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                      {(prodCategory === "ROPA" ? TALLES_ROPA_OPCIONES : TALLES_KICKZ_OPCIONES).map((talle) => {
                        const active = prodTalles.includes(talle);
                        return (
                          <button
                            type="button"
                            key={talle}
                            onClick={() => toggleTalleOption(talle)}
                            style={{
                              padding: "6px 12px",
                              fontSize: "0.75rem",
                              borderRadius: "2px",
                              border: active ? "1px solid #e50914" : "1px solid #22222a",
                              backgroundColor: active ? "#e50914" : "#111116",
                              color: "#fff",
                              cursor: "pointer",
                              fontFamily: "monospace"
                            }}
                          >
                            {talle}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={styles.inputGroup}>
                  <label style={styles.inputLabel}>TAG</label>
                  <input 
                    type="text" 
                    value={prodTag} 
                    onChange={(e) => setProdTag(e.target.value)} 
                    style={styles.gothicInput}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={styles.inputLabel}>IMAGEN FRENTE</label>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropFrente}
                    style={{ 
                      border: "2px dashed #3f3f46", 
                      borderRadius: "4px",
                      padding: "16px", 
                      textAlign: "center", 
                      backgroundColor: "#111116",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {previewFrente ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img src={previewFrente} alt="Frente" style={{ width: "45px", height: "45px", objectFit: "cover", borderRadius: "2px" }} />
                        <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "monospace" }}>✓ Imagen seleccionada</span>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: "11px", color: "#888893", fontFamily: "monospace" }}>Arrastra tu imagen aquí</p>
                    )}
                    <label style={{ background: "#22222a", color: "#fff", padding: "6px 12px", borderRadius: "2px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
                      Buscar en archivos
                      <input type="file" accept="image/*" onChange={handleFrenteChange} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={styles.inputLabel}>IMAGEN ESPALDA (Opcional)</label>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDropEspalda}
                    style={{ 
                      border: "2px dashed #3f3f46", 
                      borderRadius: "4px",
                      padding: "16px", 
                      textAlign: "center", 
                      backgroundColor: "#111116",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {previewEspalda ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <img src={previewEspalda} alt="Espalda" style={{ width: "45px", height: "45px", objectFit: "cover", borderRadius: "2px" }} />
                        <span style={{ fontSize: "11px", color: "#4ade80", fontFamily: "monospace" }}>✓ Imagen seleccionada</span>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: "11px", color: "#888893", fontFamily: "monospace" }}>Arrastra tu imagen aquí</p>
                    )}
                    <label style={{ background: "#22222a", color: "#fff", padding: "6px 12px", borderRadius: "2px", fontSize: "11px", cursor: "pointer", fontFamily: "monospace" }}>
                      Buscar en archivos
                      <input type="file" accept="image/*" onChange={handleEspaldaChange} style={{ display: "none" }} />
                    </label>
                  </div>
                </div>

                <motion.button 
                  type="submit" 
                  disabled={uploadingImage} 
                  style={styles.gothicSubmitBtn}
                  whileHover={{ backgroundColor: "#ff0d1a" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  {uploadingImage ? "SUBIENDO IMÁGENES..." : editingProduct ? "GUARDAR CAMBIOS" : "PUBLICAR ARTÍCULO"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAuthModal && (
          <motion.div 
            style={styles.modalOverlay} 
            onClick={() => setShowAuthModal(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div 
              style={styles.gothicAuthCard} 
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.94, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 10 }}
              transition={smoothTransition}
            >
              <motion.button 
                style={styles.gothicCloseBtn} 
                onClick={() => setShowAuthModal(false)}
                whileHover={{ scale: 1.2, color: "#ffffff" }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                ✕
              </motion.button>

              <div style={styles.gothicAuthHeader}>
                <span style={styles.gothicAuthTag}>
                  {authMode === "profile" ? "// USER PROFILE" : "// AUTHENTICATION"}
                </span>
                <h2 style={styles.gothicAuthTitle}>
                  {authMode === "login" 
                    ? "INICIAR SESIÓN" 
                    : authMode === "register" 
                    ? "CREAR CUENTA" 
                    : authMode === "reset" 
                    ? "RECUPERAR CLAVE"
                    : "DATOS DE ENVÍO"}
                </h2>
              </div>

              {authError && <div style={styles.gothicErrorBox}>[!] {authError}</div>}
              {authSuccess && <div style={styles.gothicSuccessBox}>[✓] {authSuccess}</div>}

              <form onSubmit={handleAuthSubmit} style={styles.gothicForm}>
                {authMode !== "profile" && (
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>CORREO ELECTRÓNICO</label>
                    <input 
                      type="email" 
                      placeholder="usuario@email.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      style={styles.gothicInput}
                    />
                  </div>
                )}

                {(authMode === "register" || authMode === "profile") && (
                  <>
                    <div style={styles.inputGroup}>
                      <label style={styles.inputLabel}>NOMBRE COMPLETO</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Juan Pérez" 
                        value={nombre} 
                        onChange={(e) => setNombre(e.target.value)} 
                        required 
                        style={styles.gothicInput}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.inputLabel}>TELÉFONO DE CONTACTO</label>
                      <input 
                        type="tel" 
                        placeholder="Ej: +54 9 11 1234-5678" 
                        value={telefono} 
                        onChange={(e) => setTelefono(e.target.value)} 
                        required 
                        style={styles.gothicInput}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.inputLabel}>DIRECCIÓN DE ENVÍO (CALLE Y NÚMERO)</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Av. Corrientes 1234, 4to B" 
                        value={direccion} 
                        onChange={(e) => setDireccion(e.target.value)} 
                        required 
                        style={styles.gothicInput}
                      />
                    </div>

                    <div style={styles.inputGroup}>
                      <label style={styles.inputLabel}>CIUDAD / PROVINCIA</label>
                      <input 
                        type="text" 
                        placeholder="Ej: Buenos Aires" 
                        value={ciudad} 
                        onChange={(e) => setCiudad(e.target.value)} 
                        required 
                        style={styles.gothicInput}
                      />
                    </div>
                  </>
                )}
                
                {authMode !== "reset" && authMode !== "profile" && (
                  <div style={styles.inputGroup}>
                    <label style={styles.inputLabel}>CONTRASEÑA</label>
                    <input 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      style={styles.gothicInput}
                    />
                  </div>
                )}

                <motion.button 
                  type="submit" 
                  disabled={authLoading} 
                  style={styles.gothicSubmitBtn}
                  whileHover={{ backgroundColor: "#ff0d1a" }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                >
                  {authLoading 
                    ? "PROCESANDO..." 
                    : authMode === "login" 
                    ? "INGRESAR AL SISTEMA" 
                    : authMode === "register" 
                    ? "REGISTRAR Y GUARDAR" 
                    : authMode === "profile"
                    ? "GUARDAR DATOS DE ENVÍO"
                    : "ENVIAR ENLACE"}
                </motion.button>

                {canResendVerification && authMode === "login" && (
                  <motion.button 
                    type="button"
                    onClick={handleResendVerificationModal} 
                    disabled={authLoading} 
                    style={styles.gothicResendBtn}
                    whileHover={{ backgroundColor: "#282830" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    REENVIAR CORREO DE VERIFICACIÓN
                  </motion.button>
                )}
              </form>

              {authMode === "login" && (
                <div style={{ textAlign: "right", marginTop: "10px" }}>
                  <motion.span 
                    style={styles.gothicLink}
                    onClick={() => { setAuthMode("reset"); setAuthError(""); setAuthSuccess(""); setCanResendVerification(false); }}
                    whileHover={{ color: "#ffffff" }}
                    transition={{ duration: 0.15 }}
                  >
                    ¿Olvidaste tu contraseña?
                  </motion.span>
                </div>
              )}

              {authMode !== "reset" && authMode !== "profile" && (
                <>
                  <div style={styles.gothicDivider}>
                    <span style={{ backgroundColor: "#0a0a0d", padding: "0 10px", color: "#52525b" }}>O</span>
                  </div>
                  
                  <motion.button 
                    onClick={handleGoogleLogin} 
                    disabled={authLoading} 
                    style={styles.gothicGoogleBtn}
                    whileHover={{ borderColor: "#ffffff", color: "#ffffff", backgroundColor: "#1c1c24" }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    CONTINUAR CON GOOGLE
                  </motion.button>
                </>
              )}

              {authMode !== "profile" && (
                <p style={styles.gothicFooterText}>
                  {authMode === "login" ? (
                    <>
                      ¿No tienes cuenta?{" "}
                      <span 
                        style={styles.gothicLinkBold}
                        onClick={() => { setAuthMode("register"); setAuthError(""); setAuthSuccess(""); setCanResendVerification(false); }}
                      >
                        REGÍSTRATE AQUÍ
                      </span>
                    </>
                  ) : (
                    <>
                      ¿Ya tienes cuenta?{" "}
                      <span 
                        style={styles.gothicLinkBold}
                        onClick={() => { setAuthMode("login"); setAuthError(""); setAuthSuccess(""); setCanResendVerification(false); }}
                      >
                        INICIA SESIÓN
                      </span>
                    </>
                  )}
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ item, cardVariants, onAddToCart }) {
  const [isHovered, setIsHovered] = useState(false);
  const [selectedTalle, setSelectedTalle] = useState(item.talles && item.talles.length > 0 ? item.talles[0] : null);

  const activeImage = isHovered 
    ? (item.imagenEspalda || item.imagenFrente || item.imagen) 
    : (item.imagenFrente || item.imagen);

  const hasTalles = item.talles && item.talles.length > 0;

  return (
    <motion.div
      style={styles.productCard}
      variants={cardVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{
        y: -8,
        borderColor: "#e50914",
        boxShadow: "0 12px 30px rgba(229, 9, 20, 0.25)",
      }}
      transition={smoothTransition}
    >
      <div style={styles.productHeader}>
        <span style={styles.productCategory}>{item.categoria}</span>
        <span style={styles.productTag}>{item.tag}</span>
      </div>

      <div style={styles.productImgWrapper}>
        <AnimatePresence mode="wait">
          <motion.img
            key={activeImage}
            src={activeImage}
            alt={item.nombre}
            style={styles.productImg}
            initial={{ opacity: 0.4, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0.4 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </AnimatePresence>
        {item.imagenEspalda && item.imagenEspalda !== item.imagenFrente && (
          <span style={styles.viewBadge}>
            {isHovered ? "ESPALDA" : "FRENTE"}
          </span>
        )}
      </div>

      <div style={styles.productBody}>
        <div>
          <h3 style={styles.productName}>{item.nombre}</h3>
          
          {hasTalles && (
            <div style={{ marginBottom: "12px" }}>
              <span style={styles.talleLabel}>SELECCIONAR TALLE:</span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                {item.talles.map((t) => (
                  <button
                    key={t}
                    onClick={(e) => { e.stopPropagation(); setSelectedTalle(t); }}
                    style={{
                      padding: "4px 8px",
                      fontSize: "0.65rem",
                      borderRadius: "2px",
                      border: selectedTalle === t ? "1px solid #e50914" : "1px solid #22222a",
                      backgroundColor: selectedTalle === t ? "#e50914" : "#111116",
                      color: "#fff",
                      cursor: "pointer",
                      fontFamily: "monospace"
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={styles.productFooter}>
          <span style={styles.productPrice}>${item.precio}</span>
          <motion.button 
            style={styles.buyBtn} 
            whileHover={{ scale: 1.05, backgroundColor: "#e1e1e1" }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddToCart(item, selectedTalle)}
            transition={{ duration: 0.15 }}
          >
            AGREGAR
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

const styles = {
  container: {
    backgroundColor: "#050505",
    color: "#ffffff",
    minHeight: "100vh",
    paddingBottom: "5rem",
    overflowX: "hidden",
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    backgroundColor: "rgba(5, 5, 5, 0.9)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid #18181c",
  },
  headerInner: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "0.8rem 1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  brandContainer: {
    cursor: "pointer",
    display: "inline-block",
  },
  mainTitle: {
    fontSize: "1.8rem",
    fontWeight: "900",
    letterSpacing: "3px",
    margin: 0,
    color: "#ffffff",
  },
  navMenu: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navSideSpacer: {
    width: "100px",
  },
  navCenterGroup: {
    display: "flex",
    gap: "1.5rem",
    alignItems: "center",
  },
  navLink: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    fontSize: "0.75rem",
    fontWeight: "700",
    letterSpacing: "1.5px",
    cursor: "pointer",
    padding: "0.4rem 0",
  },
  navLinkActive: {
    background: "none",
    border: "none",
    color: "#e50914",
    fontSize: "0.75rem",
    fontWeight: "700",
    letterSpacing: "1.5px",
    cursor: "pointer",
    padding: "0.4rem 0",
    borderBottom: "2px solid #e50914",
  },
  dropdownContainer: {
    position: "relative",
  },
  dropdownMenu: {
    position: "absolute",
    top: "100%",
    left: "50%",
    transform: "translateX(-50%)",
    backgroundColor: "#0a0a0d",
    border: "1px solid #1c1c24",
    borderRadius: "2px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.8)",
    padding: "0.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.2rem",
    zIndex: 1100,
    minWidth: "140px",
  },
  dropdownItem: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    padding: "0.5rem 1rem",
    textAlign: "left",
    fontSize: "0.7rem",
    fontWeight: "600",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  dropdownItemActive: {
    background: "#1c1c24",
    border: "none",
    color: "#e50914",
    padding: "0.5rem 1rem",
    textAlign: "left",
    fontSize: "0.7rem",
    fontWeight: "600",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  iconActionsGroup: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "#ffffff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0.3rem",
  },
  cartBadge: {
    position: "absolute",
    top: "-6px",
    right: "-8px",
    backgroundColor: "#e50914",
    color: "#ffffff",
    borderRadius: "50%",
    fontSize: "0.6rem",
    fontWeight: "bold",
    width: "16px",
    height: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarWrapper: {
    overflow: "hidden",
    paddingTop: "0.5rem",
  },
  searchInput: {
    width: "100%",
    backgroundColor: "#111116",
    border: "1px solid #22222a",
    color: "#ffffff",
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    borderRadius: "2px",
    outline: "none",
    fontFamily: "monospace",
  },
  heroSection: {
    position: "relative",
    height: "75vh",
    minHeight: "480px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "115%",
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "brightness(0.4) contrast(1.1)",
  },
  heroOverlay: {
    position: "relative",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  sunGradient: {
    position: "absolute",
    width: "300px",
    height: "300px",
    background: "radial-gradient(circle, rgba(229, 9, 20, 0.35) 0%, rgba(0,0,0,0) 70%)",
    borderRadius: "50%",
    pointerEvents: "none",
  },
  badgeWrapper: {
    position: "relative",
    width: "220px",
    height: "220px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  svgRing: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  gothicCenter: {
    width: "130px",
    height: "130px",
    borderRadius: "50%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    border: "2px solid #e50914",
    boxShadow: "0 0 20px rgba(229, 9, 20, 0.4)",
    zIndex: 20,
  },
  heroLogoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  section: {
    maxWidth: "1280px",
    margin: "0 auto",
    padding: "3rem 1.5rem",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "2rem",
    borderBottom: "1px solid #18181c",
    paddingBottom: "1rem",
  },
  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: "800",
    letterSpacing: "1px",
    margin: "0 0 0.8rem 0",
    color: "#ffffff",
  },
  sectionCode: {
    fontFamily: "monospace",
    color: "#52525b",
    fontSize: "0.75rem",
  },
  filterGroup: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  filterBtn: {
    backgroundColor: "#0a0a0d",
    border: "1px solid #18181c",
    color: "#a1a1aa",
    padding: "0.4rem 0.9rem",
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  filterBtnActive: {
    backgroundColor: "#e50914",
    border: "1px solid #e50914",
    color: "#ffffff",
    padding: "0.4rem 0.9rem",
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.5rem",
  },
  productCard: {
    backgroundColor: "#0a0a0d",
    border: "1px solid #18181c",
    borderRadius: "2px",
    padding: "1.2rem",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
    transition: "border-color 0.3s ease",
  },
  productHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.8rem",
  },
  productCategory: {
    fontSize: "0.65rem",
    fontFamily: "monospace",
    color: "#71717a",
    letterSpacing: "1px",
  },
  productTag: {
    fontSize: "0.65rem",
    fontWeight: "700",
    color: "#e50914",
    letterSpacing: "1px",
  },
  productImgWrapper: {
    position: "relative",
    width: "100%",
    height: "240px",
    backgroundColor: "#111116",
    borderRadius: "2px",
    overflow: "hidden",
    marginBottom: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  productImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  viewBadge: {
    position: "absolute",
    bottom: "8px",
    right: "8px",
    backgroundColor: "rgba(0,0,0,0.7)",
    color: "#fff",
    fontSize: "0.55rem",
    fontFamily: "monospace",
    padding: "2px 6px",
    borderRadius: "2px",
  },
  productBody: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    flexGrow: 1,
  },
  productName: {
    fontSize: "0.95rem",
    fontWeight: "700",
    margin: "0 0 0.8rem 0",
    lineHeight: 1.3,
    color: "#ffffff",
  },
  talleLabel: {
    fontSize: "0.6rem",
    fontFamily: "monospace",
    color: "#71717a",
  },
  productFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "1rem",
    paddingTop: "0.8rem",
    borderTop: "1px solid #141418",
  },
  productPrice: {
    fontSize: "1.1rem",
    fontWeight: "800",
    color: "#ffffff",
  },
  buyBtn: {
    backgroundColor: "#ffffff",
    color: "#000000",
    border: "none",
    padding: "0.5rem 1rem",
    fontSize: "0.7rem",
    fontWeight: "800",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    backdropFilter: "blur(8px)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  modalCard: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#0a0a0d",
    color: "#ffffff",
    border: "1px solid #1c1c24",
    borderRadius: "2px",
    overflow: "hidden",
    maxWidth: "760px",
    width: "100%",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9), 0 0 25px rgba(229, 9, 20, 0.15)",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  modalImageWrapper: {
    width: "45%",
    minHeight: "340px",
    backgroundColor: "#111116",
  },
  modalImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  modalContent: {
    width: "55%",
    padding: "3rem 2.2rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  modalTitle: {
    fontSize: "1.6rem",
    fontWeight: "800",
    letterSpacing: "-0.5px",
    lineHeight: 1.2,
    margin: "0 0 1.2rem 0",
    color: "#ffffff",
  },
  modalText: {
    fontSize: "0.85rem",
    color: "#a1a1aa",
    lineHeight: 1.6,
    margin: "0 0 2rem 0",
    fontWeight: "400",
  },
  modalBtn: {
    backgroundColor: "#e50914",
    color: "#ffffff",
    border: "none",
    padding: "0.9rem 3rem",
    borderRadius: "2px",
    fontSize: "0.75rem",
    fontWeight: "700",
    letterSpacing: "2px",
    cursor: "pointer",
    transition: "background-color 0.3s ease",
  },
  gothicAuthCard: {
    position: "relative",
    backgroundColor: "#0a0a0d",
    border: "1px solid #1c1c24",
    padding: "2.8rem 2.2rem 2.2rem",
    maxWidth: "440px",
    width: "100%",
    boxShadow: "0 20px 50px rgba(0, 0, 0, 0.9), 0 0 20px rgba(229, 9, 20, 0.15)",
    display: "flex",
    flexDirection: "column",
    borderRadius: "2px",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  gothicCloseBtn: {
    position: "absolute",
    top: "16px",
    right: "18px",
    background: "none",
    border: "none",
    color: "#71717a",
    fontSize: "1.1rem",
    cursor: "pointer",
  },
  gothicAuthHeader: {
    marginBottom: "1.8rem",
    textAlign: "left",
  },
  gothicAuthTag: {
    fontFamily: "monospace",
    fontSize: "0.7rem",
    color: "#e50914",
    letterSpacing: "1px",
    display: "block",
    marginBottom: "4px",
  },
  gothicAuthTitle: {
    fontSize: "1.4rem",
    fontWeight: "800",
    letterSpacing: "1px",
    margin: 0,
    color: "#ffffff",
  },
  gothicForm: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  inputLabel: {
    fontSize: "0.68rem",
    fontFamily: "monospace",
    color: "#888893",
    letterSpacing: "0.5px",
  },
  gothicInput: {
    backgroundColor: "#111116",
    border: "1px solid #22222a",
    color: "#ffffff",
    padding: "10px 12px",
    borderRadius: "2px",
    fontSize: "0.85rem",
    outline: "none",
    fontFamily: "inherit",
    width: "100%",
  },
  gothicSubmitBtn: {
    backgroundColor: "#e50914",
    color: "#ffffff",
    border: "none",
    padding: "12px",
    fontSize: "0.75rem",
    fontWeight: "800",
    letterSpacing: "1.5px",
    cursor: "pointer",
    borderRadius: "2px",
    marginTop: "0.5rem",
  },
  gothicResendBtn: {
    backgroundColor: "#1c1c24",
    color: "#ffffff",
    border: "1px solid #22222a",
    padding: "10px",
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  gothicErrorBox: {
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    border: "1px solid #e50914",
    color: "#e50914",
    padding: "8px 12px",
    fontSize: "0.75rem",
    fontFamily: "monospace",
    marginBottom: "1rem",
    borderRadius: "2px",
  },
  gothicSuccessBox: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    border: "1px solid #4ade80",
    color: "#4ade80",
    padding: "8px 12px",
    fontSize: "0.75rem",
    fontFamily: "monospace",
    marginBottom: "1rem",
    borderRadius: "2px",
  },
  gothicLink: {
    color: "#888893",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  gothicDivider: {
    textAlign: "center",
    borderBottom: "1px solid #1c1c24",
    lineHeight: "0.1em",
    margin: "1.5rem 0 1rem",
    fontSize: "0.75rem",
    fontFamily: "monospace",
  },
  gothicGoogleBtn: {
    backgroundColor: "#111116",
    color: "#a1a1aa",
    border: "1px solid #22222a",
    padding: "10px",
    fontSize: "0.75rem",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  gothicFooterText: {
    textAlign: "center",
    fontSize: "0.75rem",
    color: "#71717a",
    marginTop: "1.5rem",
  },
  gothicLinkBold: {
    color: "#ffffff",
    fontWeight: "bold",
    cursor: "pointer",
  },
  userDropdownMenu: {
    position: "absolute",
    top: "100%",
    right: 0,
    backgroundColor: "#0a0a0d",
    border: "1px solid #1c1c24",
    borderRadius: "2px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.8)",
    padding: "0.8rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    zIndex: 1100,
    minWidth: "200px",
  },
  userMenuHeader: {
    borderBottom: "1px solid #18181c",
    paddingBottom: "0.5rem",
  },
  userMenuLabel: {
    fontSize: "0.6rem",
    fontFamily: "monospace",
    color: "#888893",
    display: "block",
  },
  userMenuEmail: {
    fontSize: "0.75rem",
    color: "#ffffff",
    fontWeight: "bold",
    wordBreak: "break-all",
  },
  userMenuProfileBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    padding: "0.4rem 0",
    textAlign: "left",
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
  },
  userMenuLogoutBtn: {
    background: "none",
    border: "none",
    color: "#e50914",
    padding: "0.4rem 0",
    textAlign: "left",
    fontSize: "0.7rem",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
  },
  drawerOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    backdropFilter: "blur(4px)",
    zIndex: 9999,
  },
  drawerContent: {
    position: "absolute",
    top: 0,
    right: 0,
    width: "360px",
    maxWidth: "90vw",
    height: "100vh",
    backgroundColor: "#0a0a0d",
    borderLeft: "1px solid #1c1c24",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    boxShadow: "-10px 0 30px rgba(0, 0, 0, 0.8)",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #18181c",
    paddingBottom: "1rem",
  },
  closeDrawerBtn: {
    background: "none",
    border: "none",
    color: "#a1a1aa",
    fontSize: "1.2rem",
    cursor: "pointer",
  },
  cartItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.8rem 0",
    borderBottom: "1px solid #141418",
  },
  cartItemTalle: {
    fontSize: "0.65rem",
    fontFamily: "monospace",
    backgroundColor: "#1c1c24",
    color: "#a1a1aa",
    padding: "2px 6px",
    borderRadius: "2px",
  },
  removeCartItemBtn: {
    background: "none",
    border: "none",
    color: "#52525b",
    cursor: "pointer",
    fontSize: "1rem",
  },
  drawerFooter: {
    borderTop: "1px solid #18181c",
    paddingTop: "1rem",
  },
  checkoutBtn: {
    width: "100%",
    backgroundColor: "#e50914",
    color: "#ffffff",
    border: "none",
    padding: "0.8rem",
    fontSize: "0.75rem",
    fontWeight: "800",
    letterSpacing: "1.5px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  adminSubNav: {
    display: "flex",
    gap: "0.5rem",
    marginTop: "0.5rem",
  },
  adminTab: {
    backgroundColor: "#0a0a0d",
    border: "1px solid #18181c",
    color: "#a1a1aa",
    padding: "0.4rem 0.8rem",
    fontSize: "0.65rem",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  adminTabActive: {
    backgroundColor: "#1c1c24",
    border: "1px solid #e50914",
    color: "#ffffff",
    padding: "0.4rem 0.8rem",
    fontSize: "0.65rem",
    fontWeight: "700",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  adminAddMainBtn: {
    backgroundColor: "#e50914",
    color: "#ffffff",
    border: "none",
    padding: "0.6rem 1.2rem",
    fontSize: "0.7rem",
    fontWeight: "800",
    letterSpacing: "1px",
    cursor: "pointer",
    borderRadius: "2px",
  },
  adminTableContainer: {
    overflowX: "auto",
    backgroundColor: "#0a0a0d",
    border: "1px solid #18181c",
    borderRadius: "2px",
  },
  adminTable: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "0.8rem",
  },
  th: {
    padding: "1rem",
    borderBottom: "1px solid #18181c",
    color: "#888893",
    fontFamily: "monospace",
    fontSize: "0.7rem",
  },
  thStyleRight: {
    padding: "1rem",
    borderBottom: "1px solid #18181c",
    color: "#888893",
    fontFamily: "monospace",
    fontSize: "0.7rem",
    textAlign: "right",
  },
  tr: {
    borderBottom: "1px solid #141418",
  },
  td: {
    padding: "0.8rem 1rem",
    color: "#ffffff",
  },
  tdRight: {
    padding: "0.8rem 1rem",
    color: "#ffffff",
    textAlign: "right",
  },
  adminThumb: {
    width: "40px",
    height: "40px",
    objectFit: "cover",
    borderRadius: "2px",
  },
  badgeCode: {
    fontFamily: "monospace",
    fontSize: "0.7rem",
    backgroundColor: "#111116",
    padding: "2px 6px",
    border: "1px solid #22222a",
    borderRadius: "2px",
  },
  talleBadgeAdmin: {
    fontSize: "0.6rem",
    fontFamily: "monospace",
    backgroundColor: "#1c1c24",
    padding: "1px 4px",
    borderRadius: "2px",
  },
  editBtn: {
    backgroundColor: "#27272a",
    color: "#a1a1aa",
    border: "none",
    padding: "0.3rem 0.6rem",
    fontSize: "0.65rem",
    fontWeight: "700",
    cursor: "pointer",
    borderRadius: "2px",
    marginRight: "0.4rem",
  },
  deleteBtn: {
    backgroundColor: "rgba(229, 9, 20, 0.2)",
    color: "#e50914",
    border: "1px solid rgba(229, 9, 20, 0.4)",
    padding: "0.3rem 0.6rem",
    fontSize: "0.65rem",
    fontWeight: "700",
    cursor: "pointer",
    borderRadius: "2px",
  },
};