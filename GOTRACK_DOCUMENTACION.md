# GoTrack — Documentación Completa del Proyecto

**Empresa:** Global Go (créditos vehiculares — motos y trimotos, Perú)  
**Responsable:** Juan Barrientos — Jefe de Legal  
**App en producción:** https://gotrack-go.vercel.app  
**Fecha de creación:** Mayo 2026

---

## 1. ¿Qué es GoTrack?

GoTrack es una PWA (Progressive Web App) interna para seguimiento de contratos de firma electrónica. Reemplaza el envío manual de Excel por WhatsApp entre las áreas de Legal, Comercial, Tesorería y Dealers.

**Fase 1 (actual):** Solo lectura. Legal sube datos desde su Excel a Google Sheets, y la app los muestra en tiempo real a todos los equipos.

**Fase 2 (pendiente):** Integración con SIS360, controles anti-fraude, validación GPS, actualizaciones bidireccionales.

---

## 2. Stack tecnológico

| Componente | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Estilos | Tailwind CSS |
| Parseo CSV | PapaParse |
| Hosting | Vercel (plan gratuito) |
| Fuente de datos | Google Sheets publicado como CSV |
| Tipo de app | PWA (instalable en celular y PC) |

---

## 3. Estructura de archivos

```
global-hub/
├── app/
│   ├── layout.js          # Layout global, PWA meta tags
│   ├── page.js            # Dashboard principal
│   ├── globals.css        # Estilos globales Tailwind
│   └── api/
│       └── contracts/
│           └── route.js   # API route (proxy CSV — actualmente no se usa)
├── components/
│   ├── MetaCard.jsx       # Tarjeta de meta mensual con barra de progreso
│   ├── StatsBar.jsx       # 4 recuadros: Pendientes, Observados, Vencidos, Validados
│   ├── RegionFilter.jsx   # Filtro por región y ciudad (2 niveles)
│   ├── ContractList.jsx   # Lista de contratos con filtro por estado
│   └── ContractCard.jsx   # Tarjeta individual de cada contrato
├── lib/
│   ├── parseSheets.js     # Parser del CSV de Google Sheets
│   ├── utils.js           # Estados, colores, derivarEstado(), hoyISO()
│   └── regions.js         # Mapa de regiones y ciudades del Perú
├── public/
│   ├── manifest.json      # Configuración PWA
│   ├── favicon.ico        # Ícono del navegador
│   ├── icon-192.png       # Ícono PWA 192x192
│   └── icon-512.png       # Ícono PWA 512x512
├── .env.local             # Variables de entorno locales (NO subir a GitHub)
├── vercel.json            # Configuración Vercel + alias automático
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

---

## 4. Estructura del Google Sheet

El Google Sheet debe tener exactamente esta estructura:

| Fila | Contenido |
|---|---|
| Fila 1 | Celdas vacías hasta columna F → `META MAYO` en F1, valor numérico en G1 (ej: `1850`) |
| Fila 2 | Encabezados de columnas |
| Fila 3+ | Datos de contratos |

### Encabezados requeridos (Fila 2):
```
RESPONSABLE | EXPEDIENTE | Nº | ID | CLIENTE | DOI | CIUDAD | DISTRIBUIDOR |
MONTO TOTAL FINANCIADO | FECHA DE INGRESO | FECHA DE ENVÍO | FECHA DE VENCIMIENTO |
CONTRATO ENVIADO | CONTRATO FIRMADO CONFORME | CONTRATO RESUBIDO |
CONTRATO FIRMA FÍSICA | PAGARÉ FÍSICO | OBSERVACIONES: EMISIÓN DE CONTRATO | ADENDA
```

### Columna clave — CONTRATO FIRMADO CONFORME:
| Valor | Estado en app |
|---|---|
| (vacío o NO) | PENDIENTE |
| SI | VALIDADO |
| OBSERVADO | OBSERVADO |
| VENCIDO | VENCIDO |
| Fecha de vencimiento pasada | VENCIDO (automático) |

### URL del Google Sheet conectado:
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vSIW144L8rdHttoUM8CRuOYcRk0Dw2MnnayNLCFekgarCZRfe-Juvd2nG_gzm20IJYWp4iWwb-_4Zck/pub?gid=692298348&single=true&output=csv
```

### Cómo publicar el Google Sheet como CSV:
1. Abrir el Google Sheet
2. `Archivo` → `Compartir` → `Publicar en la web`
3. Seleccionar la hoja correcta
4. Formato: **Valores separados por comas (.csv)**
5. Clic en **Publicar**
6. Copiar la URL generada

---

## 5. Variables de entorno

Archivo `.env.local` (en la raíz del proyecto, nunca subir a GitHub):
```
SHEETS_CSV_URL=https://docs.google.com/spreadsheets/d/e/[ID]/pub?gid=[GID]&single=true&output=csv
```

> **Nota:** Actualmente la app carga el CSV directamente desde el navegador (client-side), por lo que esta variable no está siendo usada activamente. Está disponible para la Fase 2.

---

## 6. Regiones configuradas

```
LIMA METROPOLITANA: Lima, Callao
NORTE: Piura, Trujillo, Chiclayo, Tumbes, Sullana, Talara, Paita, Chimbote, Huaraz, Cajamarca
SUR: Arequipa, Cusco, Puno, Tacna, Moquegua, Ica, Nazca
ORIENTE: Iquitos, Tarapoto, Pucallpa, Moyobamba, Yurimaguas, Tingo María, Juanjuí
CENTRO: Huancayo, Ayacucho, Huánuco, Cerro de Pasco, Abancay, Andahuaylayla
```

