import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { posts } from "../../lib/blog";

export const metadata:Metadata={title:"Blog sobre tarjetas NFC y networking empresarial",description:"Guías sobre tarjetas NFC, identidad digital, networking, ventas y captación de contactos para empresas.",alternates:{canonical:"/blog"}};

export default function BlogPage(){return <main className="content-page"><nav className="content-nav"><Link href="/" className="wordmark">Smart<span>NFC</span></Link><Link href="/">Volver al inicio</Link></nav><header className="content-hero"><span>RECURSOS SMARTNFC</span><h1>Ideas para convertir cada contacto en una oportunidad.</h1><p>Guías prácticas sobre tarjetas NFC, identidad digital y networking medible para equipos comerciales.</p></header><section className="post-grid">{posts.map((post)=><article key={post.slug}><span>{post.category} · {post.readTime}</span><h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2><p>{post.description}</p><Link className="read-more" href={`/blog/${post.slug}`}>Leer artículo <ArrowRight size={16}/></Link></article>)}</section></main>}
