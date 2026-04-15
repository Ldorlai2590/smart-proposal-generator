import { eq, desc } from 'drizzle-orm'

const DEMO_MODE = process.env.DEMO_MODE === 'true'

// ─── Section content templates ─────────────────────────────────
function makeSections(cfg: {
  resumenEjecutivo: string
  problema: string
  serviciosPropuestos: string
  alcancePorServicio: string
  timeline: string
  inversion: string
  proximosPasos: string
}): Record<string, string> {
  return cfg
}

// ─── Demo mock data (in-memory) ──────────────────────────────
export const DEMO_PROPOSALS: Array<{
  id: string; title: string; status: string; client_id: string;
  created_at: string; updated_at: string; context: Record<string, unknown>;
  sections: Record<string, string>;
}> = [
  {
    id: 'demo-prop-1', title: 'Propuesta Paid Media + Landing Page',
    status: 'accepted', client_id: 'TechFlow Solutions',
    created_at: '2026-04-13T14:00:00Z', updated_at: '2026-04-13T16:00:00Z',
    context: { budget: 3500, problema: 'Necesitan aumentar leads calificados', services: ['Paid Media', 'Landing Page'], tono: 'consultivo' },
    sections: makeSections({
      resumenEjecutivo: '<p>TechFlow Solutions busca posicionarse como referente en soluciones SaaS para pymes en Chile. Proponemos una estrategia integral de <strong>Paid Media</strong> y <strong>Landing Pages</strong> optimizadas para triplicar la generación de leads calificados en 90 días, con un enfoque data-driven y medición continua de ROI.</p>',
      problema: '<p>Actualmente, TechFlow enfrenta los siguientes desafíos:</p><ul><li>Costo por adquisición de cliente (CAC) superior a $120 USD, un 40% por encima del benchmark</li><li>Landing pages con tasa de conversión del 1.2%, frente al 3.5% promedio de la industria</li><li>Dependencia de referidos como canal principal, lo que limita la escalabilidad</li><li>Falta de trazabilidad end-to-end en el funnel de ventas</li></ul>',
      serviciosPropuestos: '<p>Nuestra propuesta contempla dos servicios integrados:</p><p><strong>1. Paid Media (Google Ads + Meta Ads)</strong></p><p>Gestión completa de campañas en Google Search, Display y Meta (Facebook/Instagram) con optimización semanal de presupuesto y audiencias.</p><p><strong>2. Landing Pages de Alta Conversión</strong></p><p>Diseño y desarrollo de 3 landing pages específicas por segmento de audiencia, con A/B testing continuo y formularios inteligentes integrados al CRM.</p>',
      alcancePorServicio: '<p><strong>Paid Media:</strong></p><ul><li>Auditoría de cuentas existentes</li><li>Definición de audiencias y segmentos</li><li>Creación de 15 variantes de anuncios por plataforma</li><li>Optimización semanal de bids y presupuesto</li><li>Reportería quincenal con dashboards en tiempo real</li></ul><p><strong>Landing Pages:</strong></p><ul><li>3 landing pages responsive (una por segmento)</li><li>Integración con HubSpot CRM</li><li>Setup de heatmaps y grabaciones de sesión</li><li>A/B testing de headlines y CTAs</li></ul>',
      timeline: '<p><strong>Mes 1:</strong> Auditoría, setup de tracking, diseño de landing pages</p><p><strong>Mes 2:</strong> Lanzamiento de campañas y landing pages, primeras optimizaciones</p><p><strong>Mes 3:</strong> Escalamiento de presupuesto en canales ganadores, A/B testing avanzado</p>',
      inversion: '<table><tr><th>Servicio</th><th>Setup</th><th>Mensual</th></tr><tr><td>Paid Media</td><td>$500 USD</td><td>$1,500 USD</td></tr><tr><td>Landing Pages</td><td>$2,000 USD</td><td>—</td></tr><tr><td><strong>Total</strong></td><td><strong>$2,500 USD</strong></td><td><strong>$1,500 USD</strong></td></tr></table><p>*No incluye presupuesto de medios (ad spend).</p>',
      proximosPasos: '<ol><li>Agendar reunión de kick-off para la semana del 21 de abril</li><li>Firmar contrato de servicios y NDA</li><li>Enviar accesos a cuentas publicitarias y CRM</li><li>Iniciar auditoría técnica (3 días hábiles)</li></ol>',
    }),
  },
  {
    id: 'demo-prop-2', title: 'Propuesta SEO + Content Marketing',
    status: 'sent', client_id: 'Retail Plus Chile',
    created_at: '2026-04-12T10:00:00Z', updated_at: '2026-04-12T11:00:00Z',
    context: { budget: 2800, problema: 'Bajo posicionamiento orgánico', services: ['SEO', 'Content Marketing'], tono: 'formal' },
    sections: makeSections({
      resumenEjecutivo: '<p>Retail Plus Chile opera 23 tiendas físicas pero su presencia digital orgánica es mínima. Proponemos un plan integral de <strong>SEO técnico</strong> y <strong>Content Marketing</strong> para posicionar las 50 categorías principales de producto en los primeros 10 resultados de Google en 6 meses.</p>',
      problema: '<p>Retail Plus Chile enfrenta una brecha significativa entre su fortaleza offline y su visibilidad online:</p><ul><li>Solo 3 de 50 categorías aparecen en la primera página de Google</li><li>El 85% del tráfico web proviene de búsquedas de marca (branded)</li><li>El blog corporativo lleva 8 meses sin publicaciones</li><li>Velocidad de carga del sitio: 6.2 segundos (benchmark: 2.5s)</li></ul>',
      serviciosPropuestos: '<p><strong>1. SEO Técnico y On-Page</strong></p><p>Optimización de la infraestructura del sitio, incluyendo velocidad de carga, arquitectura de URLs, schema markup para productos y corrección de errores de indexación.</p><p><strong>2. Content Marketing</strong></p><p>Estrategia editorial con publicación de 12 artículos mensuales optimizados para búsquedas transaccionales e informacionales.</p>',
      alcancePorServicio: '<p><strong>SEO Técnico:</strong></p><ul><li>Auditoría técnica completa (Core Web Vitals, indexación)</li><li>Optimización de 50 páginas de categoría</li><li>Schema markup (Product, FAQ, BreadcrumbList)</li><li>Optimización de velocidad de carga</li></ul><p><strong>Content Marketing:</strong></p><ul><li>Calendario editorial mensual</li><li>12 artículos SEO-optimizados por mes</li><li>4 guías de compra por trimestre</li></ul>',
      timeline: '<p><strong>Mes 1:</strong> Auditoría SEO, keyword research, calendario editorial</p><p><strong>Mes 2-3:</strong> Correcciones técnicas, inicio de contenido</p><p><strong>Mes 4-6:</strong> Escalamiento de contenido, link building, resultados medibles</p>',
      inversion: '<table><tr><th>Servicio</th><th>Setup</th><th>Mensual</th></tr><tr><td>SEO Técnico</td><td>$800 USD</td><td>$1,200 USD</td></tr><tr><td>Content Marketing</td><td>$500 USD</td><td>$1,500 USD</td></tr><tr><td><strong>Total</strong></td><td><strong>$1,300 USD</strong></td><td><strong>$2,700 USD</strong></td></tr></table>',
      proximosPasos: '<ol><li>Confirmación del alcance y firma de contrato</li><li>Entrega de accesos a Google Search Console y Analytics</li><li>Reunión de kick-off con el equipo de marketing</li><li>Entrega de auditoría técnica en 5 días hábiles</li></ol>',
    }),
  },
  {
    id: 'demo-prop-3', title: 'Estrategia Digital Integral',
    status: 'accepted', client_id: 'Grupo Andino SpA',
    created_at: '2026-04-11T09:00:00Z', updated_at: '2026-04-11T15:00:00Z',
    context: { budget: 4200, problema: 'Rediseño de presencia digital', services: ['Branding', 'Web Design', 'SEO'], tono: 'profesional' },
    sections: makeSections({
      resumenEjecutivo: '<p>Grupo Andino SpA necesita una transformación digital completa que alinee su presencia online con su posicionamiento de marca premium. Proponemos una estrategia integral de <strong>Branding</strong>, <strong>Diseño Web</strong> y <strong>SEO</strong> para construir una identidad digital coherente y generar tráfico orgánico calificado.</p>',
      problema: '<p>Los principales desafíos identificados:</p><ul><li>Identidad visual inconsistente entre canales digitales y offline</li><li>Sitio web con diseño de 2021, no responsive y con 72% de bounce rate en móviles</li><li>Sin estrategia SEO: cero posicionamiento en búsquedas clave del sector</li><li>Competidores han invertido fuertemente en marca digital</li></ul>',
      serviciosPropuestos: '<p><strong>1. Branding Corporativo</strong></p><p>Rediseño de identidad visual con manual de marca, sistema iconográfico y templates.</p><p><strong>2. Diseño Web</strong></p><p>Sitio web moderno con portafolio interactivo y sistema de cotización online.</p><p><strong>3. SEO</strong></p><p>Optimización técnica y de contenido para posicionamiento orgánico en búsquedas clave.</p>',
      alcancePorServicio: '<p><strong>Branding:</strong></p><ul><li>Workshop de descubrimiento de marca</li><li>3 propuestas de concepto visual</li><li>Manual de marca (60+ páginas)</li><li>Templates para documentos corporativos</li></ul><p><strong>Web Design:</strong></p><ul><li>Diseño UX/UI de 10 páginas</li><li>Desarrollo responsive</li><li>CMS para gestión autónoma</li></ul><p><strong>SEO:</strong></p><ul><li>Keyword research (150+ términos)</li><li>Optimización on-page</li><li>Schema markup</li></ul>',
      timeline: '<p><strong>Semanas 1-3:</strong> Discovery y branding</p><p><strong>Semanas 4-7:</strong> Diseño y desarrollo web</p><p><strong>Semanas 8-10:</strong> SEO, contenido y lanzamiento</p>',
      inversion: '<table><tr><th>Servicio</th><th>Inversión</th></tr><tr><td>Branding Corporativo</td><td>$1,500 USD</td></tr><tr><td>Diseño Web</td><td>$2,200 USD</td></tr><tr><td>SEO (3 meses)</td><td>$1,800 USD</td></tr><tr><td><strong>Total</strong></td><td><strong>$5,500 USD</strong></td></tr></table>',
      proximosPasos: '<ol><li>Confirmar fecha para workshop de descubrimiento</li><li>Firma de contrato y anticipo del 40%</li><li>Enviar materiales existentes de marca</li><li>Designar punto de contacto interno</li></ol>',
    }),
  },
  {
    id: 'demo-prop-4', title: 'Plan Social Media Q2',
    status: 'accepted', client_id: 'FoodTech Ltda',
    created_at: '2026-04-10T11:00:00Z', updated_at: '2026-04-10T14:00:00Z',
    context: { budget: 1800, problema: 'Baja presencia en redes sociales', services: ['Social Media'], tono: 'casual' },
    sections: makeSections({
      resumenEjecutivo: '<p>FoodTech Ltda necesita construir una presencia sólida en redes sociales para conectar con su audiencia B2C y generar awareness de marca. Proponemos una estrategia de <strong>Social Media Management</strong> enfocada en Instagram y TikTok para el Q2 2026.</p>',
      problema: '<p>FoodTech enfrenta desafíos en su comunicación digital:</p><ul><li>Presencia limitada a una cuenta de Instagram con 800 seguidores</li><li>Publicación errática: 2-3 posts al mes sin estrategia</li><li>Sin presencia en TikTok, donde está el 60% de su público objetivo</li><li>Competidores directos tienen 10x más engagement</li></ul>',
      serviciosPropuestos: '<p><strong>Social Media Management</strong></p><p>Gestión integral de Instagram y TikTok con creación de contenido, community management y reportería mensual. Incluye estrategia de influencer marketing micro.</p>',
      alcancePorServicio: '<ul><li>20 publicaciones mensuales por plataforma</li><li>4 Reels/TikToks semanales</li><li>Community management diario</li><li>1 colaboración con micro-influencer por mes</li><li>Reportería mensual de performance</li></ul>',
      timeline: '<p><strong>Semana 1:</strong> Estrategia, calendario editorial, setup de cuentas</p><p><strong>Semana 2-4:</strong> Primeras publicaciones, establecer tono de marca</p><p><strong>Mes 2-3:</strong> Escalamiento, influencer marketing, optimización</p>',
      inversion: '<table><tr><th>Servicio</th><th>Mensual</th></tr><tr><td>Social Media Management</td><td>$1,800 USD</td></tr></table><p>*Contrato mínimo de 3 meses. Producción audiovisual incluida.</p>',
      proximosPasos: '<ol><li>Enviar accesos a cuentas de redes sociales</li><li>Reunión para definir brand voice y tono</li><li>Firma de contrato trimestral</li><li>Inicio de gestión: 21 de abril</li></ol>',
    }),
  },
  {
    id: 'demo-prop-5', title: 'Propuesta E-commerce + Paid Media',
    status: 'accepted', client_id: 'TechFlow Solutions',
    created_at: '2026-04-09T15:00:00Z', updated_at: '2026-04-09T17:00:00Z',
    context: { budget: 5500, problema: 'Lanzamiento tienda online', services: ['E-commerce', 'Paid Media'], tono: 'consultivo' },
    sections: makeSections({
      resumenEjecutivo: '<p>TechFlow Solutions busca lanzar su tienda online B2B para complementar su canal de ventas directo. Proponemos el desarrollo de una plataforma de <strong>E-commerce</strong> integrada con campañas de <strong>Paid Media</strong> para generar tráfico calificado desde el día uno.</p>',
      problema: '<p>TechFlow depende exclusivamente de ventas directas:</p><ul><li>100% de ventas vía equipo comercial (no escalable)</li><li>Clientes solicitan portal de autoservicio para recompras</li><li>Sin catálogo digital actualizado</li><li>Pérdida de oportunidades fuera del horario laboral</li></ul>',
      serviciosPropuestos: '<p><strong>1. E-commerce B2B</strong></p><p>Tienda online en Shopify con catálogo inteligente, precios diferenciados y portal de cliente.</p><p><strong>2. Paid Media</strong></p><p>Campañas de lanzamiento en Google Ads y LinkedIn Ads para generar tráfico calificado B2B.</p>',
      alcancePorServicio: '<p><strong>E-commerce:</strong></p><ul><li>Setup Shopify con tema personalizado</li><li>Catálogo de 200+ productos</li><li>Integración con pasarela de pago</li><li>Portal de cliente con historial</li></ul><p><strong>Paid Media:</strong></p><ul><li>Campañas de Search y LinkedIn</li><li>Remarketing dinámico</li><li>Reportería semanal</li></ul>',
      timeline: '<p><strong>Mes 1:</strong> Diseño y desarrollo de tienda</p><p><strong>Mes 2:</strong> Carga de catálogo, integraciones, testing</p><p><strong>Mes 3:</strong> Lanzamiento + campañas de paid media</p>',
      inversion: '<table><tr><th>Servicio</th><th>Inversión</th></tr><tr><td>E-commerce (desarrollo)</td><td>$3,500 USD</td></tr><tr><td>Paid Media (3 meses)</td><td>$2,000 USD</td></tr><tr><td><strong>Total</strong></td><td><strong>$5,500 USD</strong></td></tr></table>',
      proximosPasos: '<ol><li>Enviar catálogo de productos en formato Excel</li><li>Definir estructura de precios por segmento</li><li>Firma de contrato</li><li>Inicio del proyecto: 28 de abril</li></ol>',
    }),
  },
  {
    id: 'demo-prop-6', title: 'Campaña Email Marketing',
    status: 'accepted', client_id: 'Retail Plus Chile',
    created_at: '2026-04-08T08:00:00Z', updated_at: '2026-04-08T10:00:00Z',
    context: { budget: 1200, problema: 'Retención de clientes', services: ['Email Marketing'], tono: 'formal' },
    sections: makeSections({
      resumenEjecutivo: '<p>Retail Plus Chile necesita implementar una estrategia de <strong>Email Marketing</strong> automatizado para mejorar la retención de clientes y aumentar la frecuencia de compra. Proponemos flujos automatizados que cubran todo el ciclo de vida del cliente.</p>',
      problema: '<p>La retención de clientes presenta oportunidades de mejora:</p><ul><li>Tasa de recompra del 18% (benchmark sector retail: 35%)</li><li>Sin comunicación post-venta automatizada</li><li>Base de 45,000 emails sin segmentar</li><li>Newsletter mensual con open rate del 8%</li></ul>',
      serviciosPropuestos: '<p><strong>Email Marketing Automatizado</strong></p><p>Implementación de Mailchimp con flujos de bienvenida, post-compra, reactivación, carrito abandonado y campañas segmentadas por categoría de producto.</p>',
      alcancePorServicio: '<ul><li>Setup de Mailchimp con segmentación avanzada</li><li>6 flujos automatizados</li><li>12 templates de email responsive</li><li>Integración con POS para data transaccional</li><li>Reportería quincenal</li></ul>',
      timeline: '<p><strong>Semana 1-2:</strong> Setup, segmentación, diseño de templates</p><p><strong>Semana 3-4:</strong> Creación de flujos, testing</p><p><strong>Mes 2:</strong> Lanzamiento, optimización</p>',
      inversion: '<table><tr><th>Servicio</th><th>Setup</th><th>Mensual</th></tr><tr><td>Email Marketing</td><td>$700 USD</td><td>$500 USD</td></tr></table><p>*Licencia Mailchimp ($99/mes) no incluida.</p>',
      proximosPasos: '<ol><li>Enviar export de base de datos de clientes</li><li>Definir segmentos prioritarios</li><li>Firma de contrato</li><li>Inicio: semana del 14 de abril</li></ol>',
    }),
  },
  {
    id: 'demo-prop-7', title: 'Auditoría UX + Rediseño Web',
    status: 'accepted', client_id: 'Innova Labs',
    created_at: '2026-04-07T10:00:00Z', updated_at: '2026-04-07T12:00:00Z',
    context: { budget: 2100, problema: 'Alta tasa de rebote', services: ['UX Audit', 'Web Design'], tono: 'técnico' },
    sections: makeSections({
      resumenEjecutivo: '<p>Innova Labs presenta una alta tasa de rebote (68%) en su sitio web, indicando problemas serios de experiencia de usuario. Proponemos una <strong>Auditoría UX</strong> completa seguida de un <strong>Rediseño</strong> enfocado en mejorar la conversión y la navegabilidad del sitio.</p>',
      problema: '<p>El análisis preliminar revela:</p><ul><li>Tasa de rebote del 68% (benchmark: 40-45%)</li><li>Tiempo promedio en página: 45 segundos</li><li>Formulario de contacto con 12 campos (best practice: 3-5)</li><li>Navegación confusa con 8 niveles de menú</li></ul>',
      serviciosPropuestos: '<p><strong>1. Auditoría UX</strong></p><p>Evaluación heurística, análisis de heatmaps, entrevistas a usuarios y reporte de hallazgos.</p><p><strong>2. Rediseño Web</strong></p><p>Rediseño de páginas clave basado en hallazgos de la auditoría con foco en conversión.</p>',
      alcancePorServicio: '<p><strong>Auditoría UX:</strong></p><ul><li>Evaluación heurística (10 principios de Nielsen)</li><li>Análisis de 3 meses de datos en Hotjar</li><li>5 entrevistas a usuarios</li><li>Reporte de hallazgos y recomendaciones</li></ul><p><strong>Rediseño:</strong></p><ul><li>Wireframes de 5 páginas clave</li><li>Diseño visual en Figma</li><li>Desarrollo responsive</li><li>A/B testing post-lanzamiento</li></ul>',
      timeline: '<p><strong>Semana 1-2:</strong> Auditoría UX y reporte</p><p><strong>Semana 3-4:</strong> Wireframes y diseño</p><p><strong>Semana 5-6:</strong> Desarrollo y testing</p>',
      inversion: '<table><tr><th>Servicio</th><th>Inversión</th></tr><tr><td>Auditoría UX</td><td>$800 USD</td></tr><tr><td>Rediseño Web</td><td>$1,300 USD</td></tr><tr><td><strong>Total</strong></td><td><strong>$2,100 USD</strong></td></tr></table>',
      proximosPasos: '<ol><li>Enviar accesos a Google Analytics y Hotjar</li><li>Coordinar entrevistas con 5 usuarios</li><li>Firma de contrato</li><li>Inicio de auditoría: inmediato</li></ol>',
    }),
  },
  {
    id: 'demo-prop-8', title: 'Propuesta Branding Corporativo',
    status: 'accepted', client_id: 'Grupo Andino SpA',
    created_at: '2026-04-05T14:00:00Z', updated_at: '2026-04-06T09:00:00Z',
    context: { budget: 2500, problema: 'Rebranding necesario', services: ['Branding'], tono: 'profesional' },
    sections: makeSections({
      resumenEjecutivo: '<p>Grupo Andino SpA necesita un <strong>rebranding</strong> que refleje su evolución de empresa local a firma regional. Proponemos un proceso de construcción de marca que alinee la identidad visual con el posicionamiento estratégico actual.</p>',
      problema: '<p>La identidad de marca actual presenta desafíos:</p><ul><li>Logo y materiales diseñados en 2018, previo a la expansión regional</li><li>Inconsistencia entre materiales de los 3 países</li><li>Percepción de marca no alineada con el segmento premium</li></ul>',
      serviciosPropuestos: '<p><strong>Branding Corporativo</strong></p><p>Proceso completo de rebranding incluyendo estrategia de marca, diseño de identidad visual y manual de aplicación.</p>',
      alcancePorServicio: '<ul><li>Workshop de marca (2 sesiones)</li><li>3 propuestas de concepto</li><li>Manual de marca (50+ páginas)</li><li>Kit de aplicaciones (tarjetas, firma email, PPT)</li><li>Kit de redes sociales</li></ul>',
      timeline: '<p><strong>Semana 1:</strong> Workshop y discovery</p><p><strong>Semana 2-3:</strong> Propuestas de concepto</p><p><strong>Semana 4-5:</strong> Desarrollo de identidad final</p><p><strong>Semana 6:</strong> Manual de marca y entrega</p>',
      inversion: '<table><tr><th>Servicio</th><th>Inversión</th></tr><tr><td>Branding Corporativo</td><td>$2,500 USD</td></tr></table>',
      proximosPasos: '<ol><li>Agendar workshop de marca</li><li>Enviar materiales actuales de marca</li><li>Firma de contrato y anticipo 50%</li></ol>',
    }),
  },
  {
    id: 'demo-prop-9', title: 'Plan Google Ads Q2',
    status: 'accepted', client_id: 'FoodTech Ltda',
    created_at: '2026-04-04T09:00:00Z', updated_at: '2026-04-04T11:00:00Z',
    context: { budget: 1500, problema: 'Mejorar ROAS en campañas', services: ['Paid Media'], tono: 'consultivo' },
    sections: makeSections({
      resumenEjecutivo: '<p>FoodTech Ltda busca mejorar el retorno de inversión publicitaria (ROAS) de sus campañas de Google Ads. Proponemos una optimización integral de la cuenta con reestructuración de campañas, mejora de Quality Score y estrategia de bidding avanzada.</p>',
      problema: '<p>Las campañas actuales presentan ineficiencias:</p><ul><li>ROAS actual: 1.8x (objetivo: 4x)</li><li>Quality Score promedio: 4/10</li><li>Estructura de campañas sin segmentación clara</li><li>Sin negativización de keywords (desperdicio del 30% del budget)</li></ul>',
      serviciosPropuestos: '<p><strong>Gestión de Google Ads</strong></p><p>Reestructuración completa de la cuenta, optimización de landing pages, estrategia de keywords negativas y reporting automatizado.</p>',
      alcancePorServicio: '<ul><li>Auditoría de cuenta existente</li><li>Reestructuración de campañas y ad groups</li><li>Investigación de keywords + negativización</li><li>Creación de 20+ anuncios optimizados</li><li>Setup de conversiones y valores</li><li>Reporting semanal automatizado</li></ul>',
      timeline: '<p><strong>Semana 1:</strong> Auditoría y reestructuración</p><p><strong>Semana 2-4:</strong> Nuevas campañas, primeras optimizaciones</p><p><strong>Mes 2-3:</strong> Escalamiento y optimización continua</p>',
      inversion: '<table><tr><th>Servicio</th><th>Mensual</th></tr><tr><td>Gestión Google Ads</td><td>$1,500 USD</td></tr></table><p>*Contrato trimestral. Ad spend mínimo recomendado: $3,000 USD/mes.</p>',
      proximosPasos: '<ol><li>Enviar accesos a Google Ads y Analytics</li><li>Compartir objetivos de negocio Q2</li><li>Firma de contrato trimestral</li></ol>',
    }),
  },
  {
    id: 'demo-prop-10', title: 'Propuesta Analytics + Dashboard',
    status: 'draft', client_id: 'Innova Labs',
    created_at: '2026-04-03T16:00:00Z', updated_at: '2026-04-03T16:30:00Z',
    context: { budget: 1800, problema: 'Sin visibilidad de métricas', services: ['Analytics', 'Dashboard'], tono: 'técnico' },
    sections: makeSections({
      resumenEjecutivo: '<p>Innova Labs carece de visibilidad sobre sus métricas digitales clave. Proponemos implementar un ecosistema de <strong>Analytics</strong> con un <strong>Dashboard ejecutivo</strong> en Looker Studio que consolide datos de todas las plataformas en una vista unificada.</p>',
      problema: '<p>Los desafíos de medición actuales:</p><ul><li>Google Analytics no configurado correctamente (sin eventos ni conversiones)</li><li>Datos dispersos en 5+ plataformas sin consolidar</li><li>Reportes manuales que toman 8+ horas semanales</li><li>Decisiones basadas en intuición, no en datos</li></ul>',
      serviciosPropuestos: '<p><strong>1. Analytics Setup</strong></p><p>Configuración completa de GA4, Tag Manager, eventos personalizados y tracking de conversiones.</p><p><strong>2. Dashboard Ejecutivo</strong></p><p>Dashboard en Looker Studio con datos de Google Ads, Meta, GA4 y CRM.</p>',
      alcancePorServicio: '<p><strong>Analytics:</strong></p><ul><li>Setup GA4 + Tag Manager</li><li>20 eventos personalizados</li><li>Tracking de conversiones (5 tipos)</li><li>Capacitación al equipo</li></ul><p><strong>Dashboard:</strong></p><ul><li>Dashboard en Looker Studio (5 vistas)</li><li>Conexión de 4 fuentes de datos</li><li>Actualización automática diaria</li></ul>',
      timeline: '<p><strong>Semana 1:</strong> Auditoría y plan de medición</p><p><strong>Semana 2-3:</strong> Setup de tracking y eventos</p><p><strong>Semana 4:</strong> Dashboard y capacitación</p>',
      inversion: '<table><tr><th>Servicio</th><th>Inversión</th></tr><tr><td>Analytics Setup</td><td>$1,000 USD</td></tr><tr><td>Dashboard Ejecutivo</td><td>$800 USD</td></tr><tr><td><strong>Total</strong></td><td><strong>$1,800 USD</strong></td></tr></table>',
      proximosPasos: '<ol><li>Enviar accesos a todas las plataformas</li><li>Definir KPIs prioritarios con gerencia</li><li>Firma de contrato</li></ol>',
    }),
  },
  {
    id: 'demo-prop-11', title: 'Estrategia Content + SEO',
    status: 'accepted', client_id: 'TechFlow Solutions',
    created_at: '2026-04-02T10:00:00Z', updated_at: '2026-04-02T14:00:00Z',
    context: { budget: 2200, problema: 'Necesitan contenido evergreen', services: ['Content Marketing', 'SEO'], tono: 'consultivo' },
    sections: makeSections({
      resumenEjecutivo: '<p>TechFlow Solutions necesita posicionarse como thought leader en su nicho a través de contenido evergreen optimizado para SEO. Proponemos una estrategia de <strong>Content Marketing</strong> integrada con <strong>SEO</strong> que genere tráfico orgánico sostenible.</p>',
      problema: '<p>TechFlow carece de contenido que genere tráfico orgánico:</p><ul><li>Blog sin artículos desde hace 6 meses</li><li>0 páginas posicionadas en primeros resultados para términos no-branded</li><li>Competidores publican 8-12 artículos/mes</li></ul>',
      serviciosPropuestos: '<p><strong>Content Marketing + SEO</strong></p><p>Estrategia editorial integrada con optimización SEO para cada pieza de contenido, incluyendo artículos, guías y casos de estudio.</p>',
      alcancePorServicio: '<ul><li>Keyword research y cluster de temas</li><li>8 artículos SEO/mes (1,200+ palabras)</li><li>2 guías descargables por trimestre</li><li>Optimización on-page de cada artículo</li><li>Estrategia de internal linking</li></ul>',
      timeline: '<p><strong>Semana 1:</strong> Research y calendario editorial</p><p><strong>Semana 2+:</strong> Publicación semanal continua</p><p><strong>Mes 3:</strong> Primeros resultados orgánicos medibles</p>',
      inversion: '<table><tr><th>Servicio</th><th>Mensual</th></tr><tr><td>Content + SEO</td><td>$2,200 USD</td></tr></table><p>*Contrato de 6 meses para resultados sostenibles.</p>',
      proximosPasos: '<ol><li>Validar temas prioritarios con equipo de producto</li><li>Enviar guía de tono de marca</li><li>Firma de contrato semestral</li></ol>',
    }),
  },
  {
    id: 'demo-prop-12', title: 'Propuesta Video Marketing',
    status: 'rejected', client_id: 'Retail Plus Chile',
    created_at: '2026-04-01T08:00:00Z', updated_at: '2026-04-01T10:00:00Z',
    context: { budget: 3800, problema: 'Baja conversión en landing pages', services: ['Video Marketing'], tono: 'creativo' },
    sections: makeSections({
      resumenEjecutivo: '<p>Retail Plus Chile enfrenta una baja tasa de conversión en sus landing pages. Proponemos una estrategia de <strong>Video Marketing</strong> con videos explicativos y testimoniales que aumenten el engagement y la confianza del visitante.</p>',
      problema: '<p>Las landing pages presentan bajo rendimiento:</p><ul><li>Tasa de conversión actual: 1.5% (benchmark: 3.5%)</li><li>Tiempo en página: 30 segundos promedio</li><li>Sin contenido audiovisual en ninguna página de producto</li><li>Competidores usan video en el 80% de sus landings</li></ul>',
      serviciosPropuestos: '<p><strong>Video Marketing</strong></p><p>Producción de videos explicativos, testimoniales de clientes y product demos para integrar en landing pages, redes sociales y campañas de email.</p>',
      alcancePorServicio: '<ul><li>3 videos explicativos (60-90 segundos)</li><li>5 testimoniales de clientes (30-45 segundos)</li><li>10 clips cortos para redes sociales</li><li>Subtítulos y adaptación por plataforma</li><li>Guión y dirección creativa incluidos</li></ul>',
      timeline: '<p><strong>Semana 1:</strong> Brief creativo y guiones</p><p><strong>Semana 2-3:</strong> Producción y filmación</p><p><strong>Semana 4:</strong> Post-producción y entrega</p>',
      inversion: '<table><tr><th>Servicio</th><th>Inversión</th></tr><tr><td>Video Marketing (18 piezas)</td><td>$3,800 USD</td></tr></table>',
      proximosPasos: '<ol><li>Aprobar brief creativo</li><li>Coordinar agenda de filmación</li><li>Seleccionar clientes para testimoniales</li><li>Firma de contrato y anticipo 50%</li></ol>',
    }),
  },
]

