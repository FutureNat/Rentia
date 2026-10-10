import { BarChart3, Boxes, ChevronDown, Megaphone, Wallet } from 'lucide-react';
import { landingProducts } from '../lib/landing-products';

const icons = { profit: Wallet, products: BarChart3, inventory: Boxes, ads: Megaphone };

export default function LandingHeader({ home = false }: { home?: boolean }) {
  const anchor = home ? '' : '/';
  return <nav className="nav shell" aria-label="Navegación principal">
    <a className="brand" href={`${anchor}#inicio`} aria-label="Rentia, inicio"><span className="brandMark"><img src="/favicon.svg" alt=""/></span>Rentia</a>
    <div className="navLinks">
      <details className="landingProductMenu" data-product-menu><summary>Producto <span className="productMenuCaret" aria-hidden="true"><ChevronDown/></span></summary>
        <div className="productMegaMenu">
          <div className="productMegaIntro"><span>EXPLORÁ RENTIA</span><small>Tus números, con una explicación clara.</small></div>
          <div className="productMegaGrid">{landingProducts.map(product => { const Icon = icons[product.kind]; return <a href={`/producto/${product.slug}`} key={product.slug}><span className="productMenuIcon"><Icon aria-hidden="true"/></span><span><b>{product.label}</b><small>{product.menuDescription}</small></span></a>; })}</div>
          <a className="productMegaAll" href="/producto">Ver todo el producto <span>Ventas, costos, stock y publicidad</span></a>
        </div>
      </details>
      <a href={`${anchor}#integraciones`}>Integraciones</a><a href={`${anchor}#precios`}>Precios</a><a href={`${anchor}#faq`}>FAQ</a>
    </div>
    <div className="navActions"><a className="loginLink" href="/ingresar">Ingresar</a><a className="button small" href="/registro">Crear cuenta</a></div>
  </nav>;
}

export function LandingFooter() {
  return <footer className="shell landingFooter"><a className="brand" href="/#inicio"><span className="brandMark"><img src="/favicon.svg" alt=""/></span>Rentia</a><span>© 2026 Rentia. Hecho para el e-commerce latinoamericano.</span><div><a href="/producto">Producto</a><a href="/#precios">Precios</a><a href="/#faq">FAQ</a></div></footer>;
}