Para agregar nuevas ciudades: editar `lib/regions.js`.

---

## 7. Cómo hacer un deploy

### Requisito previo: tener Node.js instalado
Descargar desde: https://nodejs.org (versión LTS)

### Comando de deploy (desde cmd de Windows):
```cmd
D:
cd D:\JBARRIENTOS\Documents\Claude\Projects\GLOBAL HUB\global-hub
npx vercel --token=TU_TOKEN_VERCEL --prod
```

El alias `gotrack-go.vercel.app` se actualiza automáticamente (configurado en `vercel.json`).

### Cuenta Vercel:
- Dashboard: https://vercel.com/juan-barrientos-s-projects
- Proyecto: `global-hub`
- Token: (generar en vercel.com/account/tokens)

---

## 8. Instrucciones para recrear desde cero

Si se pierde el código o hay que montar el proyecto en otro equipo:

### Paso 1 — Instalar Node.js
Descargar e instalar desde https://nodejs.org (versión LTS)

### Paso 2 — Crear el proyecto Next.js
```cmd
npx create-next-app@14.2.3 global-hub --tailwind --no-typescript --no-eslint --no-src-dir --app --no-import-alias
cd global-hub
npm install papaparse
```

### Paso 3 — Crear todos los archivos del proyecto
Recrear la estructura de archivos descrita en la sección 3, con el contenido documentado en la sección 9 de este archivo.

### Paso 4 — Configurar Google Sheets
1. Crear el Google Sheet con la estructura de la sección 4
2. Publicarlo como CSV
3. Pegar la URL en `.env.local` y en `app/page.js` (constante `SHEET_URL`)

### Paso 5 — Deploy en Vercel
```cmd
npx vercel --token=[TOKEN] --prod
```

### Paso 6 — Configurar alias
Crear `vercel.json`:
```json
{ "alias": ["gotrack-go.vercel.app"] }
```
Y hacer deploy nuevamente.

---

## 9. Código fuente de archivos clave

### app/page.js (Dashboard principal)
El archivo carga el CSV directamente desde el navegador usando fetch + PapaParse, aplica filtros y renderiza todos los componentes. La lógica central:
- `cargarDatos()`: fetch a SHEET_URL → Papa.parse → parsearSheet → derivarEstado → setContratos
- Filtros: por región/ciudad, por fecha de envío, por estado
- `contratosFiltrados`: contratos filtrados según selección activa

### lib/parseSheets.js
- Busca "META" en fila 1 para extraer meta mensual
- Toma encabezados de fila 2
- Incluye solo filas que tengan CLIENTE, ID o Nº

### lib/utils.js
- `derivarEstado(contrato)`: lee columna "CONTRATO FIRMADO CONFORME" → retorna PENDIENTE/VALIDADO/OBSERVADO/VENCIDO
- `hoyISO()`: fecha de hoy en formato YYYY-MM-DD para el input de fecha

### lib/regions.js
- Objeto REGIONES con las 5 regiones y sus ciudades
- `getRegionDeCiudad(ciudad)`: retorna la región de una ciudad

---

## 10. Problemas conocidos y soluciones

| Problema | Causa | Solución |
|---|---|---|
| App muestra 0 contratos | La URL del alias apuntaba a deployment viejo | Ejecutar `npx vercel alias [URL-PRODUCCION] gotrack-go.vercel.app` o usar `vercel.json` |
| Celular redirige a Vercel login | Deployment Protection activado en Vercel | Settings → Deployment Protection → Desactivar |
| CSV carga lento o datos viejos | Caché de Google Sheets | Esperar y presionar 🔄 en la app |
| manifest.json 404 | Faltaba el archivo en /public | Crear `public/manifest.json` con configuración PWA |
| API route devuelve HTML | Next.js caché de deployment | Usar `export const dynamic = 'force-dynamic'` |

---

## 11. Roadmap — Fase 2

- [ ] Integración con SIS360 (sistema interno de Go)
- [ ] Autenticación biométrica (Face ID / WebAuthn)
- [ ] Control anti-fraude para actualización de número de cliente por Comercial
- [ ] Validación GPS de ubicación del cliente al firmar
- [ ] Módulo de Dealers
- [ ] Notificaciones de vencimiento
- [ ] Plazos críticos (1 hora para firma en provincia)
- [ ] Registro de reenvíos de link de firma
- [ ] Integración con Dropbox para contratos firmados
- [ ] Actualización bidireccional Sheet ↔ SIS360

---

## 12. Proceso de negocio (resumen)

1. **Legal** envía contrato por Firmalo al cliente (link por WhatsApp/SMS)
2. **Cliente** tiene 4 días para firmar (en Lima y provincia)
3. Si el cliente firmó fuera de domicilio → estado **OBSERVADO** → Comercial gestiona reenvío con número actualizado
4. **Legal valida** la firma conforme → pone "SI" en columna N del Excel → estado **VALIDADO**
5. **Legal pide desembolso** a Tesorería
6. **Provincia:** Legal registra garantía en SUNARP → pide entregar moto al Dealer
7. **Lima:** Coordinación interna para entrega

---

*Documento generado el 24/05/2026 — GoTrack v1.0 Fase 1*