// ─── Handlers ────────────────────────────────────────────────

export async function GET() {
  if (DEMO_MODE) {
    // Return list without full sections (lighter payload for list view)
    const data = DEMO_PROPOSALS.map(({ sections: _s, ...rest }) => rest)
    return Response.json({ data, total: data.length })
  }

  const { db } = await import('@/lib/db')
  const { proposals, tenants } = await import('@/db/schema')
  const { auth } = await import('@clerk/nextjs/server')
  const { orgId } = await auth()
  if (!orgId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.clerkOrgId, orgId) })
  if (!tenant) return Response.json({ data: [], total: 0 })

  try {
    const rows = await db.query.proposals.findMany({
      where: eq(proposals.tenantId, tenant.id), orderBy: [desc(proposals.createdAt)],
      limit: 200, with: { client: true },
    })
    const data = rows.map((r) => ({
      id: r.id, title: r.title, status: r.status,
      client_id: r.client?.name ?? r.clientId,
      created_at: r.createdAt?.toISOString() ?? new Date().toISOString(),
      updated_at: r.updatedAt?.toISOString() ?? new Date().toISOString(),
      context: (r.context as Record<string, unknown>) ?? {},
    }))
    return Response.json({ data, total: data.length })
  } catch (err) {
    console.error('[api/proposals] Error:', err)
    return Response.json({ data: [], total: 0 })
  }
}

