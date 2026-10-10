import { BarChart3, Boxes, Check, Megaphone, ShieldCheck } from 'lucide-react';
import LandingProductScene from './landing-product-scene';

const benefits = (items: string[]) => <ul className="productBenefits">{items.map(item => <li key={item}><Check aria-hidden="true"/>{item}</li>)}</ul>;

export default function LandingProductTour() {
  return <section className="section shell landingProduct" id="producto" aria-labelledby="product-title">
    <div className="sectionHead centered" data-landing-reveal><div><span className="tag">EXPLORÁ RENTIA</span><h2 id="product-title">De tus números<br/><em>a tu próxima decisión.</em></h2><p>Ventas, costos, productos y publicidad. Cada parte de tu operación, con una explicación clara.</p></div></div>
    <nav className="productChapters" aria-label="Secciones del producto"><a href="#rentabilidad">Ganancia</a><a href="#productos">Productos</a><a href="#inventario">Inventario</a><a href="#publicidad">Publicidad</a></nav>
    <p className="productExampleNote">Las vistas que siguen usan datos ilustrativos. No son resultados de una tienda real.</p>

    <article className="productChapter" id="rentabilidad" data-landing-scene>
      <div className="productChapterCopy" data-landing-reveal><span className="productKicker"><BarChart3 aria-hidden="true"/>01 · RENTABILIDAD</span><h3>Vender más está bien.<br/><em>Saber qué te queda, mejor.</em></h3><p>Reuní la facturación y los costos que Rentia conoce para entender el resultado de tu tienda, por período y por orden.</p>{benefits(['Producto, envío, comisiones e impuestos en la misma cuenta.', 'Inversión publicitaria visible junto a tus ventas.', 'Costos pendientes señalados, no escondidos.'])}<div className="productInsight"><ShieldCheck aria-hidden="true"/><span>Si falta un costo, la ganancia sigue siendo provisoria. Primero claridad; después decisiones.</span></div></div>
      <LandingProductScene kind="profit"/>
      <a className="productDetailLink" href="/producto/ganancia-real">Conocé la ganancia y sus costos</a>
    </article>

    <article className="productChapter reverse" id="productos" data-landing-scene>
      <div className="productChapterCopy" data-landing-reveal><span className="productKicker"><BarChart3 aria-hidden="true"/>02 · PRODUCTOS</span><h3>No todos tus productos<br/><em>dejan lo mismo.</em></h3><p>Compará ventas, costos y margen por producto. Encontrá qué aporta a tu resultado, más allá de cuántas unidades vendiste.</p>{benefits(['Ventas y rentabilidad por producto y variante.', 'Costos vinculados por SKU: el código de cada producto.', 'Información para revisar precios y promociones.'])}</div>
      <LandingProductScene kind="products"/>
      <a className="productDetailLink" href="/producto/productos">Explorá productos y márgenes</a>
    </article>

    <article className="productChapter" id="inventario" data-landing-scene>
      <div className="productChapterCopy" data-landing-reveal><span className="productKicker"><Boxes aria-hidden="true"/>03 · INVENTARIO</span><h3>Anticipate al<br/><em>“nos quedamos sin stock”.</em></h3><p>Relacioná las unidades disponibles con el ritmo de ventas del período. Mirá cuánto podría durar tu stock antes de decidir una reposición.</p>{benefits(['Stock y ventas por producto o variante.', 'Duración estimada según el ritmo de venta.', 'Alertas de reposición y productos sin movimiento.'])}<p className="productFootnote">La duración es una estimación: cambia si cambia la demanda.</p></div>
      <LandingProductScene kind="inventory"/>
      <a className="productDetailLink" href="/producto/inventario">Conocé cómo se estima tu stock</a>
    </article>

    <article className="productChapter reverse" id="publicidad" data-landing-scene>
      <div className="productChapterCopy" data-landing-reveal><span className="productKicker"><Megaphone aria-hidden="true"/>04 · PUBLICIDAD</span><h3>Lo que atribuye Meta.<br/><em>Lo que vende tu tienda.</em></h3><p>Son dos lecturas distintas. Compará la inversión y las ventas que Meta se atribuye con la facturación completa de tu tienda, sin mezclarlas.</p>{benefits(['Inversión, ROAS y costo por compra reportados por Meta.', 'Campañas y cuenta publicitaria en el mismo lugar.', 'Facturación total de la tienda como referencia separada.'])}<p className="productFootnote">Un ROAS alto no garantiza ganancia: también importan tus costos. Las ventas atribuidas no se suman otra vez al total de la tienda.</p></div>
      <LandingProductScene kind="ads"/>
      <a className="productDetailLink" href="/producto/publicidad">Entendé las dos lecturas del ROAS</a>
    </article>
  </section>;
}
