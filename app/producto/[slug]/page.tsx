import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import LandingProductDetail from '../../../components/landing-product-detail';
import { findLandingProduct, landingProducts } from '../../../lib/landing-products';
import '../../landing.css';

type ProductParams = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return landingProducts.map(product => ({ slug: product.slug })); }
export async function generateMetadata({ params }: ProductParams): Promise<Metadata> {
  const product = findLandingProduct((await params).slug);
  if (!product) notFound();
  return { title: `${product.title} — Rentia`, description: product.description };
}
export default async function ProductDetailPage({ params }: ProductParams) {
  const { slug } = await params;
  if (!findLandingProduct(slug)) notFound();
  return <LandingProductDetail slug={slug}/>;
}