export async function POST(req: Request) {
  if (DEMO_MODE) {
    const body = await req.json()
    const newProp = {
      id: `demo-prop-${Date.now()}`, title: body.title ?? 'Nueva propuesta',
      status: 'draft', client_id: body.client_id ?? 'Demo',
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      context: body.context ?? {},
      sections: body.sections ?? {},
    }
    DEMO_PROPOSALS.unshift(newProp)
    return Response.json({ id: newProp.id, status: newProp.status, created_at: newProp.created_at })
  }

  const { db } = await import('@/lib/db')
  const { proposals, tenants, users } = await import('@/db/schema')
  const { auth } = await import('@clerk/nextjs/server')
  const session = await auth()
  if (!session.orgId || !session.userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.clerkOrgId, session.orgId) })
  if (!tenant) return Response.json({ error: 'Tenant not found' }, { status: 404 })

  const user = await db.query.users.findFirst({ where: eq(users.clerkUserId, session.userId) })
  if (!user) return Response.json({ error: 'User not found' }, { status: 404 })

  try {
    const body = await req.json()
    const [newProposal] = await db.insert(proposals).values({
      tenantId: tenant.id, clientId: body.client_id, createdBy: user.id,
      title: body.title ?? null, status: body.status ?? 'draft',
      templateId: body.template_id ?? null, context: body.context ?? {},
      sections: body.sections ?? {}, tokensUsed: body.tokens_used ?? 0, model: body.model ?? null,
    }).returning()
    return Response.json({
      id: newProposal.id, status: newProposal.status,
      created_at: newProposal.createdAt?.toISOString() ?? new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api/proposals] POST Error:', err)
    return Response.json({ error: 'Failed to create proposal' }, { status: 500 })
  }
}
