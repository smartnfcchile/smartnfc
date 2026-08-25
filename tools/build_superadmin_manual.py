from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_CELL_VERTICAL_ALIGNMENT
from docx.enum.section import WD_SECTION
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.enum.style import WD_STYLE_TYPE
from pathlib import Path

OUT = Path("docs/Manual-Superadministrador-SmartNFC.docx")
OUT.parent.mkdir(parents=True, exist_ok=True)

BLUE = "2563EB"; NAVY = "0B1739"; INK = "172033"; MUTED = "64748B"
LIGHT = "E8EEF5"; PALE = "F4F7FB"; AMBER = "B45309"; RED = "B91C1C"; GREEN = "047857"

doc = Document()
sec = doc.sections[0]
sec.page_width, sec.page_height = Inches(8.5), Inches(11)
sec.top_margin = sec.bottom_margin = sec.left_margin = sec.right_margin = Inches(1)
sec.header_distance = sec.footer_distance = Inches(.492)

def font(run, size=11, bold=False, color=INK, italic=False):
    run.font.name = "Calibri"
    run._element.get_or_add_rPr().rFonts.set(qn("w:ascii"), "Calibri")
    run._element.get_or_add_rPr().rFonts.set(qn("w:hAnsi"), "Calibri")
    run.font.size = Pt(size); run.bold = bold; run.italic = italic
    run.font.color.rgb = RGBColor.from_string(color)
    return run

styles = doc.styles
normal = styles["Normal"]
normal.font.name = "Calibri"; normal.font.size = Pt(11); normal.font.color.rgb = RGBColor.from_string(INK)
normal.paragraph_format.space_after = Pt(6); normal.paragraph_format.line_spacing = 1.25
for name, size, color, before, after in [("Title",30,NAVY,0,8),("Subtitle",14,MUTED,0,12),("Heading 1",16,BLUE,18,10),("Heading 2",13,BLUE,14,7),("Heading 3",12,"1F4D78",10,5)]:
    st=styles[name]; st.font.name="Calibri"; st.font.size=Pt(size); st.font.bold=name!="Subtitle"; st.font.color.rgb=RGBColor.from_string(color)
    st.paragraph_format.space_before=Pt(before); st.paragraph_format.space_after=Pt(after); st.paragraph_format.keep_with_next=True
for name in ["List Bullet", "List Number"]:
    st=styles[name]; st.font.name="Calibri"; st.font.size=Pt(11); st.font.color.rgb=RGBColor.from_string(INK)
    st.paragraph_format.left_indent=Inches(.375); st.paragraph_format.first_line_indent=Inches(-.188)
    st.paragraph_format.space_after=Pt(4); st.paragraph_format.line_spacing=1.25

for style_name, fill, color in [("Nota", "EAF2FF", "1D4ED8"), ("Precaucion", "FFF7ED", AMBER), ("Limitacion", "FEF2F2", RED), ("Correcto", "ECFDF5", GREEN)]:
    st=styles.add_style(style_name, WD_STYLE_TYPE.PARAGRAPH)
    st.base_style=normal; st.font.name="Calibri"; st.font.size=Pt(10.5); st.font.color.rgb=RGBColor.from_string(color)
    st.paragraph_format.left_indent=Inches(.12); st.paragraph_format.right_indent=Inches(.12)
    st.paragraph_format.space_before=Pt(6); st.paragraph_format.space_after=Pt(8)
    st.paragraph_format.line_spacing=1.2
    shd=OxmlElement("w:shd"); shd.set(qn("w:fill"), fill); st.element.get_or_add_pPr().append(shd)

def set_cell(cell, text, bold=False, color=INK, fill=None):
    cell.text=""; p=cell.paragraphs[0]; p.paragraph_format.space_after=Pt(0); p.paragraph_format.line_spacing=1.1
    font(p.add_run(text), 9.5, bold, color)
    cell.vertical_alignment=WD_CELL_VERTICAL_ALIGNMENT.CENTER
    tcPr=cell._tc.get_or_add_tcPr(); mar=OxmlElement("w:tcMar")
    for side,val in [("top",100),("bottom",100),("start",120),("end",120)]:
        el=OxmlElement(f"w:{side}"); el.set(qn("w:w"),str(val)); el.set(qn("w:type"),"dxa"); mar.append(el)
    tcPr.append(mar)
    if fill:
        shd=OxmlElement("w:shd"); shd.set(qn("w:fill"),fill); tcPr.append(shd)

