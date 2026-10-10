import { Check, ShieldCheck } from 'lucide-react';
import LandingHeader, { LandingFooter } from './landing-header';
import LandingMotion from './landing-motion';
import LandingProductScene from './landing-product-scene';
import { findLandingProduct, landingProducts } from '../lib/landing-products';

export default function LandingProductDetail({ slug }: { slug: string }) {
  const product = findLandingProduct(slug);
  if (!product) return null;
  return <main className="rentiaLanding productDetailPage">
    <LandingMotion/>
    <LandingHeader/>
    <div className="shell productDetailTop"><a className="productBack" href="/producto">Volver al producto</a><nav className="productChapters" aria-label="Funciones de Rentia">{landingProducts.map(item => <a key={item.slug} href={`/producto/${item.slug}`} aria-current={item.slug === slug ? 'page' : undefined}>{item.short}</a>)}</nav></div>
    <section className="shell productDetailHero" data-landing-scene aria-labelledby="detail-title">
      <div className="productDetailCopy"><span className="eyebrow premiumBeam" data-landing-beam>{product.tag}</span><h1 id="detail-title">{product.heading[0]}<br/><em>{product.heading[1]}</em></h1><p>{product.description}</p><div className="heroActions"><a className="button" href="/registro">Probar Rentia gratis</a><a className="ghost" href="#como-funciona">Cómo funciona</a></div><div className="trust"><span>14 días gratis</span><span>Sin tarjeta</span></div></div>
      <div className="productDetailVisual"><LandingProductScene kind={product.kind}/><p className="productExampleNote">Vista ilustrativa. No son resultados de una tienda real.</p></div>
    </section>
    <section className="shell productDetailBenefits" aria-label="Qué podés consultar" data-landing-reveal>{product.benefits.map(benefit => <div key={benefit}><Check aria-hidden="true"/><p>{benefit}</p></div>)}</section>
    <section className="section shell productHow" id="como-funciona"><div className="sectionHead" data-landing-reveal><div><span className="tag">CÓMO FUNCIONA</span><h2>{product.stepsTitle}</h2></div></div><div className="productHowGrid">{product.steps.map(([title,body],index) => <article key={title} data-landing-reveal><span className="productHowNumber">0{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div><div className="productDetailInsight" data-landing-reveal><ShieldCheck aria-hidden="true"/><p>{product.insight}</p></div></section>
    <section className="faq section shell landingFaq productDetailFaq" aria-labelledby="detail-faq-title"><div data-landing-reveal><span className="tag">PREGUNTAS FRECUENTES</span><h2 id="detail-faq-title">Lo importante,<br/><em>bien explicado.</em></h2><p>Algunas dudas sobre {product.short.toLocaleLowerCase('es-AR')}, antes de empezar.</p></div><div className="questions">{product.questions.map(([question,answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div></section>
    <section className="shell productRelated" data-landing-reveal><span className="tag">TODO ESTÁ CONECTADO</span><h2>Seguí explorando Rentia.</h2><div>{landingProducts.filter(item=>item.slug!==slug).map(item => <a href={`/producto/${item.slug}`} key={item.slug}><b>{item.label}</b><p>{item.menuDescription}</p><span>Explorar función</span></a>)}</div></section>
    <section className="cta shell premiumBeam" data-landing-beam data-landing-reveal><span className="tag">TU TIENDA, CON MÁS CLARIDAD</span><h2>Conocé tus números.<br/><em>Decidí con contexto.</em></h2><p>Empezá con Tiendanube y sumá Meta Ads. Paso a paso.</p><a className="button" href="/registro">Crear mi cuenta</a></section>
    <LandingFooter/>
  </main>;
}
