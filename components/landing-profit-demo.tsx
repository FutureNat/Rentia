'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Package, Truck, CreditCard, Megaphone, ReceiptText } from 'lucide-react';

const costs = [
  { label: 'Producto', amount: 35000, icon: Package },
  { label: 'Envío', amount: 5000, icon: Truck },
  { label: 'Comisiones', amount: 7000, icon: CreditCard },
  { label: 'Publicidad', amount: 18000, icon: Megaphone },
  { label: 'Impuestos', amount: 5000, icon: ReceiptText },
];

const money = (value: number) => `$ ${new Intl.NumberFormat('es-AR').format(value)}`;
const sale = 100000;
const lastStage = costs.length + 1;

export default function LandingProfitDemo() {
  // The server renders the complete, readable example. Motion is an enhancement.
  const [stage, setStage] = useState(lastStage);
  const [interacting, setInteracting] = useState(false);
  const [visible, setVisible] = useState(false);
  const [pageActive, setPageActive] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const demo = useRef<HTMLElement>(null);
  const autoPlayed = useRef(false);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    function updatePreference() {
      setReducedMotion(preference.matches);
      if (preference.matches) {
        autoPlayed.current = true;
        setStage(lastStage);
      }
    }
    function updateVisibility() { setPageActive(document.visibilityState === 'visible'); }
    updatePreference();
    updateVisibility();
    preference.addEventListener('change', updatePreference);
    document.addEventListener('visibilitychange', updateVisibility);
    const observer = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting);
      if (entry.isIntersecting && !autoPlayed.current && !preference.matches) {
        autoPlayed.current = true;
        setStage(0);
      }
    }, { threshold: .35 });
    if (demo.current) observer.observe(demo.current);
    return () => {
      observer.disconnect();
      preference.removeEventListener('change', updatePreference);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!visible || !pageActive || reducedMotion || interacting) return;
    const timer = window.setTimeout(() => setStage(stage >= lastStage ? 0 : stage + 1),
      stage >= lastStage ? 3800 : stage === 0 ? 1200 : 900);
    return () => window.clearTimeout(timer);
  }, [stage, visible, pageActive, reducedMotion, interacting]);

  const complete = stage === lastStage;
  const accountedCosts = costs.slice(0, Math.min(stage, costs.length)).reduce((sum, cost) => sum + cost.amount, 0);
  const remaining = sale - accountedCosts;
  const currentStep = stage === 0 ? 0 : complete ? 2 : 1;
  return <section ref={demo} tabIndex={0} onPointerEnter={() => setInteracting(true)} onPointerLeave={() => setInteracting(false)} onFocus={() => setInteracting(true)} onBlur={() => setInteracting(false)} className={`profitDemo premiumBeam ${complete ? 'isComplete' : 'isCalculating'}`} data-landing-beam aria-labelledby="profit-demo-title" aria-describedby="profit-demo-summary">
    <header className="profitDemoHeader">
      <span><img src="/favicon.svg" alt=""/> Rentia <b id="profit-demo-title">Una venta, explicada</b></span>
      <span className="profitExample">Demo ilustrativa</span>
    </header>
    <ol className="profitDemoSteps" aria-label="De la venta a la ganancia">
      {['Venta', 'Costos', 'Ganancia'].map((label, index) => <li key={label} className={index <= currentStep ? 'isCurrent' : ''} aria-current={index === currentStep ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}
    </ol>
    <div className="profitDemoBody" aria-hidden="true">
      <div className="profitSale">
        <span className="profitSaleIcon"><Check aria-hidden="true"/></span>
        <div><span>VENTA COBRADA</span><h2>Orden #10482</h2></div>
        <strong>{money(sale)}<small>ARS</small></strong>
      </div>
      <div className="profitLedger">
        <div className="profitLedgerHead"><span>Lo que cuesta esta venta</span><span>Importe</span></div>
        {costs.map(({ label, amount, icon: Icon }, index) => <div className={`profitCostRow ${stage > index ? 'isAccounted' : 'isWaiting'} ${stage === index + 1 ? 'isHighlight' : ''}`} key={label}>
          <span><Icon aria-hidden="true"/>{label}</span><b>{stage > index ? `− ${money(amount)}` : '—'}</b>
        </div>)}
      </div>
      <div className="profitResult"><div><span>{complete ? 'TE QUEDA' : 'RESTANTE POR REVISAR'}</span><strong key={stage}>{money(remaining)}</strong><small>{complete ? 'Después de todos estos costos' : 'Descontando los costos de la venta'}</small></div><span className="profitMargin">{complete ? '30%' : `${Math.min(stage, costs.length)}/${costs.length}`}<small>{complete ? 'de margen' : 'costos revisados'}</small></span></div>
      <div className="profitComposition"><span style={{ width: `${accountedCosts / sale * 100}%` }}/><span style={{ width: `${remaining / sale * 100}%` }}/></div>
      <div className="profitCompositionLabels"><span>{accountedCosts / sale * 100}% costos</span><span>{remaining / sale * 100}% {complete ? 'ganancia' : 'por revisar'}</span></div>
    </div>
    <p id="profit-demo-summary" className="landingSrOnly">Ejemplo ilustrativo en pesos argentinos: una venta de $100.000, menos $35.000 de producto, $5.000 de envío, $7.000 de comisiones, $18.000 de publicidad y $5.000 de impuestos. La ganancia es $30.000 y el margen es 30%. Estos importes no representan tarifas ni resultados reales. La animación se pausa al enfocar la demo o pasar el puntero por encima.</p>
    <footer className="profitDemoFooter"><span>Importes de ejemplo · ARS</span><span>{reducedMotion ? 'Vista sin animación' : interacting ? 'Pausada para leer' : 'Se repite automáticamente'}</span></footer>
  </section>;
}
