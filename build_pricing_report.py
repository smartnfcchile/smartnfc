from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE
from datetime import date

OUT = r"C:\Users\new\super-tarjetasnfc\Informe estratégico SmartNFC 2026.docx"
NAVY="0B2545"; BLUE="2563EB"; PALE="E8EEF5"; LIGHT="F2F4F7"; GOLD="B7791F"; RED="9B1C1C"; GREEN="166534"; MUTED="5B6472"

def shade(cell, fill):
    tcPr=cell._tc.get_or_add_tcPr(); shd=tcPr.find(qn('w:shd'))
    if shd is None: shd=OxmlElement('w:shd'); tcPr.append(shd)
    shd.set(qn('w:fill'), fill)
def margins(cell, top=90, start=120, bottom=90, end=120):
    tcPr=cell._tc.get_or_add_tcPr(); mar=tcPr.first_child_found_in('w:tcMar')
    if mar is None: mar=OxmlElement('w:tcMar'); tcPr.append(mar)
    for tag,val in [('top',top),('start',start),('bottom',bottom),('end',end)]:
        el=mar.find(qn('w:'+tag))
        if el is None: el=OxmlElement('w:'+tag); mar.append(el)
        el.set(qn('w:w'),str(val)); el.set(qn('w:type'),'dxa')
def repeat_header(row):
    trPr=row._tr.get_or_add_trPr(); el=OxmlElement('w:tblHeader'); el.set(qn('w:val'),'true'); trPr.append(el)
def set_cell_text(cell, text, bold=False, color=None, size=8.4):
    cell.text=''; p=cell.paragraphs[0]; p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.0
    r=p.add_run(str(text)); r.bold=bold; r.font.name='Arial'; r.font.size=Pt(size)
    if color: r.font.color.rgb=RGBColor.from_string(color)
    cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER; margins(cell)
