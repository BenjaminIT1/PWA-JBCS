

import { useState, useEffect } from "react";
import "./App.css";

type SplashProps = { onFinish: () => void };

function SplashScreen({ onFinish }: SplashProps) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p < 100 ? p + Math.ceil(Math.random() * 4) : 100));
    }, 20);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress >= 100) {
      const t = setTimeout(() => onFinish(), 450);
      return () => clearTimeout(t);
    }
  }, [progress, onFinish]);

  return (
    <div className="splash-bg">
      <div className="splash-content">
        <img src="/logo/logo.png" alt="Logo" className="splash-logo" />
        <h1 className="splash-title">Automatiza tu mundo con n8n</h1>
        <div className="splash-bar" aria-hidden>
          <div className="splash-bar-inner" style={{ width: `${progress}%` }} />
        </div>
        <small className="splash-sub">Cargando integraciones y flujos inteligentes...</small>
      </div>
    </div>
  );
}

function App() {
  const [loaded, setLoaded] = useState(false);
  const [active, setActive] = useState("home");

  function handleNavigate(id: string) {
    setActive(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {!loaded && <SplashScreen onFinish={() => setLoaded(true)} />}
      <div className={`app-bg ${!loaded ? "blurred" : ""}`} aria-hidden={!loaded}>
        <header className="header">
          <div className="header-content">
            <div className="brand">
              <img src="/logo/logo.png" alt="logo" className="logo-main" />
              <div className="brand-text">
                <div className="brand-title">AutomatizaPro</div>
                <div className="brand-sub">Soluciones con n8n</div>
              </div>
            </div>
            <nav className="nav">
              <button className={`nav-link ${active === "home" ? "active" : ""}`} onClick={() => handleNavigate("home")}>Inicio</button>
              <button className={`nav-link ${active === "services" ? "active" : ""}`} onClick={() => handleNavigate("services")}>Servicios</button>
              <button className={`nav-link ${active === "cases" ? "active" : ""}`} onClick={() => handleNavigate("cases")}>Casos</button>
              <button className={`nav-cta`} onClick={() => handleNavigate("contact")}>Agenda una demo</button>
            </nav>
          </div>
        </header>

        <main className="main">
          <section id="home" className="hero">
            <div className="hero-inner">
              <h1 className="hero-title">Automatización inteligente para tu empresa</h1>
              <p className="hero-sub">Conecta tus herramientas, automatiza tareas repetitivas y obtén datos accionables con n8n y nuestro equipo experto.</p>
              <div className="hero-cta">
                <button className="btn-primary" onClick={() => handleNavigate("contact")}>Solicitar demo</button>
                <button className="btn-ghost" onClick={() => handleNavigate("services")}>Ver servicios</button>
              </div>
            </div>
            <div className="hero-visual" aria-hidden>
              <svg className="visual-shape" viewBox="0 0 600 400" preserveAspectRatio="xMidYMid slice">
                <defs>
                </defs>
                <rect x="0" y="0" width="600" height="400" rx="24" fill="url(#g1)" opacity="0.18" />
              </svg>
            </div>
          </section>

          <section id="services" className="section services">
            <h2 className="section-title">Servicios</h2>
            <div className="services-grid">
              <article className="service-card">
                <div className="svc-icon">🔗</div>
                <h4>Integraciones a medida</h4>
                <p>Conecta APIs, CRM, ERP y más mediante flujos visuales en n8n.</p>
              </article>
              <article className="service-card">
                <div className="svc-icon">🤖</div>
                <h4>Automatización de procesos</h4>
                <p>Reduce errores y acelera procesos con flujos reutilizables.</p>
              </article>
              <article className="service-card">
                <div className="svc-icon">🔒</div>
                <h4>Seguridad y buenas prácticas</h4>
                <p>Implementación segura, monitoreo y respaldo de datos.</p>
              </article>
            </div>
          </section>

          <section id="cases" className="section cases">
            <h2 className="section-title">Casos de éxito</h2>
            <div className="cases-grid">
              <div className="case-card">
                <h5>Retail Automation</h5>
                <p>Aumento del 35% en la velocidad de procesamiento de pedidos mediante automatización.</p>
              </div>
              <div className="case-card">
                <h5>Finanzas</h5>
                <p>Conciliación automatizada que redujo el trabajo manual en 80%.</p>
              </div>
              <div className="case-card">
                <h5>Soporte al cliente</h5>
                <p>Rutas automáticas y respuestas físicas que mejoraron SLA en 40%.</p>
              </div>
            </div>
          </section>

          <section id="contact" className="section contact">
            <h2 className="section-title">Contacta con nosotros</h2>
            <div className="contact-card">
              <p>¿Quieres automatizar un proceso? Agenda una demo y te mostramos una solución en 48 horas.</p>
              <div className="contact-actions">
                <a className="btn-primary" href="mailto:info@automatizapro.example">Enviar correo</a>
                <button className="btn-ghost" onClick={() => alert('Gracias! nos contactaremos pronto')}>Solicitar llamada</button>
              </div>
            </div>
          </section>
        </main>

        <footer className="footer">
          <div className="footer-inner">
            <div>© {new Date().getFullYear()} AutomatizaPro</div>
            <div className="foot-links">Hecho con ♥ usando n8n</div>
          </div>
        </footer>
      </div>
    </>
  );
}

export default App;
