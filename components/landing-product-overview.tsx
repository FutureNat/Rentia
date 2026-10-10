import LandingHeader, { LandingFooter } from './landing-header';
import LandingMotion from './landing-motion';
import LandingProductTour from './landing-product-tour';

export default function LandingProductOverview() {
  return <main className="rentiaLanding productOverviewPage"><LandingMotion/><LandingHeader/><header className="shell productOverviewHero"><span className="tag">EL PRODUCTO</span><h1>Una operación.<br/><em>Tus números conectados.</em></h1><p>Explorá qué podés consultar en Rentia y cómo cada parte te ayuda a entender tu tienda.</p><a className="button" href="/registro">Probar Rentia gratis</a></header><LandingProductTour/><section className="cta shell premiumBeam" data-landing-beam data-landing-reveal><h2>Empezá por conocer<br/><em>qué te queda.</em></h2><p>14 días de prueba, sin tarjeta.</p><a className="button" href="/registro">Crear mi cuenta</a></section><LandingFooter/></main>;
}