def table(doc, headers, rows, widths=None, font=8.2):
    t=doc.add_table(rows=1, cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    if widths:
        for c,w in zip(t.rows[0].cells,widths): c.width=Inches(w)
    for i,h in enumerate(headers): set_cell_text(t.rows[0].cells[i],h,True,'FFFFFF',8); shade(t.rows[0].cells[i],NAVY)
    repeat_header(t.rows[0])
    for ri,row in enumerate(rows):
        cells=t.add_row().cells
        for i,v in enumerate(row):
            if widths: cells[i].width=Inches(widths[i])
            set_cell_text(cells[i],v,False,None,font)
            if ri%2: shade(cells[i],LIGHT)
    doc.add_paragraph().paragraph_format.space_after=Pt(1)
    return t
def add_hyperlink(p,text,url):
    part=p.part; rid=part.relate_to(url,'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',is_external=True)
    h=OxmlElement('w:hyperlink'); h.set(qn('r:id'),rid); r=OxmlElement('w:r'); pr=OxmlElement('w:rPr'); col=OxmlElement('w:color'); col.set(qn('w:val'),BLUE); pr.append(col); u=OxmlElement('w:u'); u.set(qn('w:val'),'single'); pr.append(u); r.append(pr); tx=OxmlElement('w:t'); tx.text=text; r.append(tx); h.append(r); p._p.append(h)
def para(doc,text='',bold_lead=None):
    p=doc.add_paragraph(); p.paragraph_format.space_after=Pt(6); p.paragraph_format.line_spacing=1.1
    if bold_lead and text.startswith(bold_lead):
        p.add_run(bold_lead).bold=True; p.add_run(text[len(bold_lead):])
    else: p.add_run(text)
    return p
def bullets(doc, items):
    for x in items:
        p=doc.add_paragraph(style='List Bullet'); p.paragraph_format.space_after=Pt(4); p.add_run(x)
def heading(doc,text,level=1):
    return doc.add_heading(text,level=level)
def callout(doc,label,text,color=PALE):
    t=doc.add_table(rows=1,cols=1); t.autofit=False; t.columns[0].width=Inches(6.5); c=t.cell(0,0); shade(c,color); margins(c,160,180,160,180)
    repeat_header(t.rows[0])
    c.text=''; p=c.paragraphs[0]; r=p.add_run(label.upper()+"  "); r.bold=True; r.font.color.rgb=RGBColor.from_string(NAVY); p.add_run(text)
    doc.add_paragraph().paragraph_format.space_after=Pt(2)

d=Document(); sec=d.sections[0]; sec.page_width=Inches(8.5); sec.page_height=Inches(11); sec.top_margin=sec.bottom_margin=sec.left_margin=sec.right_margin=Inches(1); sec.header_distance=sec.footer_distance=Inches(.492)
styles=d.styles; normal=styles['Normal']; normal.font.name='Arial'; normal.font.size=Pt(10.5); normal.font.color.rgb=RGBColor.from_string('20242A'); normal.paragraph_format.space_after=Pt(6); normal.paragraph_format.line_spacing=1.1
for name,size,color,bef,aft in [('Title',29,NAVY,0,8),('Subtitle',13,MUTED,0,14),('Heading 1',16,BLUE,16,8),('Heading 2',13,BLUE,12,6),('Heading 3',11.5,NAVY,8,4)]:
    s=styles[name]; s.font.name='Arial'; s.font.size=Pt(size); s.font.color.rgb=RGBColor.from_string(color); s.font.bold=name!='Subtitle'; s.paragraph_format.space_before=Pt(bef); s.paragraph_format.space_after=Pt(aft); s.paragraph_format.keep_with_next=True
for sname in ['List Bullet','List Number']:
    styles[sname].font.name='Arial'; styles[sname].font.size=Pt(10.3); styles[sname].paragraph_format.left_indent=Inches(.5); styles[sname].paragraph_format.first_line_indent=Inches(-.25); styles[sname].paragraph_format.space_after=Pt(4)

# header/footer
h=sec.header.paragraphs[0]; h.text='SMARTNFC  |  Inteligencia competitiva y estrategia de producto'; h.style=styles['Normal']; h.runs[0].font.size=Pt(8); h.runs[0].font.color.rgb=RGBColor.from_string(MUTED)
f=sec.footer.paragraphs[0]; f.alignment=WD_ALIGN_PARAGRAPH.RIGHT; f.add_run('Informe estratégico · 24 agosto 2026  |  ')
fld=OxmlElement('w:fldSimple'); fld.set(qn('w:instr'),'PAGE'); f._p.append(fld)

p=d.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(108); r=p.add_run('INTELIGENCIA COMPETITIVA'); r.bold=True; r.font.size=Pt(10); r.font.color.rgb=RGBColor.from_string(GOLD)
p=d.add_paragraph(style='Title'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run('SmartNFC Chile 2026')
p=d.add_paragraph(style='Subtitle'); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run('Validación crítica del estudio de pricing, benchmark funcional y propuesta para liderar el mercado')
p=d.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(50); p.add_run('Preparado para Ariel Jara\n').bold=True; p.add_run('Análisis independiente basado en el producto actual y fuentes públicas vigentes al 24-08-2026')
d.add_page_break()

heading(d,'Conclusión ejecutiva',1)
callout(d,'Veredicto','La tesis central de Claude es correcta: SmartNFC debe venderse como plataforma de conversión de contactos, no como una tarjeta NFC. El pricing equilibrado es defendible como hipótesis de lanzamiento, pero no está todavía “validado”: faltan entrevistas, pruebas de precio, costos reales, CAC, activación y churn.')
para(d,'SmartNFC ya posee más producto del que el estudio reconoce: perfiles editables, NFC/QR, captura consentida, CRM básico, analítica por evento, equipos y roles, operación física de tarjetas, diseño para impresión y un módulo Local. La brecha no es “crear un CRM desde cero”, sino convertir componentes aislados en un flujo completo y medible desde el encuentro hasta la venta o la recompra.')
bullets(d,[
    'Prioridad competitiva: API pública + webhooks + conectores CRM antes de ampliar el CRM interno.',
    'Prioridad de retención: automatización de seguimiento, tareas, recordatorios, pipeline y atribución por campaña/evento.',
    'Prioridad enterprise: SSO/SCIM, aprovisionamiento masivo, auditoría, SLA, seguridad y gobierno de datos.',
    'Prioridad Local: fidelización real (visitas/puntos/canjes), Wallet y reputación Google; hoy Local es captación y exportación para difusión, no un sustituto completo de Lazoo.',
    'Prioridad comercial: mantener precios simples, pero cobrar por valor y volumen; no bloquear la captura básica en Free si el benchmark ya la regala.'
])
heading(d,'1. Auditoría del estudio de pricing de Claude',1)
heading(d,'1.1 Qué valida este análisis',2)
table(d,['Tesis de Claude','Evaluación','Razón'],[
 ['Posicionarse como plataforma, no hardware','VALIDADA','El hardware está comoditizado; los líderes monetizan gestión, captura, integración y automatización.'],
 ['US$4–7 por usuario/mes en equipos','VALIDADA','Blinq US$4,99 anual; HiHello US$5; Wave US$5; Uniqode US$6.'],
 ['Tarjeta moderada + SaaS','VALIDADA CON MATIZ','Funciona, pero Dot/V1CE muestran que también conviven compra única y software premium. Debe existir una experiencia útil tras cancelar.'],
 ['Empresa base $39.990/5 usuarios','RAZONABLE, NO VALIDADA','Equivale a $7.998 por asiento, sobre el benchmark global; se defiende con hardware, soporte local y CRM, pero requiere test.'],
 ['Local $19.990–$69.990','RAZONABLE','Está bajo Lazoo y cerca de ChileQR, pero las prestaciones propuestas exceden lo hoy implementado.'],
 ['Free sin captura ni analítica','DESAFIADA','Wave incluye captura y analítica avanzada gratis; Uniqode entrega hasta 5 leads. Conviene limitar volumen/exportación/integración, no eliminar el aha moment.']
],[2.2,1.25,3.05])
heading(d,'1.2 Correcciones y debilidades',2)
bullets(d,[
 'Blinq: el estudio presenta un add-on CRM de US$199/mes. La oferta pública actual cobra Business por asiento y la captura avanzada por créditos/uso; no hay sustento actual para usar US$199 como ancla fija.',
 'ChileQR: la tabla “$4.900–$79.900/mes” mezcla productos y periodos. Puntos QR publica hoy $24.900/$42.900/$72.900 mensuales con IVA; otros módulos se venden mensual, semestral o anual.',
 'Popl: el precio público no quedó tan verificable como Blinq/Wave/HiHello/Uniqode. Conviene tratarlo como oferta a cotización/uso, no como un número central del modelo.',
 'Disposición a pagar: comparar con Netflix, Canva, Bsale o Defontana sirve como ancla narrativa, pero no prueba willingness-to-pay por SmartNFC.',
 'LTV: usar LTV=ARPU/churn sin margen bruto y con churn hipotético es ilustrativo, no una economía unitaria. Para decidir CAC debe usarse margen de contribución, cohortes y payback.',
 'Proyección: multiplicar mezcla y ARPU constante no incorpora descuentos anuales, IVA, hardware incluido, costos de implementación, mora, soporte ni expansión/contracción de asientos.',
 'Competencia: el estudio enumera actores, pero no compara de forma uniforme seguridad, aprovisionamiento, integraciones, captura, automatización, atribución y administración.'
])
callout(d,'Decisión de pricing','Lanzar el catálogo equilibrado como experimento controlado, no como verdad final. Publicar mensual y anual; instrumentar conversión, activación a 7 días, leads por perfil, retención a 30/90 días y objeciones de precio. Revisar a los 30 clientes pagantes o 90 días, lo que ocurra primero.','FFF4D6')

heading(d,'2. Mapa competitivo chileno',1)
table(d,['Competidor','Precio público','Fortalezas verificadas','Brecha/oportunidad para SmartNFC'],[
 ['LINKD','PVC $29.990–$49.990; Enterprise a cotizar','NFC+QR, perfil editable, dashboard taps/leads, roles, API/webhooks, CRM Hapee, onboarding.','Rival directo más peligroso. SmartNFC debe igualar API/webhooks y probar mejor atribución/CRM, apoyándose en Local y operación física integrada.'],
 ['NFCID','$19.990 (1–5), $16.990 (6–20), $13.990 (21–50)','PVC full color, perfil editable, volumen, pago único.','Gana por simplicidad/precio. No competir a la baja; demostrar pipeline y ROI.'],
 ['Tarjetas Digitales Chile','Cotización; soporte/mantención 1 año','NFC+QR, perfil, acciones, panel de equipos, diseño coordinado.','SmartNFC puede diferenciarse con recurrencia transparente, analítica y captura gobernada.'],
 ['VCard.cl','No público','NFC+QR, miniweb, venta/pagos, panel empresa, estadísticas, alta/edición/desactivación.','Agregar pagos/servicios no es prioridad general, pero sí opción vertical para independientes.'],
 ['Lazoo','$24.990 / $52.990 / $99.990 / desde $149.990 + IVA mes','Wallet, sellos/visitas, campañas push, geolocalización, segmentación, gift cards, automatización, multi-sucursal.','SmartNFC Local hoy no iguala fidelización ni Wallet. Debe elegir: construir ese núcleo o no prometer paridad.'],
 ['ChileQR – Puntos QR','$24.900 / $42.900 / $72.900 mes IVA incl.','Puntos, recompensas, campañas, panel, estadísticas, web app, 200/600/ilimitados.','Competidor de entrada Local. SmartNFC suma NFC físico y consentimiento; faltan puntos/canjes.'],
 ['ChileQR – QR Pro','$12.900 / $24.900 / $34.900 mes IVA incl.','QR dinámicos masivos, analítica, dominios, proyectos, seguridad.','No rival directo, pero eleva expectativas sobre dominios, analítica y gestión masiva.'],
 ['Pluu','Referencia del estudio: $49.990/5 usuarios; verificar en cotización','CRM pyme, pipeline, cotizaciones, WhatsApp e IA según oferta reportada.','Sustituto del CRM. SmartNFC debe integrar antes de intentar reemplazar un CRM comercial completo.']
],[1.05,1.1,2.15,2.2],7.4)

heading(d,'3. Benchmark internacional de capacidades',1)
table(d,['Plataforma','Precio actual verificable','Capacidades distintivas','Lección'],[
 ['Blinq','Free; Premium US$9,99 mensual; Business US$6,99 mensual o US$4,99 anual/usuario, mínimo 5','Wallet, scanner universal, IA/notas, enriquecimiento, campañas/atribución, 20+ CRM, API, provisión, SSO enterprise.','El valor ya migró desde “tarjeta digital” a inteligencia de contacto.'],
 ['Wave','Free; Pro US$7; Teams US$5/usuario/mes, mínimo 3','Free con leads/analítica; Teams con administración, plantillas bloqueadas, CRM; Enterprise SSO/SCIM/SOC 2; captura eventos offline.','No esconder el aha moment; monetizar marca, equipos, integración y eventos.'],
 ['HiHello','Free; Professional US$6; Business US$5/usuario/mes (5–100)','Wallet, NFC propio, sharing offline, scans, CRM, directorio; SOC 2/GDPR.','Seguridad y aprovisionamiento son parte del producto enterprise.'],
 ['Uniqode','Free; Team US$6/usuario/mes anual; Business+ custom','Dos vías, Wallet, leads, analítica, multidioma, smart-fill, bulk, Google Workspace; CRM y Entra en Business+.','La analítica y los controles de marca se convierten en infraestructura organizacional.'],
 ['Dot','Equipo a cotización; hardware desde US$15 y custom US$50–75','Scanner IA, mapa de leads, recordatorios, auto-intro, CRM, white label, insights.','Seguimiento inmediato y contexto geográfico son diferenciadores.'],
 ['V1CE','Tarjeta desde £75 una vez; Client Capture OS £49/mes','CRM de networking, follow-ups, IA, booking, acuerdos, pagos, campañas, dominio, Wallet.','Demuestra un techo premium si se cierra el ciclo encuentro→venta.'],
 ['Popl','Cotización/uso en oferta actual','Captura formularios/badges/QR, offline, CRM, plantillas, subequipos, SSO, HR, analítica de equipo.','Eventos y atribución pueden venderse como módulo separado por volumen.']
],[.85,1.3,2.75,1.6],7.3)

heading(d,'4. Radiografía del SmartNFC actual',1)
para(d,'La revisión se hizo sobre el repositorio operativo disponible, no solo sobre el sitio comercial. Esto evita declarar como “faltante” algo ya construido.')
table(d,['Área','Estado observado','Madurez'],[
 ['Identidad digital','Perfil editable, foto/logo/cover, temas, bio, video, redes, botones, enlaces, vCard.','Sólida base individual; faltan dominios, multidioma, Wallet, firma y fondos virtuales.'],
 ['NFC/QR y físico','Tokens/UID, estados de producción, QR dinámico, editor CR80, exportación PNG/SVG/PDF y pedidos.','Diferenciador operacional real; revisar calidad de impresión y dependencia de QR externo.'],
 ['Captura y consentimiento','Formulario configurable, consentimiento, deduplicación por empresa, fuente NFC/QR/directa, historial de interacciones.','Buena base y superior a hardware puro; faltan preferencias, DSAR, retención y centro de privacidad.'],
 ['CRM','Leads, estados, notas, exportación CSV e interacciones.','CRM básico existente; sin tareas, recordatorios, propietario, valor, etapas configurables, automatizaciones ni sync.'],
 ['Analítica','Vistas, taps NFC, WhatsApp, teléfono, email, links, vCard y cruce con leads.','Base útil; faltan funnel, atribución por campaña/evento, ROI, cohortes, UTM, filtros y exportación/API.'],
 ['Equipos','Empresas, owner/admin/collaborator, invitaciones, límites de identidad, panel multiusuario.','Base funcional; faltan grupos, plantillas bloqueadas, bulk import, directory sync, SSO/SCIM y delegación granular.'],
 ['SmartNFC Local','Campañas, puntos NFC/QR, suscriptores, consentimiento, beneficio, métricas y lotes de exportación WhatsApp.','MVP de captación; no fidelización completa: sin puntos/sellos/canje, Wallet, automatización ni multi-sucursal consolidada.'],
 ['Plataforma comercial','Planes/licencias modelados.','No se observan checkout, facturación recurrente, trial self-service, metering, dunning ni portal de suscripción.'],
 ['Integraciones/API','Rutas internas y públicas específicas.','No hay API pública versionada, OAuth/API keys, webhooks, Zapier/Make ni conectores CRM evidentes.']
],[1.15,4.2,1.15],8.0)

heading(d,'5. ¿Qué falta para ser los mejores?',1)
callout(d,'Respuesta corta','No falta “un CRM” genérico. Falta una capa de orquestación que conecte captura, consentimiento, enriquecimiento, seguimiento, CRM externo y atribución. La API es prioritaria; el CRM interno debe seguir liviano y excepcionalmente fácil.')
table(d,['Prioridad','Capacidad','Por qué gana mercado','Definición mínima'],[
 ['P0','API pública + webhooks','Neutraliza la ventaja de LINKD y evita competir contra HubSpot/Pluu.','API v1, API keys/OAuth, eventos lead.created/updated, tap, consent; idempotencia, logs, límites y sandbox.'],
 ['P0','CRM accionable','Convierte datos en seguimiento, no solo almacenamiento.','Owner, pipeline configurable, tareas/fecha próxima acción, recordatorios, etiquetas, actividad y búsqueda.'],
 ['P0','Automatización de follow-up','Es la brecha más visible frente a V1CE/Dot.','Email/WhatsApp asistido, plantillas, reglas por fuente/campaña, opt-out y trazabilidad; API oficial de WhatsApp.'],
 ['P0','Funnel y atribución','Permite vender ROI y defender precio.','Share/tap → vista → lead → reunión → oportunidad → ganado; campañas, eventos, UTM y costo/resultado.'],
 ['P1','Integraciones nativas','Reduce implementación y churn B2B.','HubSpot, Salesforce, Zoho/Pipedrive, Google/Outlook Contacts, Zapier/Make; import/export bidireccional.'],
 ['P1','Wallet + sharing omnicanal','El benchmark lo considera estándar.','Apple/Google Wallet pass, firma de email, fondo virtual y QR branded.'],
 ['P1','Gobierno de equipos','Abre medianas y grandes cuentas.','Plantillas, campos bloqueados, importación masiva, subequipos, roles granulares, reasignación al salir.'],
 ['P1','Privacidad operacional','Chile eleva exigencia de datos personales.','Registro de base legal, preferencias, revocación, exportar/eliminar, retención, DPA y auditoría.'],
 ['P2','Enterprise trust','Necesario para industria, banca y grandes organizaciones.','SSO SAML/OIDC, SCIM, SLA, estado, backups, auditoría, residencia/seguridad documentada y plan SOC 2/ISO.'],
 ['P2','Captura avanzada en eventos','Producto premium separable.','Scanner de tarjetas/badges, modo offline, calificadores, notas/voz, enriquecimiento y dashboard por evento.'],
 ['P2','Local Loyalty','Necesario para competir realmente con Lazoo/ChileQR.','Visitas/puntos, reglas, canjes, segmentos, Wallet, reseñas Google, automatizaciones y multi-sucursal.'],
 ['P3','IA útil','Solo después del dato y workflow.','Resumen/notas, siguiente acción, borradores y enriquecimiento con consentimiento; no chatbot ornamental.']
],[.45,1.35,2.2,2.5],7.5)

heading(d,'6. Estructura de producto recomendada',1)
table(d,['Producto','Cliente','Promesa','Módulos incluidos'],[
 ['SmartNFC Connect','Individual','Compartir y capturar sin fricción.','Perfil, NFC/QR/Wallet, vCard, formulario, analítica básica, contactos limitados.'],
 ['SmartNFC Teams','Equipos 3–50','Marca consistente y seguimiento medible.','Admin, plantillas bloqueadas, CRM accionable, atribución, integraciones, firmas, bulk.'],
 ['SmartNFC Revenue','Equipos comerciales/eventos','De conversación a oportunidad.','Scanner/eventos, automatización, enriquecimiento, CRM sync, ROI y API; add-on por volumen.'],
 ['SmartNFC Enterprise','50+ / regulados','Identidad y datos gobernados a escala.','SSO/SCIM, SLA, auditoría, DPA, dominios, soporte/onboarding y API avanzada.'],
 ['SmartNFC Local','Comercio recurrente','Convertir visitas en base propia y recompra.','NFC/QR, consentimiento, campañas, loyalty, Wallet, reseñas y multi-sucursal.']
],[1.2,1.15,1.65,2.5],8.0)
para(d,'Arquitectura recomendada: un núcleo compartido de identidad, eventos, contactos, consentimiento, organizaciones y facturación; encima, módulos Connect/Teams/Revenue/Local. Evitar dos productos aislados con datos incompatibles. Un mismo contacto debe poder originarse en una tarjeta personal, un stand, un evento o una campaña Local y conservar fuente, consentimiento y atribución.')
heading(d,'7. Pricing propuesto',1)
para(d,'La estructura de Claude puede mantenerse durante la validación, con tres ajustes: (1) alinear precio por asiento con benchmark al crecer; (2) incluir captura limitada en Free; (3) separar Revenue/Eventos como add-on de alto valor.')
table(d,['Plan','Precio sugerido de prueba','Incluye','Límite/expansión'],[
 ['Free','$0','1 perfil con marca, QR/Wallet, hasta 10 leads y 30 días de analítica.','Sin exportación ni integraciones; demuestra valor.'],
 ['Connect','$4.990/mes o $49.990/año','Perfil sin marca, NFC/QR/Wallet, captura, exportación, analítica básica.','1 identidad; tarjeta aparte o incluida anual.'],
 ['Connect Pro','$9.990/mes o $99.990/año','3 identidades, CRM personal, tareas, automatización ligera, dominio.','No administración de equipos.'],
 ['Teams','$39.990/mes, 5 asientos','Admin, marca, CRM compartido, plantillas, firmas, integración estándar.','$6.990–$7.990 por asiento adicional; descuento desde 20.'],
 ['Revenue','Desde $49.990/mes add-on','Eventos, scanner, qualifiers, automatización, CRM sync y ROI.','Cobro por equipo + volumen de leads, no solo asiento.'],
 ['Enterprise','Cotización','SSO/SCIM, SLA, API, seguridad, onboarding.','Contrato anual y mínimo de implementación.'],
 ['Local','$19.990 / $39.990 / $69.990 + IVA','Captura; luego loyalty/Wallet/automatización según nivel.','No vender Pro/Plus hasta que esas capacidades estén operativas.']
],[1.0,1.4,2.7,1.4],8.0)
callout(d,'Guardrail','No ofrecer “tarjeta incluida anual” sin conocer costo puesto en cliente, tasa de devoluciones, personalización y soporte. Convertirlo en crédito de hardware hasta medir margen por cohorte.','FFF4D6')

heading(d,'8. Roadmap para liderazgo',1)
table(d,['Horizonte','Entregables','Métrica de salida'],[
 ['0–30 días','Instrumentación de funnel; catálogo de planes; definición API; CRM con owner/tarea/próxima acción; entrevistas y test de precio.','≥15 entrevistas; activación definida; 10 clientes pagantes; baseline leads/usuario.'],
 ['31–90 días','Webhooks/API v1; HubSpot/Google Contacts/Zapier; automatización inicial; campañas/eventos; Wallet; onboarding guiado.','≥50% activa captura en 7 días; ≥30% conecta integración; retención 90 días medible.'],
 ['3–6 meses','Plantillas bloqueadas, bulk, atribución/ROI, scanner, offline, Local loyalty MVP, reseñas Google.','2 casos de éxito con ROI; expansión de asientos; churn mensual bajo objetivo.'],
 ['6–12 meses','SSO/SCIM, auditoría avanzada, SLA, seguridad formal, multi-sucursal, automatizaciones maduras y canal partners.','Primeras cuentas 50+; implementación repetible; margen bruto y payback saludables.']
],[.9,4.2,1.4],8.2)
heading(d,'9. Indicadores que deben gobernar la decisión',1)
bullets(d,[
 'Activación: perfil publicado + primer share/tap + primer lead capturado dentro de 7 días.',
 'Time-to-value: horas/días hasta primer lead y hasta primera acción de seguimiento.',
 'Funnel: taps→vistas→formularios→leads→tareas→reuniones→oportunidades→ganadas.',
 'Retención por cohorte y segmento a 30/90/180 días; churn de logos y de MRR.',
 'Integración: porcentaje de cuentas Teams con CRM/webhook activo y éxito de sincronización.',
 'Economía: margen de contribución, CAC por canal, payback, expansión de asientos y soporte por cuenta.',
 'Local: suscripciones, consentimientos vigentes, visitas/canjes, campañas y recompra atribuida.'
])

heading(d,'10. Riesgos estratégicos',1)
table(d,['Riesgo','Impacto','Mitigación'],[
 ['Construir un CRM completo','Dispersa foco y queda detrás de plataformas maduras.','CRM liviano nativo + integración profunda; ganar en captura física y atribución.'],
 ['Prometer Local completo antes de tiempo','Churn y pérdida de confianza frente a Lazoo.','Vender MVP como captación; habilitar loyalty por fases y pilotos.'],
 ['Free demasiado mutilado','El usuario nunca vive el momento de valor.','Cuota de leads/analítica; cobrar por escala, marca, exportación e integración.'],
 ['Pricing sin evidencia','Optimiza una hoja, no el mercado.','Tests, entrevistas, cohortes y revisión periódica; no descuentos permanentes.'],
 ['Datos personales sin operación madura','Riesgo contractual y reputacional.','Privacy by design, DPA, derechos, retención, auditoría y consentimientos versionados.'],
 ['Dependencia de hardware','Margen/logística distraen al SaaS.','Estandarizar SKUs, QA, proveedores y crédito de hardware; medir costo puesto.']
],[1.7,2.1,2.7],8.3)

heading(d,'11. Fuentes verificadas y criterio de evidencia',1)
para(d,'Fuentes públicas consultadas el 24 de agosto de 2026. Se priorizaron páginas oficiales. Los precios pueden cambiar y las cotizaciones enterprise no son comparables sin alcance contractual.')
sources=[
 ('LINKD – producto, precios y Enterprise','https://linkd.cl/'),('LINKD Empresas','https://linkd.cl/empresas/'),('NFCID – precios por volumen','https://nfcid.cl/'),('Tarjetas Digitales Chile','https://tarjetasdigitaleschile.cl/tarjetas-de-presentacion-con-nfc'),('VCard.cl','https://vcard.cl/'),('Lazoo – precios y funciones','https://lazoo.cl/'),('ChileQR – Puntos QR','https://chileqr.cl/puntos-qr/'),('ChileQR – QR Pro','https://chileqr.cl/qr-pro/'),('Blinq – pricing','https://blinq.me/pricing'),('Blinq – captura por uso','https://support.blinq.me/en/articles/76257-lead-capture-pricing'),('Wave – pricing','https://wavecnct.com/pricing'),('HiHello – pricing','https://www.hihello.com/pricing'),('Uniqode – pricing','https://www.uniqode.com/pricing'),('Dot – Teams','https://dotcards.net/pages/teams'),('V1CE – pricing','https://v1ce.co/pricing'),('Popl – captura','https://support.popl.co/en/articles/8597920-the-lead-capture-form')]
for name,url in sources:
    p=d.add_paragraph(style='List Bullet'); add_hyperlink(p,name,url)
heading(d,'12. Recomendación final',1)
callout(d,'North Star','SmartNFC debe aspirar a ser la plataforma latinoamericana que convierte interacciones físicas en relaciones comerciales medibles y consentidas. Su ventaja no será tener más botones en una tarjeta, sino conectar mejor el mundo físico, el seguimiento y los sistemas del cliente.')
para(d,'Si solo se pueden financiar tres apuestas durante los próximos 90 días, deben ser: (1) API/webhooks e integraciones; (2) CRM accionable con automatización y atribución; (3) Wallet + gobierno de equipos. Para Local, mantener la oferta honesta como captación consentida hasta completar loyalty. Con esas piezas, SmartNFC puede superar a los competidores chilenos en producto y servicio local, y competir con referentes internacionales en el segmento pyme/mediana empresa sin intentar replicar todo HubSpot.')

# Keep tables together where reasonable, headings in TOC-friendly styles
props=d.core_properties; props.title='Inteligencia competitiva y estrategia de producto SmartNFC Chile 2026'; props.subject='Auditoría de pricing, benchmark y roadmap'; props.author='SmartNFC'; props.keywords='SmartNFC, NFC, pricing, CRM, API, competencia'
d.save(OUT)
print(OUT)