def table(headers, rows, widths=None):
    t=doc.add_table(rows=1, cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.LEFT; t.autofit=False
    for i,h in enumerate(headers): set_cell(t.rows[0].cells[i],h,True,NAVY,LIGHT)
    for row in rows:
        cells=t.add_row().cells
        for i,v in enumerate(row): set_cell(cells[i],str(v))
    if widths:
        for row in t.rows:
            for i,w in enumerate(widths): row.cells[i].width=Inches(w)
    t.rows[0]._tr.get_or_add_trPr().append(OxmlElement("w:tblHeader"))
    doc.add_paragraph().paragraph_format.space_after=Pt(0)
    return t

def p(text="", style=None, bold_prefix=None):
    par=doc.add_paragraph(style=style)
    if bold_prefix and text.startswith(bold_prefix):
        font(par.add_run(bold_prefix), bold=True); font(par.add_run(text[len(bold_prefix):]))
    else: font(par.add_run(text))
    return par

def bullets(items):
    for x in items: p(x, "List Bullet")
def steps(items):
    for x in items: p(x, "List Number")
def page(): doc.add_page_break()
def callout(label, text, style="Nota"):
    par=doc.add_paragraph(style=style); font(par.add_run(label+": "),10.5,True,styles[style].font.color.rgb.__str__()); font(par.add_run(text),10.5,False,styles[style].font.color.rgb.__str__())

# Header / footer
hp=sec.header.paragraphs[0]; hp.alignment=WD_ALIGN_PARAGRAPH.LEFT
font(hp.add_run("SMARTNFC  |  MANUAL DE SUPERADMINISTRACIÓN"),8.5,True,MUTED)
fp=sec.footer.paragraphs[0]; fp.alignment=WD_ALIGN_PARAGRAPH.CENTER
font(fp.add_run("Uso interno · SmartNFC Chile · Agosto 2026"),8.5,False,MUTED)

# Cover
doc.add_paragraph().paragraph_format.space_after=Pt(90)
k=doc.add_paragraph(); k.alignment=WD_ALIGN_PARAGRAPH.CENTER; font(k.add_run("SMARTNFC CHILE"),11,True,BLUE)
t=doc.add_paragraph(style="Title"); t.alignment=WD_ALIGN_PARAGRAPH.CENTER; font(t.add_run("Manual de Superadministración"),30,True,NAVY)
s=doc.add_paragraph(style="Subtitle"); s.alignment=WD_ALIGN_PARAGRAPH.CENTER; font(s.add_run("Guía práctica para administrar empresas, locales, usuarios, licencias, tarjetas NFC y producción"),14,False,MUTED)
doc.add_paragraph().paragraph_format.space_after=Pt(70)
table(["Documento", "Alcance", "Versión"], [["Manual operativo", "Panel /superadmin", "1.1 · 25-08-2026"]], [1.7,3.2,1.6])
callout("Objetivo", "Que una persona sin conocimiento técnico pueda operar el panel con seguridad y saber qué funciones están disponibles, cuáles requieren precaución y cuáles aún están incompletas.", "Correcto")
page()

doc.add_heading("Contenido", level=1)
for item in ["1. Qué controla el superadministrador","2. Resumen global","3. Empresas y organizaciones","4. Locales SmartNFC","5. Usuarios y accesos","6. Licencias y capacidad","7. Inventario de tarjetas NFC","8. Producción y códigos QR","9. Flujo recomendado: preparar una tarjeta para un cliente","10. Soporte y recuperación de acceso","11. Procedimientos delicados","12. Estado actual y funciones pendientes","13. Glosario y lista de verificación"]:
    p(item, "List Number")
callout("Lectura rápida", "Si necesitas entregar una tarjeta a un cliente, comienza por la sección 9. Si vas a suspender una empresa o cambiar roles, revisa primero la sección 11.", "Nota")

doc.add_heading("1. Qué controla el superadministrador", level=1)
p("El panel de superadministración es la consola global de SmartNFC. Permite administrar a todas las organizaciones, sus responsables, sus productos contratados y la operación física de las tarjetas.")
table(["Concepto", "Qué representa"], [
    ["Empresa", "Organización cliente aislada dentro de SmartNFC."],
    ["Local", "Negocio que utiliza campañas, clubes y puntos QR/NFC de SmartNFC Local."],
    ["Usuario", "Persona que inicia sesión y opera una cuenta."],
    ["Identidad digital", "Perfil B2B público accesible mediante /c/slug."],
    ["Tarjeta física", "Chip registrado con una URL permanente /t/token."],
    ["Licencia", "Producto contratado, estado, fechas y capacidad autorizada."],
], [1.7,4.8])
callout("Regla principal", "No confundas la tarjeta física con el perfil digital. La tarjeta física es el soporte; el perfil es el contenido que el cliente puede editar.", "Precaucion")

page(); doc.add_heading("2. Resumen global", level=1)
p("Ruta: /superadmin")
p("Esta pantalla sirve para conocer el estado general de la plataforma. Sus indicadores se calculan directamente desde la base de datos.")
bullets(["Empresas totales, activas y suspendidas.","Usuarios totales y administradores de empresa.","Identidades digitales activas.","Contactos capturados y escaneos registrados.","Empresas creadas durante los últimos 30 días.","Empresas recientes y actividad de auditoría."])
callout("Uso recomendado", "Revísala al comenzar una jornada de soporte. Un cambio inesperado en suspendidos, identidades o actividad reciente puede revelar una configuración accidental.", "Nota")
callout("Importante", "La actividad reciente utiliza nombres técnicos de acciones. Sirve como respaldo de auditoría, no como historial comercial detallado.", "Precaucion")

page(); doc.add_heading("3. Empresas y organizaciones", level=1)
p("Ruta: /superadmin/empresas")
doc.add_heading("3.1 Crear una empresa", level=2)
steps(["Selecciona Empresas y luego Registrar nueva empresa.","Escribe el nombre comercial.","Define un slug único, en minúsculas, sin espacios ni caracteres especiales.","Selecciona SmartNFC Empresas, SmartNFC Local o ambos.","Configura plan, capacidad, estado y fechas.","Opcionalmente crea al administrador principal e ingresa su correo.","Revisa los datos y confirma la creación."])
callout("Slug", "Es una dirección permanente. Evita RUT, datos sensibles, tildes y nombres provisionales. Ejemplo: estudio-lagos.", "Precaucion")
doc.add_heading("3.2 Planes de Empresas", level=2)
table(["Plan", "Identidades incluidas inicialmente"], [["Conecta","5"],["Crece","15"],["Escala","30"],["Corporativo","100"]], [3.2,3.3])
p("La capacidad puede complementarse con identidades extra autorizadas. La plataforma también permite establecer fecha de inicio y vencimiento.")
doc.add_heading("3.3 Editar una empresa", level=2)
bullets(["Cambiar nombre, slug y notas internas.","Activar o suspender la organización.","Ajustar capacidad y estado contractual.","Revisar usuarios e identidades asociadas.","Reenviar invitaciones pendientes cuando corresponda."])
callout("Riesgo", "Cambiar un slug puede invalidar enlaces impresos o compartidos. Suspender la empresa puede bloquear perfiles, chips y acceso a productos. Hazlo solo con confirmación del responsable.", "Limitacion")

page(); doc.add_heading("4. Locales SmartNFC", level=1)
p("Ruta: /superadmin/locales")
p("Este módulo concentra negocios que usan SmartNFC Local. Muestra estado, plan, número de campañas, administrador principal y fecha de registro.")
doc.add_heading("4.1 Registrar un local", level=2)
steps(["Selecciona Locales y luego Registrar local.","Completa nombre, slug, categoría, teléfono y dirección.","Añade notas internas si existe información comercial o de implementación.","Selecciona el plan Local y su estado.","Define límites de campañas, sucursales y puntos QR/NFC cuando el plan sea personalizado.","Configura fechas de inicio y vencimiento.","Crea al administrador principal si ya cuentas con su nombre y correo."])
table(["Plan Local", "Capacidad inicial"], [["Impulsa","1 campaña · 1 sucursal · 3 puntos QR/NFC"],["Cliente fundador","1 campaña · 1 sucursal · 3 puntos QR/NFC"],["Personalizado","Límites configurables"]], [2.1,4.4])
callout("Cliente fundador", "El formulario muestra un contador recomendado de cinco licencias activas. La advertencia no necesariamente impide crear una adicional; verifica el acuerdo comercial.", "Precaucion")

page(); doc.add_heading("5. Usuarios y accesos", level=1)
p("Ruta: /superadmin/usuarios")
p("Desde aquí puedes buscar usuarios, crear administradores, modificar roles, mover una cuenta entre empresas, habilitar o deshabilitar el inicio de sesión y reenviar invitaciones.")
table(["Rol", "Uso esperado"], [
    ["COLLABORATOR", "Miembro o vendedor que administra su identidad asignada."],
    ["COMPANY_ADMIN", "Administra usuarios y recursos de una empresa."],
    ["COMPANY_OWNER", "Responsable principal o propietario de la organización."],
    ["SUPERADMIN", "Acceso global. Debe reservarse para operadores de confianza."],
], [2.0,4.5])
doc.add_heading("5.1 Crear un administrador", level=2)
steps(["Selecciona Nuevo administrador.","Ingresa nombre y correo real.","Selecciona la empresa correcta.","Asigna COMPANY_ADMIN o COMPANY_OWNER según corresponda.","Confirma y verifica si la invitación fue enviada."])
callout("Correo", "Si la empresa se crea pero el correo falla, los datos pueden quedar guardados. No repitas la empresa: revisa Usuarios y utiliza Reenviar invitación.", "Precaucion")
doc.add_heading("5.2 Cambiar acceso", level=2)
bullets(["Desactivar acceso impide iniciar sesión, pero no elimina los datos.","Cambiar de empresa modifica el ámbito de acceso del usuario.","Elevar a SUPERADMIN entrega control global y requiere confirmación explícita."])

page(); doc.add_heading("6. Licencias y capacidad", level=1)
p("Ruta: /superadmin/licencias")
p("Esta vista sirve para detectar organizaciones próximas a su límite o que ya tienen sobreuso de identidades.")
table(["Alerta", "Interpretación", "Acción"], [
    ["Dentro del límite","Uso inferior a la capacidad.","Sin acción inmediata."],
    ["Cerca del límite","Queda una identidad o se alcanzó el máximo.","Contactar o ampliar capacidad."],
    ["Sobre el límite","Hay más identidades que capacidad.","Revisar contrato y ajustar licencia."],
    ["Suspendida","La empresa está inactiva.","Confirmar motivo antes de reactivar."],
], [1.4,2.6,2.5])
callout("Diferencia", "La pantalla global de Licencias resume capacidad de identidades. La configuración detallada de productos y fechas se administra desde la ficha de cada empresa.", "Nota")

page(); doc.add_heading("7. Inventario de tarjetas NFC", level=1)
p("Ruta: /superadmin/tarjetas")
p("Este inventario registra unidades físicas. NFC Tools no se conecta con SmartNFC: solo escribe en el chip la URL que tú le entregas.")
doc.add_heading("7.1 Registrar una tarjeta", level=2)
steps(["Selecciona Registrar nueva tarjeta.","Elige la empresa propietaria.","Deja el token vacío para que SmartNFC genere uno seguro, salvo que tengas un token previamente definido.","Selecciona el estado inicial y, si corresponde, un código de lote.","Registra la tarjeta y copia su URL /t/token.","Abre NFC Tools, escribe esa URL en el chip, guarda y prueba con otro teléfono."])
table(["Estado", "Uso sugerido"], [["PENDIENTE_GRABACION","Registrada, aún no escrita con NFC Tools."],["GRABADA","URL escrita y comprobada."],["ENVIADA","Despachada al cliente."],["ENTREGADA","Recibida; el primer uso puede activarla."],["ACTIVA","Operativa."],["SUSPENDIDA","Bloqueada por pérdida, robo o decisión administrativa."]], [2.1,4.4])
doc.add_heading("7.2 Destinos", level=2)
bullets(["Libre: pertenece a una empresa, pero no apunta a ningún perfil o punto Local.","B2B: redirige a una identidad digital /c/slug.","Smart Local: redirige a una campaña mediante un punto de contacto."])
callout("No grabes el slug", "La práctica recomendada es grabar /t/token, no /c/slug. Así puedes cambiar el destino sin volver a escribir el chip.", "Correcto")
callout("Vinculación B2B", "Puedes seleccionar el perfil al registrar la tarjeta o vincular posteriormente una unidad libre. El sistema impide cruces entre empresas y dobles asignaciones.", "Correcto")

page(); doc.add_heading("8. Producción y códigos QR", level=1)
p("Ruta: /superadmin/produccion")
p("Producción reúne las identidades digitales creadas y los recursos necesarios para fabricar o revisar una tarjeta física.")
bullets(["Buscar por tarjeta, usuario, correo, slug o empresa.","Abrir el perfil público.","Descargar el QR en PNG.","Descargar el QR en SVG editable.","Revisar diseños físicos creados por el usuario.","Descargar PDF de impresión y SVG de anverso o reverso cuando existen diseños."])
callout("Dos tipos de QR", "El QR general de Producción apunta a /c/slug. En Tarjetas NFC puedes descargar el QR de la unidad física, que apunta a /t/token y coincide con la dirección grabada en el chip.", "Nota")
doc.add_heading("8.1 Comprobación antes de imprimir", level=2)
steps(["Abre el perfil público y verifica que cargue.","Escanea el QR desde un teléfono distinto al computador.","Comprueba nombre, empresa y destino.","Verifica tamaño y contraste del QR.","Guarda el archivo de producción con una identificación clara del cliente."])

page(); doc.add_heading("9. Flujo recomendado: preparar una tarjeta para un cliente", level=1)
p("Este es el procedimiento deseado para un cliente que recibirá una tarjeta ya operativa y completará su perfil después.")
steps(["Crear o revisar la empresa y activar SmartNFC Empresas.","Crear al usuario con su correo real y enviar la invitación.","Crear una identidad digital vacía o básica con el slug definitivo.","Registrar la tarjeta física para esa empresa.","Vincular la tarjeta física a la identidad B2B.","Copiar /t/token y grabarlo con NFC Tools.","Generar el QR de la misma unidad física.","Probar NFC y QR en modo incógnito o desde otro teléfono.","Marcar la tarjeta como GRABADA, ENVIADA o ENTREGADA según avance.","Enviar la tarjeta y pedir al cliente que active su cuenta y complete su perfil."])
callout("Operativo", "La vinculación B2B y la descarga del QR basado en el token ya están disponibles desde Tarjetas NFC. Aun así, no marques una unidad como lista sin probar manualmente NFC y QR.", "Correcto")
doc.add_heading("9.1 Prueba mínima de entrega", level=2)
bullets(["El chip abre smartnfc.cl/t/token.","El sistema redirige al perfil correcto.","El QR abre el mismo destino esperado.","La empresa y la licencia están activas.","El usuario recibió su invitación.","El slug es definitivo y no contiene errores."])

page(); doc.add_heading("10. Soporte y recuperación de acceso", level=1)
doc.add_heading("10.1 El cliente no recibió la invitación", level=2)
steps(["Busca el usuario por correo.","Confirma que esté asignado a la empresa correcta.","Utiliza Reenviar invitación.","Pide revisar spam y promociones.","Si vuelve a fallar, registra el mensaje mostrado y revisa la configuración de correo."])
doc.add_heading("10.2 El cliente no puede iniciar sesión", level=2)
bullets(["Confirma que el usuario esté habilitado.","Confirma que la empresa esté activa.","Revisa que el correo coincida exactamente.","Utiliza el flujo de recuperación de contraseña.","No crees un usuario duplicado sin verificar primero."])
doc.add_heading("10.3 La tarjeta no abre el perfil", level=2)
steps(["Comprueba qué URL contiene el chip mediante NFC Tools.","Si usa /t/token, busca el token en Tarjetas NFC.","Verifica estado ACTIVA o ENTREGADA.","Confirma que tenga destino y que la empresa tenga licencia activa.","Prueba la URL directamente en el navegador.","Si abre otro perfil, no vuelvas a grabar de inmediato: revisa primero la vinculación."])

page(); doc.add_heading("11. Procedimientos delicados", level=1)
table(["Acción", "Consecuencia", "Antes de confirmar"], [
    ["Suspender empresa","Puede bloquear productos y destinos.","Validar contrato y motivo."],
    ["Cambiar slug","Puede romper enlaces impresos.","Confirmar alcance y actualizar materiales."],
    ["Mover usuario","Cambia los datos que puede administrar.","Verificar empresa y rol."],
    ["Asignar SUPERADMIN","Entrega control global.","Aprobación expresa y cuenta segura."],
    ["Desvincular tarjeta","El chip queda sin destino.","Registrar destino anterior y motivo."],
    ["Reasignar tarjeta","Cambia su empresa propietaria.","Debe estar libre y confirmada físicamente."],
], [1.6,2.5,2.4])
callout("Regla de soporte", "Ante una duda, deshabilitar temporalmente es preferible a borrar o duplicar. El sistema conserva trazabilidad y permite corregir la configuración.", "Correcto")

page(); doc.add_heading("12. Estado actual y funciones pendientes", level=1)
table(["Área", "Estado actual"], [
    ["Resumen global","Operativo."],
    ["Empresas y productos","Operativo; cambiar slug requiere precaución."],
    ["Locales y licencias Local","Operativo."],
    ["Usuarios e invitaciones","Operativo; el envío depende del servicio de correo."],
    ["Capacidad de identidades","Operativo como vista de control."],
    ["Registro de tarjetas físicas","Operativo."],
    ["Vinculación a Smart Local","Operativa desde el panel Local de la empresa."],
    ["Vinculación física a B2B","Operativa desde el registro o desde una tarjeta libre."],
    ["QR de Producción","Operativo; apunta a /c/slug."],
    ["QR de tarjeta física","Operativo en PNG y SVG; apunta a /t/token."],
    ["Actualización instantánea de inventario","Operativa después de registrar, vincular, desvincular o reasignar."],
], [2.7,3.8])
doc.add_heading("Mejoras prioritarias", level=2)
steps(["Añadir una vista guiada Preparar tarjeta para cliente que reúna todos los pasos en una sola pantalla.","Permitir registrar pruebas de NFC y QR antes del despacho.","Añadir cambios administrativos de estado de hardware desde el inventario.","Incorporar una comprobación de entrega con NFC, QR, destino y licencia.","Actualizar este manual después de cada cambio funcional importante."])

page(); doc.add_heading("13. Glosario y lista de verificación", level=1)
table(["Término", "Significado"], [["Slug","Texto legible que identifica un perfil o campaña en la URL."],["Token","Código opaco y único que identifica una tarjeta física."],["B2B","Producto de identidades digitales para empresas."],["Smart Local","Producto de campañas, clubes y puntos de contacto."],["Touchpoint","Punto físico o lógico asociado a un QR/NFC Local."],["NFC Tools","Aplicación externa utilizada para escribir o leer chips NFC."],["QR PNG","Imagen lista para uso común."],["QR SVG","Archivo vectorial editable para imprenta o diseño."]], [1.8,4.7])
doc.add_heading("Checklist de alta de cliente", level=2)
bullets(["Empresa creada y nombre verificado.","Producto y plan correctos.","Licencia activa y fechas revisadas.","Usuario asignado a la empresa correcta.","Invitación enviada.","Identidad digital creada con slug definitivo.","Tarjeta física registrada y vinculada.","NFC grabado y probado.","QR probado.","Estado actualizado antes del despacho."])
callout("Mantenimiento", "Este manual describe la plataforma observada el 25 de agosto de 2026. Debe revisarse cuando cambien rutas, planes, permisos, estados o flujos de tarjetas físicas.", "Nota")

# Keep table rows together and set borders / exact widths broadly.
for t in doc.tables:
    tPr=t._tbl.tblPr
    tblW=tPr.first_child_found_in("w:tblW")
    if tblW is None: tblW=OxmlElement("w:tblW"); tPr.append(tblW)
    tblW.set(qn("w:w"),"9360"); tblW.set(qn("w:type"),"dxa")
    ind=OxmlElement("w:tblInd"); ind.set(qn("w:w"),"120"); ind.set(qn("w:type"),"dxa"); tPr.append(ind)
    borders=OxmlElement("w:tblBorders")
    for edge in ["top","left","bottom","right","insideH","insideV"]:
        el=OxmlElement(f"w:{edge}"); el.set(qn("w:val"),"single"); el.set(qn("w:sz"),"4"); el.set(qn("w:color"),"CBD5E1"); borders.append(el)
    tPr.append(borders)

doc.core_properties.title="Manual de Superadministración SmartNFC"
doc.core_properties.subject="Guía operativa del panel de superadministración"
doc.core_properties.author="SmartNFC Chile"
doc.core_properties.keywords="SmartNFC, superadministración, NFC, empresas, licencias, usuarios"
doc.save(OUT)
print(OUT.resolve())
