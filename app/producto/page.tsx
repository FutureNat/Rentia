import type { Metadata } from 'next';
import LandingProductOverview from '../../components/landing-product-overview';
import '../landing.css';

export const metadata: Metadata = { title: 'Producto — Rentia', description: 'Explorá ganancia y costos, productos, inventario y publicidad de tu tienda en Rentia.' };
export default function ProductOverviewPage() { return <LandingProductOverview/>; }
