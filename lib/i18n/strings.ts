export const strings: Record<string, Record<string, string>> = {
  // ── Solve / Home page ──
  solveHeading: { en: "What's the stain?", es: "¿Cuál es la mancha?" },
  solveSubheading: { en: "Describe it or snap a photo", es: "Descríbela o toma una foto" },
  solvePlaceholder: { en: "Or describe the stain and material...", es: "O describe la mancha y el material..." },
  whatSurface: { en: "What surface?", es: "¿Qué superficie?" },
  orBrowseByType: { en: "Browse by stain type", es: "Buscar por tipo de mancha" },
  getProtocol: { en: "Get Protocol", es: "Obtener Protocolo" },
  scanStain: { en: "Scan Stain", es: "Escanear Mancha" },
  uploadPhoto: { en: 'Upload photo', es: 'Subir foto' },
  // ── Card Badges (TASK-133) ──
  eisenMethod: { en: 'Eisen Method', es: 'Método Eisen' },
  badgeAdvanced: { en: 'Advanced', es: 'Avanzado' },
  badgeModerate: { en: 'Moderate', es: 'Moderado' },
  badgeHighRisk: { en: 'High Risk', es: 'Alto Riesgo' },
  badgeMediumRisk: { en: 'Medium Risk', es: 'Riesgo Medio' },
  badgeColdWater: { en: 'Cold Water', es: 'Agua Fría' },
  badgeNoEnzyme: { en: 'No Enzyme', es: 'Sin Enzima' },
  badgeNoBleach: { en: 'No Bleach', es: 'Sin Blanqueador' },
  badgeNoHeat: { en: 'No Heat', es: 'Sin Calor' },
  badgeSilkSafe: { en: 'Silk Safe', es: 'Seguro para Seda' },
  badgeDryCleanOnly: { en: 'Dry Clean Only', es: 'Solo en Seco' },
  badgeTestFirst: { en: 'Test First', es: 'Prueba Primero' },
  // ── Legal / Terms additions ──
  termsNoWarranty: { en: "No Warranty on Results", es: "Sin Garantía de Resultados" },
  termsNoWarrantyContent: { en: "GONR's AI-generated protocols are best-effort recommendations based on general textile chemistry knowledge. Protocol accuracy is not guaranteed. Stain removal outcomes depend on factors outside GONR's control including garment condition, fiber composition, dye stability, prior treatments, and application technique. GONR Labs LLC makes no warranty, express or implied, regarding the accuracy, completeness, or fitness for any particular purpose of any protocol or recommendation.", es: "Los protocolos generados por IA de GONR son recomendaciones de mejor esfuerzo basadas en el conocimiento general de química textil. No se garantiza la precisión del protocolo. Los resultados de eliminación de manchas dependen de factores fuera del control de GONR, incluido el estado de la prenda, la composición de fibras, la estabilidad del tinte, tratamientos previos y la técnica de aplicación. GONR Labs LLC no ofrece ninguna garantía, expresa o implícita, sobre la precisión, integridad o idoneidad para ningún propósito particular de cualquier protocolo o recomendación." },
  termsProfessionalUse: { en: "Professional Use & Responsibility", es: "Uso Profesional y Responsabilidad" },
  termsProfessionalUseContent: { en: "Professional users — including dry cleaners, textile specialists, and spotters — are solely responsible for verifying all recommendations against their professional training, experience, and judgment before applying any treatment. GONR's recommendations do not replace professional expertise. Users assume full responsibility for all treatment decisions and their outcomes. GONR Labs LLC accepts no liability for garment damage, color loss, shrinkage, fiber damage, or any adverse outcome resulting from following GONR recommendations.", es: "Los usuarios profesionales, incluidos tintorereros, especialistas en textiles y spotters, son los únicos responsables de verificar todas las recomendaciones con su formación profesional, experiencia y juicio antes de aplicar cualquier tratamiento. Las recomendaciones de GONR no reemplazan la experiencia profesional. Los usuarios asumen toda la responsabilidad por las decisiones de tratamiento y sus resultados. GONR Labs LLC no acepta responsabilidad por daños a prendas, pérdida de color, encogimiento, daño a fibras o cualquier resultado adverso que resulte de seguir las recomendaciones de GONR." },
  // ── Legal ──
  protocolDisclaimer: { en: "This protocol is AI-assisted and provided for informational purposes only. Results vary based on stain age, fiber content, dye stability, and prior treatment. Always test first. GONR assumes no liability for damage resulting from use of this information.", es: "Este protocolo es asistido por IA y se proporciona solo con fines informativos. Los resultados varían según la antigüedad de la mancha, el contenido de fibra, la estabilidad del tinte y el tratamiento previo. Siempre pruebe primero. GONR no asume responsabilidad por daños resultantes del uso de esta información." },
  // ── Dan Protocol Builder ──
  danBuilderTitle: { en: "Dan's Protocol Builder", es: "Constructor de Protocolos de Dan" },
  danBuilderSubtitle: { en: "Select the stain and fiber, fill in your steps. AI handles the rest.", es: "Selecciona la mancha y fibra, completa los pasos. El AI hace el resto." },
  danProtocolSaved: { en: "✓ Protocol saved. It'll be live in the app after review.", es: "✓ Protocolo guardado. Estará disponible en la app después de revisión." },
  danLabelStain: { en: "Stain", es: "Mancha" },
  danSelectStain: { en: "Select stain...", es: "Selecciona mancha..." },
  danLabelFiber: { en: "Fiber", es: "Fibra" },
  danSelectFiber: { en: "Select fiber...", es: "Selecciona fibra..." },
  danProtocolSteps: { en: "Protocol Steps", es: "Pasos del Protocolo" },
  danSelectAgent: { en: "Agent...", es: "Agente..." },
  danDwellTimePlaceholder: { en: "Dwell time (e.g. 5 min)", es: "Tiempo de permanencia (ej. 5 min)" },
  danInstructionPlaceholder: { en: "What to do — be specific. How to apply, what to watch for...", es: "Qué hacer — sé específico. Cómo aplicar, qué observar..." },
  danAddStep: { en: "+ Add Step", es: "+ Agregar Paso" },
  danRemoveStep: { en: "Remove", es: "Eliminar" },
  danSafetyWarnings: { en: "Safety Warnings", es: "Advertencias de Seguridad" },
  danOnePerLine: { en: "(one per line)", es: "(una por línea)" },
  danNeverDo: { en: "Never Do", es: "Nunca Hacer" },
  danSaving: { en: "Saving...", es: "Guardando..." },
  danSaveProtocol: { en: "💾 Save Protocol", es: "💾 Guardar Protocolo" },
  danAiFillsIn: { en: "AI fills in: stain chemistry, why it works, customer language, home tips, escalation. You just provide the steps.", es: "La IA completa: química de manchas, por qué funciona, lenguaje para el cliente, consejos caseros, escalado. Tú solo provees los pasos." },
  danErrorSelectStainFiber: { en: "Select a stain and fiber first", es: "Selecciona una mancha y fibra primero" },
  danErrorMinSteps: { en: "Add at least 2 steps", es: "Agrega al menos 2 pasos" },
  danSaveFailed: { en: "Save failed — try again", es: "Error al guardar — inténtalo de nuevo" },
  danStepNumber: { en: "Step", es: "Paso" },
  // ── Spotter Courses ──
  spotterSectionCourses: { en: "Courses", es: "Cursos" },
  spotterCoursesTagline: { en: "Earn credentials. Build your GONR Spotter profile.", es: "Obtén credenciales. Construye tu perfil de Spotter en GONR." },
  courseSpottingFundamentalsTitle: { en: "Spotting Fundamentals", es: "Fundamentos del Spotting" },
  courseSpottingFundamentalsDesc: { en: "Stain chemistry, fiber behavior, and the spotter's decision framework.", es: "Química de manchas, comportamiento de fibras y el marco de decisión del spotter." },
  courseDanEisenTitle: { en: "Eisen Method", es: "Método Eisen" },
  courseDanEisenDesc: { en: "40 years of DLI expertise — professional techniques from a Hall of Fame spotter.", es: "40 años de experiencia DLI — técnicas profesionales de un spotter del Salón de la Fama." },
  courseFiberMasteryTitle: { en: "Fiber & Fabric Mastery", es: "Dominio de Fibras y Tejidos" },
  courseFiberMasteryDesc: { en: "Silk, wool, acetate, rayon — know your fiber before you touch it.", es: "Seda, lana, acetato, rayón — conoce tu fibra antes de tocarla." },
  courseCustomerCommTitle: { en: "Customer Communication", es: "Comunicación con el Cliente" },
  courseCustomerCommDesc: { en: "Handle difficult conversations with confidence. Intake, release, and follow-up scripts.", es: "Maneja conversaciones difíciles con confianza. Guiones de recepción, devolución y seguimiento." },
  // ── Care Label / Fiber Context ──
  fiberIdentified: { en: "Fiber identified", es: "Fibra identificada" },
  careLabel: { en: "Care label", es: "Etiqueta de cuidado" },
  dryCleanOnly: { en: "Dry Clean Only", es: "Solo Limpieza en Seco" },
  noBleach: { en: "No Bleach", es: "Sin Blanqueador" },
  noHeat: { en: "No Heat", es: "Sin Calor" },
  handWashOnly: { en: "Hand Wash Only", es: "Solo Lavar a Mano" },
  doNotWash: { en: "Do Not Wash", es: "No Lavar" },
  noIron: { en: "No Iron", es: "No Planchar" },
  scanStainSubtext: { en: "Built by cleaners. Trusted by pros.", es: "Creado por limpiadores. Confiado por profesionales." },
  aiStainIntelligence: { en: "AI Stain Removal & Garment Care", es: "Eliminación de Manchas con IA y Cuidado de Prendas" },
  masterSpotter: { en: "Textile Intelligence", es: "Inteligencia Textil" },
  poweredBy: { en: "Powered by", es: "Impulsado por" },
  careLabelSubtext: { en: "Reads fiber + care symbols instantly", es: "Lee fibra y símbolos de cuidado al instante" },
  solveBtn: { en: "Solve →", es: "Resolver →" },
  scanCareLabel: { en: "Scan Care Label", es: "Escanear Etiqueta" },
  addContextOptional: { en: "Add context (optional)", es: "Agregar contexto (opcional)" },
  fabricPlaceholder: { en: "Fabric feel — silky, stiff, stretchy, fuzzy...", es: "Textura — suave, rígida, elástica..." },
  garmentLocationPlaceholder: { en: "Where on the garment — collar, sleeve, chest...", es: "Dónde en la prenda — cuello, manga, pecho..." },
  stainCaptured: { en: "Stain ✓", es: "Mancha ✓" },
  careLabelAdded: { en: "Care Label ✓", es: "Etiqueta ✓" },
  photoAndCareLabel: { en: "Photo + Care Label", es: "Foto + Etiqueta" },
  photoOnly: { en: "Photo", es: "Foto" },

  // ── Auth ──
  failedToSendLink: { en: "Failed to send login link", es: "No se pudo enviar el enlace de inicio de sesión" },
  checkYourEmail: { en: "Check your email", es: "Revisa tu correo" },
  sentMagicLink: { en: "We sent a magic link to", es: "Enviamos un enlace mágico a" },
  clickLinkToSignIn: { en: "Click the link in the email to sign in.", es: "Haz clic en el enlace del correo para iniciar sesión." },
  useDifferentEmail: { en: "Use a different email", es: "Usar otro correo" },
  signInToGonr: { en: "Sign in to GONR", es: "Inicia sesión en GONR" },
  enterEmailPrompt: { en: "Enter your email to sign in or create an account.", es: "Ingresa tu correo para iniciar sesión o crear una cuenta." },
  emailPlaceholder: { en: "you@example.com", es: "tu@ejemplo.com" },
  sending: { en: "Sending...", es: "Enviando..." },
  sendMagicLink: { en: "Send Magic Link", es: "Enviar Enlace Mágico" },
  noPasswordNeeded: { en: "No password needed. We'll email you a secure sign-in link.", es: "Sin contraseña. Te enviaremos un enlace seguro de inicio de sesión." },
  authenticationError: { en: "Authentication Error", es: "Error de Autenticación" },
  tryAgain: { en: "Try again", es: "Intentar de nuevo" },
  signingYouIn: { en: "Signing you in...", es: "Iniciando sesión..." },
  verifyingCredentials: { en: "Please wait while we verify your credentials.", es: "Por favor espera mientras verificamos tus credenciales." },

  // ── Tier Gate ──
  tierNameHome: { en: "Home", es: "Hogar" },
  tierNameSpotter: { en: "Spotter", es: "Spotter" },
  tierNameOperator: { en: "Operator", es: "Operador" },
  tierFeatureDiy1: { en: "DIY stain protocols", es: "Protocolos de manchas para el hogar" },
  tierFeatureDiy2: { en: "Product recommendations", es: "Recomendaciones de productos" },
  tierFeatureDiy3: { en: "Basic stain identification", es: "Identificación básica de manchas" },
  tierFeatureDiy4: { en: "Email support", es: "Soporte por correo" },
  tierFeatureSpotter1: { en: "Everything in Home", es: "Todo lo de Hogar" },
  tierFeatureSpotter2: { en: "Full pro spotting protocols", es: "Protocolos profesionales completos de desmanchado" },
  tierFeatureSpotter3: { en: "Deep Solve AI analysis", es: "Análisis IA Deep Solve" },
  tierFeatureSpotter4: { en: "Customer handoff scripts", es: "Scripts de entrega al cliente" },
  tierFeatureSpotter5: { en: "Stain Brain chat", es: "Chat Stain Brain" },
  tierFeatureSpotter6: { en: "Priority support", es: "Soporte prioritario" },
  tierFeatureOp1: { en: "Everything in Spotter", es: "Todo lo de Spotter" },
  tierFeatureOp2: { en: "Unlimited Deep Solve", es: "Deep Solve ilimitado" },
  tierFeatureOp3: { en: "Team accounts (up to 5)", es: "Cuentas de equipo (hasta 5)" },
  tierFeatureOp4: { en: "Custom protocol library", es: "Biblioteca de protocolos personalizada" },
  tierFeatureOp5: { en: "API access", es: "Acceso API" },
  tierFeatureOp6: { en: "White-glove onboarding", es: "Incorporación personalizada" },
  tierGateSubheading: { en: "Professional stain removal intelligence", es: "Inteligencia profesional de eliminación de manchas" },
  mostPopular: { en: "Most Popular", es: "Más Popular" },
  getStarted: { en: "Get Started", es: "Comenzar" },

  // ── Chips ──
  whatStain: { en: "What stain?", es: "¿Qué mancha?" },
  cottonModWhite: { en: "White / Light", es: "Blanco / Claro" },
  cottonModColored: { en: "Colored / Dark", es: "Coloreado / Oscuro" },

  // ── Header ──
  toggleLanguageLabel: { en: "Toggle language", es: "Cambiar idioma" },
  toggleThemeLabel: { en: "Toggle theme", es: "Cambiar tema" },

  // ── Errors ──
  failedToGenerateMessage: { en: "Failed to generate message", es: "No se pudo generar el mensaje" },
  analysisFailed: { en: "Analysis failed", es: "El análisis falló" },
  enhancedProtocolGenerated: { en: "Enhanced protocol generated.", es: "Protocolo mejorado generado." },

  // ── Customer Handoff ──
  customerHandoffTitle: { en: "Customer Handoff", es: "Entrega al Cliente" },
  canTreatYes: { en: "Yes — treatable", es: "Sí — tratable" },
  canTreatLikely: { en: "Likely treatable", es: "Probablemente tratable" },
  canTreatHighRisk: { en: "High risk — no guarantee", es: "Alto riesgo — sin garantía" },
  whatToSayLabel: { en: "What to say", es: "Qué decirle" },
  ticketNotesLabel: { en: "Ticket notes", es: "Notas del ticket" },
  stainLabel: { en: "Stain", es: "Mancha" },
  fiberLabel: { en: "Fiber", es: "Fibra" },
  treatmentLabel: { en: "Treatment", es: "Tratamiento" },
  riskLabel: { en: "Risk", es: "Riesgo" },
  locationLabel: { en: "Location", es: "Ubicación" },
  spotterWatchFor: { en: "Spotter: watch for", es: "Técnico: atención a" },
  findingProtocol: { en: "Finding protocol...", es: "Buscando protocolo..." },
  backToSearch: { en: "← Back to search", es: "← Volver a la búsqueda" },

  // ── ResultCard ──
  verifiedProtocol: { en: "VERIFIED PROTOCOL", es: "PROTOCOLO VERIFICADO" },
  aiGenerated: { en: "AI GENERATED", es: "GENERADO POR IA" },
  verified: { en: "VERIFIED", es: "VERIFICADO" },
  ai: { en: "AI", es: "IA" },
  difficulty: { en: "Difficulty", es: "Dificultad" },
  pro: { en: "Pro", es: "Pro" },
  diy: { en: "DIY", es: "DIY" },
  proProtocol: { en: "Pro Protocol", es: "Protocolo Profesional" },
  diyHome: { en: "DIY / Home", es: "Para el Hogar" },
  proSteps: { en: "Pro Steps", es: "Pasos Pro" },
  diySteps: { en: "DIY Steps", es: "Pasos DIY" },
  technique: { en: "Technique", es: "Técnica" },
  chemistry: { en: "Chemistry", es: "Química" },
  chemistryDetails: { en: "Chemistry Details", es: "Detalles de Química" },
  safety: { en: "Safety", es: "Seguridad" },
  safetyWarnings: { en: "Safety & Warnings", es: "Seguridad y Advertencias" },
  products: { en: "Products", es: "Productos" },
  professional: { en: "Professional", es: "Profesional" },
  consumer: { en: "Consumer", es: "Consumidor" },
  whyThisWorks: { en: "Why This Works", es: "Por Qué Funciona" },
  customerExplanation: { en: "Customer Explanation", es: "Explicación al Cliente" },
  whatToTellCustomer: { en: "What to Tell the Customer", es: "Qué Decirle al Cliente" },
  customerHandoff: { en: "Customer Handoff", es: "Respuesta al Cliente" },
  deepSolve: { en: "Deep Solve — Get a tailored protocol", es: "Deep Solve — Obtén un protocolo personalizado" },
  askStainBrain: { en: "Ask Stain Brain about this", es: "Pregúntale a Stain Brain sobre esto" },
  escalation: { en: "Escalation", es: "Escalación" },
  when: { en: "When", es: "Cuándo" },
  whatToSay: { en: "What to say", es: "Qué decir" },
  specialistLabel: { en: "Specialist", es: "Especialista" },
  commonMistakes: { en: "Common Mistakes", es: "Errores Comunes" },
  solventNote: { en: "Solvent Note", es: "Nota de Solvente" },
  back: { en: "Back", es: "Atrás" },

  // ── Nav ──
  solve: { en: "Solve", es: "Resolver" },
  scan: { en: "Scan", es: "Escanear" },
  proTools: { en: "Pro Tools", es: "Herramientas Pro" },
  profile: { en: "Profile", es: "Perfil" },

  // ── Scan page ──
  scanSubtitle: { en: "Snap a photo of a stain for instant identification.", es: "Toma una foto de una mancha para identificación instantánea." },
  comingSoon: { en: "Coming soon", es: "Próximamente" },
  scanPageDesc: { en: "Point your camera at a stain and GONR will identify the stain type and surface automatically.", es: "Apunta tu cámara a la mancha y GONR identificará automáticamente el tipo y la superficie." },

  // ── Pro Tools page ──
  proToolsSubtitle: { en: "Advanced features for professional cleaners.", es: "Funciones avanzadas para profesionales de tintorería." },
  garmentAnalysis: { en: "Garment Analysis", es: "Análisis de Prendas" },
  garmentAnalysisDesc: { en: "Photo of damage → AI reasoning → root cause + repair protocol + customer handoff.", es: "Foto del daño → razonamiento IA → causa raíz + protocolo de reparación + respuesta al cliente." },
  deepSolveTitle: { en: "Deep Solve", es: "Deep Solve" },
  deepSolveDesc: { en: "AI-powered deep analysis of complex or multi-layered stains.", es: "Análisis profundo con IA de manchas complejas o multicapa." },
  customerHandoffDesc: { en: "Generate professional customer-facing messages for intake, release, and tough stains.", es: "Genera mensajes profesionales para clientes sobre ingreso, entrega y manchas difíciles." },
  stainBrain: { en: "Ask Stain Brain", es: "Pregunta a Stain Brain" },
  stainBrainDesc: { en: "Chat with GONR\u2019s AI about any stain scenario. Ask anything.", es: "Chatea con la IA de GONR sobre cualquier escenario de manchas. Pregunta lo que sea." },
  backUpper: { en: "← BACK", es: "← VOLVER" },
  operatorBadge: { en: "OPERATOR", es: "OPERADOR" },
  proBadge: { en: "PRO", es: "PRO" },

  // ── Profile page ──
  profileSubtitle: { en: "Your GONR account & usage stats.", es: "Tu cuenta GONR y estadísticas de uso." },
  usage: { en: "Usage", es: "Uso" },
  solvesRun: { en: "solves run", es: "protocolos realizados" },
  appearance: { en: "Appearance", es: "Apariencia" },
  currentTheme: { en: "Current theme", es: "Tema actual" },
  dark: { en: "Dark", es: "Oscuro" },
  light: { en: "Light", es: "Claro" },
  headerThemeHint: { en: "Use the header toggle to switch themes.", es: "Usa el botón del encabezado para cambiar temas." },
  upgradeToGonrPro: { en: "Upgrade to GONR Pro", es: "Mejora a GONR Pro" },
  unlockProFeatures: { en: "Unlock Deep Solve, Customer Handoff, and more.", es: "Desbloquea Deep Solve, Respuesta al Cliente y más." },
  language: { en: "Language", es: "Idioma" },

  // ── Auth / Account ──
  login: { en: "Log In", es: "Iniciar Sesión" },
  logout: { en: "Log Out", es: "Cerrar Sesión" },
  signIn: { en: "Sign In", es: "Iniciar Sesión" },
  signOut: { en: "Sign Out", es: "Cerrar Sesión" },
  email: { en: "Email", es: "Correo" },
  account: { en: "Account", es: "Cuenta" },

  // ── Tier / Subscription ──
  unlockGonr: { en: "Unlock GONR", es: "Desbloquea GONR" },
  maybeLater: { en: "Maybe later", es: "Quizás después" },
  free: { en: "Free", es: "Gratis" },
  founder: { en: "Founder", es: "Fundador" },
  manageSub: { en: "Manage Subscription", es: "Administrar Suscripción" },

  // ── Theme ──
  darkMode: { en: "Dark mode", es: "Modo oscuro" },
  lightMode: { en: "Light mode", es: "Modo claro" },

  // ── Handoff Module ──
  selectSituation: { en: "Select a situation:", es: "Selecciona una situación:" },
  intake: { en: "Intake", es: "Ingreso" },
  improved: { en: "Improved", es: "Mejorado" },
  tough: { en: "Tough Stain", es: "Mancha Difícil" },
  release: { en: "Release", es: "Entrega" },
  manufacturerDefect: { en: "Manufacturer Defect", es: "Defecto de Fabricación" },
  addDetails: { en: "Add details about the situation...", es: "Agrega detalles sobre la situación..." },
  generateResponse: { en: "Generate Response", es: "Generar Respuesta" },
  generating: { en: "Generating...", es: "Generando..." },
  copyToClipboard: { en: "Copy to Clipboard", es: "Copiar al Portapapeles" },
  copied: { en: "Copied!", es: "¡Copiado!" },

  // ── Garment Analysis ──
  garmentAnalysisTitle: { en: "Garment Analysis", es: "Análisis de Prendas" },
  garmentAnalysisSubtext: { en: "Photo of damage → AI reasoning → root cause + handoff language", es: "Foto del daño → razonamiento IA → causa raíz + protocolo de reparación + respuesta al cliente" },
  newAnalysis: { en: "NEW", es: "NUEVO" },
  tapToPhotograph: { en: "Tap to photograph damage", es: "Toca para fotografiar el daño" },
  orUploadPhoto: { en: "or upload an existing photo", es: "o sube una foto existente" },
  describeOptional: { en: "Describe what you see (optional)...", es: "Describe lo que ves (opcional)..." },
  analyzingDamage: { en: "Analyzing damage...", es: "Analizando daño..." },
  analyzeGarment: { en: "Analyze Garment", es: "Analizar Prenda" },
  rootCause: { en: "ROOT CAUSE", es: "CAUSA RAÍZ" },
  fiberConcerns: { en: "FIBER CONCERNS", es: "PROBLEMAS DE FIBRA" },
  protocol: { en: "PROTOCOL", es: "PROTOCOLO" },
  proTip: { en: "PRO TIP", es: "CONSEJO PRO" },
  customerHandoffUpper: { en: "CUSTOMER HANDOFF", es: "RESPUESTA AL CLIENTE" },
  copiedUpper: { en: "COPIED", es: "COPIADO" },
  copyToClipboardUpper: { en: "COPY TO CLIPBOARD", es: "COPIAR AL PORTAPAPELES" },

  // ── Damage chips ──
  colorLoss: { en: "Color loss", es: "Pérdida de color" },
  yellowing: { en: "Yellowing", es: "Amarillamiento" },
  holeTear: { en: "Hole / tear", es: "Agujero / rasgadura" },
  textureChange: { en: "Texture change", es: "Cambio de textura" },
  shrinkage: { en: "Shrinkage", es: "Encogimiento" },
  pressMark: { en: "Press mark", es: "Marca de prensa" },
  solventRing: { en: "Solvent ring", es: "Anillo de solvente" },
  dyeBleed: { en: "Dye bleed", es: "Sangrado de tinte" },

  // ── Repairable badges ──
  repairable: { en: "REPAIRABLE", es: "REPARABLE" },
  partial: { en: "PARTIAL", es: "PARCIAL" },
  permanent: { en: "PERMANENT", es: "PERMANENTE" },
  uncertain: { en: "UNCERTAIN", es: "INCIERTO" },

  // ── Chemical Reference page ──
  chemicalReference: { en: "Chemical Reference", es: "Referencia de Químicos" },
  chemicalRefSubtitle: { en: "Professional cleaning agents, company directory, and fiber guides.", es: "Agentes de limpieza profesional, directorio de empresas y guías de fibras." },
  byAgent: { en: "By Agent", es: "Por Agente" },
  byCompany: { en: "By Company", es: "Por Empresa" },
  byFiber: { en: "By Fiber", es: "Por Fibra" },
  mechanism: { en: "MECHANISM", es: "MECANISMO" },
  safetyUpper: { en: "SAFETY", es: "SEGURIDAD" },
  brandProducts: { en: "BRAND PRODUCTS", es: "PRODUCTOS DE MARCA" },
  showLess: { en: "Show less", es: "Ver menos" },
  showAll: { en: "Show all", es: "Ver todos" },
  overview: { en: "Overview", es: "Descripción General" },
  productLines: { en: "Product Lines", es: "Líneas de Productos" },
  agentMapping: { en: "Agent Mapping", es: "Mapeo de Agentes" },
  fiberExpertise: { en: "Fiber Expertise", es: "Experiencia en Fibras" },
  distribution: { en: "Distribution", es: "Distribución" },
  gonrRelevance: { en: "GONR Relevance", es: "Relevancia GONR" },
  regions: { en: "Regions", es: "Regiones" },
  method: { en: "Method", es: "Método" },
  howToBuy: { en: "How to buy", es: "Cómo comprar" },
  protocolMapping: { en: "PROTOCOL MAPPING", es: "MAPEO DE PROTOCOLOS" },
  whenToRecommend: { en: "When to recommend", es: "Cuándo recomendar" },
  allFibers: { en: "← ALL FIBERS", es: "← TODAS LAS FIBRAS" },
  highRiskFiber: { en: "HIGH RISK FIBER", es: "FIBRA DE ALTO RIESGO" },
  keyConsiderations: { en: "KEY CONSIDERATIONS", es: "CONSIDERACIONES CLAVE" },
  recommendedCompanies: { en: "RECOMMENDED COMPANIES & PRODUCTS", es: "EMPRESAS Y PRODUCTOS RECOMENDADOS" },
  agentsToUse: { en: "AGENTS TO USE", es: "AGENTES A USAR" },
  agentsToAvoid: { en: "AGENTS TO AVOID", es: "AGENTES A EVITAR" },

  // ── Error messages ──
  solveFailed: { en: "Solve failed", es: "Error al resolver" },
  scanFailed: { en: "Scan failed", es: "Error al escanear" },
  somethingWentWrong: { en: "Something went wrong", es: "Algo salió mal" },

  // ── General ──
  loading: { en: "Loading...", es: "Cargando..." },
  noResults: { en: "No results found.", es: "No se encontraron resultados." },
  home: { en: "Home", es: "Inicio" },
  spotter: { en: "Spotter", es: "Spotter" },
  operator: { en: "Operator", es: "Operador" },

// ── TierGate ──────────────────────────────────────────────────
  tierGateSubtitle: { en: "Professional stain removal intelligence", es: "Inteligencia profesional para eliminación de manchas" },
  tierHome: { en: "Home", es: "Hogar" },
  tierSpotter: { en: "Spotter", es: "Spotter" },
  tierOperator: { en: "Operator", es: "Operador" },
  tierHomePrice: { en: "$9.99/mo", es: "$9.99/mes" },
  tierSpotterPrice: { en: "$49/mo", es: "$49/mes" },
  tierOperatorPrice: { en: "$99/mo", es: "$99/mes" },
  tierMostPopular: { en: "Most Popular", es: "Más Popular" },
  tierGetStarted: { en: "Get Started", es: "Comenzar" },
  tierFeatureDiyProtocols: { en: "DIY stain protocols", es: "Protocolos de manchas DIY" },
  tierFeatureProductRecs: { en: "Product recommendations", es: "Recomendaciones de productos" },
  tierFeatureBasicId: { en: "Basic stain identification", es: "Identificación básica de manchas" },
  tierFeatureEmailSupport: { en: "Email support", es: "Soporte por correo" },
  tierFeatureEverythingHome: { en: "Everything in Home", es: "Todo lo incluido en Hogar" },
  tierFeatureFullPro: { en: "Full pro spotting protocols", es: "Protocolos profesionales completos" },
  tierFeatureDeepSolve: { en: "Deep Solve AI analysis", es: "Análisis Deep Solve con IA" },
  tierFeatureHandoff: { en: "Customer handoff scripts", es: "Guiones de entrega al cliente" },
  tierFeatureStainBrain: { en: "Stain Brain chat", es: "Chat con Stain Brain" },
  tierFeaturePriority: { en: "Priority support", es: "Soporte prioritario" },
  tierFeatureEverythingSpotter: { en: "Everything in Spotter", es: "Todo lo incluido en Spotter" },
  tierFeatureUnlimitedDeep: { en: "Unlimited Deep Solve", es: "Deep Solve ilimitado" },
  tierFeatureTeam: { en: "Team accounts (up to 5)", es: "Cuentas de equipo (hasta 5)" },
  tierFeatureCustomLibrary: { en: "Custom protocol library", es: "Biblioteca de protocolos personalizada" },
  tierFeatureApi: { en: "API access", es: "Acceso API" },
  tierFeatureOnboarding: { en: "White-glove onboarding", es: "Incorporación personalizada" },

  // ── DeepSolveModule ───────────────────────────────────────────
  deepSolveChipOld: { en: "Stain is old", es: "Mancha antigua" },
  deepSolveChipTreated: { en: "Already treated", es: "Ya fue tratada" },
  deepSolveChipHighValue: { en: "High-value garment", es: "Prenda de alto valor" },
  deepSolveChipUpset: { en: "Customer is upset", es: "Cliente insatisfecho" },
  deepSolveGenerating: { en: "Generating tailored protocol...", es: "Generando protocolo personalizado..." },
  deepSolveGenerate: { en: "Generate Deep Solve Protocol", es: "Generar Protocolo Deep Solve" },
  deepSolveUnavailable: { en: "Deep Solve is currently unavailable. Please try again.", es: "Deep Solve no está disponible en este momento. Intenta de nuevo." },

  // ── StainChips / SurfaceChips ─────────────────────────────────
  cottonWhite: { en: "White / Light", es: "Blanco / Claro" },
  cottonColored: { en: "Colored / Dark", es: "Color / Oscuro" },

  // ── Error messages (additional) ───────────────────────────────
  handoffFailed: { en: "Failed to generate message", es: "Error al generar el mensaje" },

  // ── Collapsible section titles (ResultCard patch) ─────────────
  collapsibleHomeCare: { en: "Home Care Tips", es: "Consejos para el Hogar" },
  collapsibleChemistry: { en: "Chemistry Details", es: "Detalles Químicos" },
  collapsibleSafety: { en: "Safety Warnings", es: "Advertencias de Seguridad" },
  collapsibleProducts: { en: "Products", es: "Productos" },
  collapsibleEscalation: { en: "Escalation", es: "Escalación" },
  collapsibleMistakes: { en: "Common Mistakes", es: "Errores Comunes" },
  collapsibleSolvent: { en: "Solvent Note", es: "Nota de Solvente" },
  collapsibleHandoff: { en: "Customer Handoff", es: "Entrega al Cliente" },

  // ── Privacy page ──────────────────────────────────────────────
  privacyTitle: { en: "Privacy Policy", es: "Política de Privacidad" },
  privacyLastUpdated: { en: "Last updated", es: "Última actualización" },
  privacyIntro: {
    en: "GONR Labs (\"we\", \"us\") respects your privacy. This policy explains how we collect, use, and protect your information when you use the GONR application.",
    es: "GONR Labs (\"nosotros\") respeta su privacidad. Esta política explica cómo recopilamos, usamos y protegemos su información al usar la aplicación GONR."
  },
  privacyDataWeCollect: { en: "Information We Collect", es: "Información que Recopilamos" },
  privacyDataWeCollectContent: {
    en: "We collect your email address when you create an account, usage data such as stain queries and protocol views, and device information for performance optimization. We do not collect payment card details directly — all payments are processed by our third-party provider, Lemon Squeezy.",
    es: "Recopilamos su dirección de correo al crear una cuenta, datos de uso como consultas de manchas y vistas de protocolos, e información del dispositivo para optimización. No recopilamos datos de tarjetas de pago directamente — todos los pagos son procesados por nuestro proveedor externo, Lemon Squeezy."
  },
  privacyHowWeUse: { en: "How We Use Your Information", es: "Cómo Usamos Su Información" },
  privacyHowWeUseContent: {
    en: "We use your information to provide and improve the GONR service, deliver personalized stain removal protocols, process subscriptions, and send product updates. We do not sell your personal information to third parties.",
    es: "Usamos su información para proveer y mejorar el servicio GONR, entregar protocolos personalizados de eliminación de manchas, procesar suscripciones y enviar actualizaciones del producto. No vendemos su información personal a terceros."
  },
  privacyDataSharing: { en: "Data Sharing", es: "Compartir Datos" },
  privacyDataSharingContent: {
    en: "We share data only with service providers essential to operating GONR: hosting (Vercel), authentication (Supabase), payments (Lemon Squeezy), and AI processing (OpenAI). Each provider is bound by their own privacy policies and data processing agreements.",
    es: "Compartimos datos únicamente con proveedores esenciales para operar GONR: hosting (Vercel), autenticación (Supabase), pagos (Lemon Squeezy) y procesamiento de IA (OpenAI). Cada proveedor está sujeto a sus propias políticas de privacidad y acuerdos de procesamiento de datos."
  },
  privacySecurity: { en: "Security", es: "Seguridad" },
  privacySecurityContent: {
    en: "We use industry-standard encryption and security practices to protect your data. All connections use HTTPS. Authentication tokens are stored securely. However, no system is perfectly secure — we encourage you to use a strong, unique password.",
    es: "Usamos prácticas de seguridad y cifrado estándar de la industria para proteger sus datos. Todas las conexiones usan HTTPS. Los tokens de autenticación se almacenan de forma segura. Sin embargo, ningún sistema es perfectamente seguro — le recomendamos usar una contraseña fuerte y única."
  },
  privacyContact: { en: "Contact", es: "Contacto" },
  privacyContactContent: {
    en: "For privacy questions or data requests, email us at tyler@gonr.pro.",
    es: "Para preguntas sobre privacidad o solicitudes de datos, escríbanos a tyler@gonr.pro."
  },

  // ── Terms page ────────────────────────────────────────────────
  termsTitle: { en: "Terms of Service", es: "Términos de Servicio" },
  termsLastUpdated: { en: "Last updated", es: "Última actualización" },
  termsIntro: {
    en: "By using GONR, you agree to these terms. GONR is operated by Nexshift Inc. (\"we\", \"us\"), based in Fort Myers, FL.",
    es: "Al usar GONR, usted acepta estos términos. GONR es operado por Nexshift Inc. (\"nosotros\"), con sede en Fort Myers, FL."
  },
  termsUseOfService: { en: "Use of Service", es: "Uso del Servicio" },
  termsUseOfServiceContent: {
    en: "GONR provides AI-assisted stain removal protocols and cleaning intelligence. Protocols are informational guidance — always test on an inconspicuous area first. We are not liable for damage resulting from following any protocol. Professional situations require professional judgment.",
    es: "GONR provee protocolos de eliminación de manchas asistidos por IA e inteligencia de limpieza. Los protocolos son orientación informativa — siempre pruebe en un área no visible primero. No somos responsables por daños resultantes de seguir cualquier protocolo. Las situaciones profesionales requieren juicio profesional."
  },
  termsAccounts: { en: "Accounts", es: "Cuentas" },
  termsAccountsContent: {
    en: "You are responsible for maintaining the security of your account credentials. One account per person. Sharing accounts between operators requires an Operator tier subscription with team seats.",
    es: "Usted es responsable de mantener la seguridad de sus credenciales. Una cuenta por persona. Compartir cuentas entre operadores requiere una suscripción de nivel Operador con puestos de equipo."
  },
  termsPayments: { en: "Payments & Subscriptions", es: "Pagos y Suscripciones" },
  termsPaymentsContent: {
    en: "Subscriptions are billed monthly through Lemon Squeezy. You may cancel at any time — access continues through the end of your billing period. Refunds are handled on a case-by-case basis.",
    es: "Las suscripciones se facturan mensualmente a través de Lemon Squeezy. Puede cancelar en cualquier momento — el acceso continúa hasta el final de su período de facturación. Los reembolsos se manejan caso por caso."
  },
  termsIntellectualProperty: { en: "Intellectual Property", es: "Propiedad Intelectual" },
  termsIntellectualPropertyContent: {
    en: "GONR, its protocols, safety matrix, and AI models are proprietary to Nexshift Inc. Protected by 5 issued U.S. utility patents. You may not copy, redistribute, or reverse-engineer any part of the service.",
    es: "GONR, sus protocolos, matriz de seguridad y modelos de IA son propiedad de Nexshift Inc. Protegidos por 5 patentes de utilidad emitidas en EE.UU. No puede copiar, redistribuir ni realizar ingeniería inversa de ninguna parte del servicio."
  },
  termsLimitations: { en: "Limitations of Liability", es: "Limitaciones de Responsabilidad" },
  termsLimitationsContent: {
    en: "GONR is provided \"as is\" without warranty. We are not liable for indirect, incidental, or consequential damages. Our total liability is limited to the amount you paid in the 12 months before the claim.",
    es: "GONR se provee \"tal cual\" sin garantía. No somos responsables por daños indirectos, incidentales o consecuentes. Nuestra responsabilidad total se limita al monto pagado en los 12 meses anteriores a la reclamación."
  },
  termsContact: { en: "Contact", es: "Contacto" },
  termsContactContent: {
    en: "For questions about these terms, email tyler@gonr.pro.",
    es: "Para preguntas sobre estos términos, escriba a tyler@gonr.pro."
  },

  // ── Partners page ─────────────────────────────────────────────
  partnersTitle: { en: "Partner with GONR", es: "Asóciese con GONR" },
  partnersSubtitle: {
    en: "Built by a 3rd generation dry cleaner. 5 patents. 130+ expert protocols. Let's work together.",
    es: "Creado por un tintorero de tercera generación. 5 patentes. Más de 130 protocolos expertos. Trabajemos juntos."
  },
  partnersWhyPartner: { en: "Why Partner with GONR?", es: "¿Por Qué Asociarse con GONR?" },
  partnersWhyPartnerContent: {
    en: "GONR is the only AI-powered stain intelligence platform built by industry professionals. Our protocols are chemistry-grounded, surface-specific, and safety-validated against a comprehensive material compatibility matrix. We serve both professional dry cleaners and home consumers.",
    es: "GONR es la única plataforma de inteligencia de manchas con IA creada por profesionales de la industria. Nuestros protocolos están fundamentados en química, son específicos por superficie y validados contra una matriz integral de compatibilidad de materiales. Servimos tanto a tintorerías profesionales como a consumidores del hogar."
  },
  partnersModels: { en: "Partnership Models", es: "Modelos de Asociación" },
  partnersModelsContent: {
    en: "We offer brand integration partnerships for cleaning product companies, white-label licensing for multi-location dry cleaning operations, affiliate and referral programs, and co-marketing opportunities for industry events and publications.",
    es: "Ofrecemos asociaciones de integración de marca para empresas de productos de limpieza, licenciamiento de marca blanca para operaciones de tintorería con múltiples ubicaciones, programas de afiliados y referidos, y oportunidades de co-marketing para eventos y publicaciones de la industria."
  },
  partnersContact: { en: "Get in Touch", es: "Contáctenos" },
  partnersContactContent: {
    en: "Interested in partnering? Email tyler@gonr.pro with your company name and partnership idea.",
    es: "¿Interesado en asociarse? Escriba a tyler@gonr.pro con el nombre de su empresa y su propuesta de asociación."
  },

  // ── Misc additions ────────────────────────────────────────────
  surfaceLabel: { en: "Surface", es: "Superficie" },

  // ── TASK-127: Deep Solve upsell (ResultCard patch) ──
  deepSolveUpsellPrefix: { en: "Old stain, prior treatment, or high-value garment?", es: "¿Mancha antigua, tratada previamente, o prenda de alto valor?" },
  deepSolveUpsellLink: { en: "Deep Solve → (Operator)", es: "Deep Solve → (Operador)" },

  // ── TASK-127: Operator page ──
  operatorTitle: { en: "Operator", es: "Operador" },
  operatorSubtitle: { en: "Advanced tools for problem garments", es: "Herramientas avanzadas para prendas problemáticas" },

  // ── TASK-127: Progress bar ──
  progressSolve: { en: "Solve", es: "Solve" },
  progressDeepSolve: { en: "Deep Solve", es: "Deep Solve" },
  progressGarmentAnalysis: { en: "Analysis", es: "Análisis" },
  progressHandoff: { en: "Handoff", es: "Entrega" },

  // ── TASK-127: Deep Solve module ──
  deepSolveModuleTitle: { en: "Deep Solve", es: "Deep Solve" },
  deepSolveModuleSubtitle: { en: "Tailored analysis for complex cases", es: "Análisis personalizado para casos complejos" },
  deepSolvePlaceholder: { en: "Any other details — what they tried, how long ago, what you're seeing...", es: "Cualquier detalle adicional — qué intentaron, cuándo, qué observas..." },
  deepSolveRunButton: { en: "Run Deep Solve", es: "Ejecutar Deep Solve" },
  deepSolveRunning: { en: "Analyzing...", es: "Analizando..." },
  deepSolveLoaded: { en: "Loaded", es: "Cargado" },
  deepSolveEditContext: { en: "Edit", es: "Editar" },
  situationAssessment: { en: "Situation Assessment", es: "Evaluación de Situación" },
  modifiedProtocol: { en: "Modified Protocol", es: "Protocolo Modificado" },
  riskFactors: { en: "Risk Factors", es: "Factores de Riesgo" },
  outcomeScenarios: { en: "Outcome Scenarios", es: "Escenarios de Resultado" },
  outcomeBest: { en: "Best case", es: "Mejor escenario" },
  outcomeLikely: { en: "Likely case", es: "Escenario probable" },
  outcomeWorst: { en: "Worst case", es: "Peor escenario" },
  shouldYouProceed: { en: "Should you proceed?", es: "¿Debería proceder?" },
  recommendationProceed: { en: "Proceed", es: "Proceder" },
  recommendationCaution: { en: "Proceed with caution", es: "Proceder con precaución" },
  recommendationRelease: { en: "Recommend release", es: "Recomendar devolución" },

  // ── TASK-127: Situation chips ──
  chipStainOld: { en: "Stain is old", es: "Mancha antigua" },
  chipAlreadyTreated: { en: "Already treated", es: "Ya tratada" },
  chipHighValue: { en: "High-value garment", es: "Prenda de alto valor" },
  chipCustomerUpset: { en: "Customer upset", es: "Cliente molesto" },
  chipDelicateFiber: { en: "Delicate fiber", es: "Fibra delicada" },
  chipUnknownFiber: { en: "Unknown fiber", es: "Fibra desconocida" },
  chipDyeBleed: { en: "Dye bleed suspected", es: "Posible sangrado de tinte" },
  chipHeatDamage: { en: "Heat damage suspected", es: "Posible daño por calor" },

  // ── TASK-127: Garment Analysis module ──
  garmentAnalysisModuleTitle: { en: "Garment Analysis", es: "Análisis de Prenda" },
  garmentAnalysisModuleSubtitle: { en: "Photo assessment for damage, discoloration, and repair potential", es: "Evaluación fotográfica de daños, decoloración y potencial de reparación" },
  garmentAnalysisDescPlaceholder: { en: "Describe what you're seeing — discoloration, fiber damage, prior treatment marks...", es: "Describe lo que observas — decoloración, daño de fibra, marcas de tratamiento previo..." },
  garmentAnalysisButton: { en: "Analyze Garment", es: "Analizar Prenda" },
  garmentAnalysisRunning: { en: "Analyzing photo...", es: "Analizando foto..." },
  garmentTakePhoto: { en: "Take Photo", es: "Tomar Foto" },
  garmentSecondPhoto: { en: "Add Second Photo", es: "Agregar Segunda Foto" },
  repairability: { en: "Repairability", es: "Posibilidad de Reparación" },
  partiallyRepairable: { en: "Partially repairable", es: "Parcialmente reparable" },
  likelyPermanent: { en: "Likely permanent", es: "Probablemente permanente" },
  handoffScripts: { en: "Customer Handoff Scripts", es: "Guiones de Entrega al Cliente" },
  handoffImproved: { en: "Improved", es: "Mejorado" },
  handoffTough: { en: "Tough case", es: "Caso difícil" },
  handoffRelease: { en: "Release", es: "Devolución" },

  // ── TASK-127: Customer Handoff module (Operator version) ──
  handoffOperatorTitle: { en: "Customer Handoff", es: "Entrega al Cliente" },
  handoffOperatorSubtitle: { en: "What to say, word for word", es: "Qué decir, palabra por palabra" },
  handoffIntakeScript: { en: "Intake Script", es: "Guión de Recepción" },
  handoffTicketNotes: { en: "Ticket Notes", es: "Notas del Ticket" },
  handoffPickupScript: { en: "Pickup Script", es: "Guión de Entrega" },
  handoffWrittenNote: { en: "Written Note Template", es: "Plantilla de Nota Escrita" },
  toneConfident: { en: "Confident", es: "Confiado" },
  toneCautious: { en: "Cautious", es: "Cauteloso" },
  toneApologetic: { en: "Apologetic", es: "Disculpa" },
  toneRelease: { en: "Release", es: "Devolución" },
  generateHandoff: { en: "Generate Handoff Script", es: "Generar Guión de Entrega" },
  generatingHandoff: { en: "Generating...", es: "Generando..." },
  analyzeGarmentDamage: { en: "Analyze Garment Damage →", es: "Analizar Daño de Prenda →" },
  handoffContextLabel: { en: "Context", es: "Contexto" },
  handoffToneLabel: { en: "Tone", es: "Tono" },
  handoffNeedsContext: { en: "Run Deep Solve or Garment Analysis first, or enter context manually", es: "Ejecute Deep Solve o Análisis de Prenda primero, o ingrese contexto manualmente" },

  // ── Solve / Home page ──
  // ── ResultCard ──
  // ── Nav ──
  // ── Scan page ──
  // ── Pro Tools page ──
  // ── Profile page ──
  // ── Auth / Account ──
  // ── Tier / Subscription ──
  // ── Theme ──
  // ── Handoff Module ──
  // ── Garment Analysis ──
  // ── Damage chips ──
  // ── Repairable badges ──
  // ── Chemical Reference page ──
  // ── Auth / Login page ──
  loginFailedToSend: { en: "Failed to send login link", es: "Error al enviar el enlace de inicio de sesión" },
  loginCheckEmail: { en: "Check your email", es: "Revisa tu correo" },
  loginMagicLinkSent: { en: "We sent a magic link to", es: "Enviamos un enlace mágico a" },
  loginClickLink: { en: "Click the link in the email to sign in.", es: "Haz clic en el enlace del correo para iniciar sesión." },
  loginUseDifferentEmail: { en: "Use a different email", es: "Usar otro correo" },
  loginSignInTitle: { en: "Sign in to GONR", es: "Inicia sesión en GONR" },
  loginEnterEmailHint: { en: "Enter your email to sign in or create an account.", es: "Ingresa tu correo para iniciar sesión o crear una cuenta." },
  loginEmailPlaceholder: { en: "you@example.com", es: "tu@ejemplo.com" },
  loginSending: { en: "Sending...", es: "Enviando..." },
  loginSendMagicLink: { en: "Send Magic Link", es: "Enviar Enlace Mágico" },
  loginNoPasswordNeeded: { en: "No password needed. We\u2019ll email you a secure sign-in link.", es: "No necesitas contraseña. Te enviaremos un enlace seguro por correo." },
  // ── Auth / Callback page ──
  authErrorTitle: { en: "Authentication Error", es: "Error de Autenticación" },
  authTryAgain: { en: "Try again", es: "Intentar de nuevo" },
  authSigningIn: { en: "Signing you in...", es: "Iniciando sesión..." },
  authVerifyingCredentials: { en: "Please wait while we verify your credentials.", es: "Espera mientras verificamos tus credenciales." },
  // ── Deep Solve standalone page ──
  deepSolveStainPlaceholder: { en: "Blood on Silk, Coffee on Marble...", es: "Sangre en Seda, Café en Mármol..." },
  // ── Operator page (coming soon) ──
  operatorComingSoonSubtitle: { en: "Built for the plant owner who runs the whole operation", es: "Diseñado para el dueño de planta que dirige toda la operación" },
  operatorVisionQuote: { en: "One login. Every plant. Every spotter. Every garment — tracked, trained, and trusted.", es: "Un inicio de sesión. Cada planta. Cada spotter. Cada prenda — rastreada, capacitada y confiable." },
  operatorVisionAttribution: { en: "The GONR vision for Operator", es: "La visión de GONR para Operador" },
  operatorWhatsComingHeader: { en: "What\u2019s coming", es: "Lo que viene" },
  operatorFeature1Title: { en: "Garment Analysis", es: "Análisis de Prenda" },
  operatorFeature1Desc: { en: "AI photo assessment, root cause, repairability verdict", es: "Evaluación fotográfica con IA, causa raíz, veredicto de reparabilidad" },
  operatorFeature2Title: { en: "Legal-Shield Customer Handoff", es: "Entrega Documentada al Cliente" },
  operatorFeature2Desc: { en: "Documented intake scripts, ticket notes, and pickup communication that protects your shop", es: "Guiones documentados de recepción, notas de ticket y comunicación de entrega que protege tu tintorería" },
  operatorFeature3Title: { en: "Problem Garment Queue", es: "Cola de Prendas Problema" },
  operatorFeature3Desc: { en: "Spotters flag tough cases. You review, analyze, and action \u2014 from anywhere.", es: "Los spotters marcan casos difíciles. Tú revisas, analizas y actúas \u2014 desde cualquier lugar." },
  operatorFeature4Title: { en: "Team Seats", es: "Puestos de Equipo" },
  operatorFeature4Desc: { en: "Add spotters and counter staff under one account.", es: "Agrega spotters y personal de mostrador bajo una cuenta." },
  operatorFeature5Title: { en: "Training Dashboard", es: "Panel de Capacitación" },
  operatorFeature5Desc: { en: "Knowledge scores, protocol quiz results, and training progress across your entire team.", es: "Puntajes de conocimiento, resultados de evaluaciones y progreso de capacitación en todo tu equipo." },
  operatorFeature6Title: { en: "Multi-Location", es: "Múltiples Ubicaciones" },
  operatorFeature6Desc: { en: "Run multiple plants from one login.", es: "Administra múltiples plantas desde un solo inicio de sesión." },
  operatorGrandfatherNote: { en: "Early Spotter subscribers get grandfathered pricing", es: "Los suscriptores tempranos de Spotter conservan el precio original" },
  operatorGetSpotterCta: { en: "Get Spotter \u2014 $49/mo", es: "Obtener Spotter \u2014 $49/mes" },
  operatorBackToSpotter: { en: "\u2190 Back to Spotter tools", es: "\u2190 Volver a herramientas Spotter" },
  // ── Spotter page ──
  spotterSectionReference: { en: "Reference", es: "Referencia" },
  spotterSectionAiTools: { en: "AI Tools", es: "Herramientas IA" },
  spotterBack: { en: "Back to Spotter", es: "Volver a Spotter" },
  spotterChemRefDesc: { en: "Professional cleaning agents, solvents, and safety data.", es: "Agentes de limpieza profesional, solventes y datos de seguridad." },
  spotterChemCardsDesc: { en: "Quick-reference chemistry cards for common agents.", es: "Tarjetas de referencia rápida de química para agentes comunes." },
  spotterStainBrainDesc: { en: "Chat with GONR\u2019s AI about any stain scenario.", es: "Chatea con la IA de GONR sobre cualquier escenario de manchas." },
  spotterDeepSolveDesc: { en: "AI-powered deep analysis for complex stains.", es: "Análisis profundo con IA para manchas complejas." },
  spotterGarmentFlagDesc: { en: "Flag a garment for AI photo analysis and root cause.", es: "Marca una prenda para análisis fotográfico con IA y causa raíz." },
  // ── Handoff standalone page ──
  handoffPageSubtitle: { en: "Professional scripts for counter staff", es: "Guiones profesionales para personal de mostrador" },
  handoffGarmentLabel: { en: "Garment / Stain", es: "Prenda / Mancha" },
  handoffGarmentPlaceholder: { en: "e.g. Blood on linen, Wool suit", es: "ej. Sangre en lino, Traje de lana" },
  handoffSituationLabel: { en: "Situation", es: "Situación" },
  handoffNotesLabel: { en: "Additional notes (optional)", es: "Notas adicionales (opcional)" },
  handoffNotesPlaceholder: { en: "Any extra context for the script...", es: "Cualquier contexto adicional para el guion..." },
  // ── Profile page (extended) ──
  profileAccountLabel: { en: "Account", es: "Cuenta" },
  profileSignedIn: { en: "Signed in", es: "Sesión activa" },
  profileSignOut: { en: "Sign Out", es: "Cerrar Sesión" },
  profileSignInHint: { en: "Access your subscription from any device. No password needed.", es: "Accede a tu suscripción desde cualquier dispositivo. Sin contraseña." },
  profileMagicLinkSent: { en: "We sent a sign-in link to", es: "Enviamos un enlace de inicio de sesión a" },
  profileYourProfile: { en: "Your Profile", es: "Tu Perfil" },
  profileDisplayName: { en: "Display Name", es: "Nombre para Mostrar" },
  profileNamePlaceholder: { en: "Your name", es: "Tu nombre" },
  profileShopName: { en: "Shop / Plant Name", es: "Nombre de Tintorería / Planta" },
  profileShopPlaceholder: { en: "e.g. Jerry\u2019s Cleaners", es: "ej. Tintorería García" },
  profileRoleLabel: { en: "Role", es: "Rol" },
  profileRoleSpotter: { en: "Spotter", es: "Spotter" },
  profileRoleCounter: { en: "Counter", es: "Mostrador" },
  profileRoleOwner: { en: "Owner", es: "Dueño" },
  profileSaving: { en: "Saving...", es: "Guardando..." },
  profileSave: { en: "Save Profile", es: "Guardar Perfil" },
  profileSaved: { en: "\u2713 Saved", es: "\u2713 Guardado" },
  profileCredentialsTitle: { en: "Spotter Credentials", es: "Credenciales de Spotter" },
  profileCredentialsSubtitle: { en: "Track your certifications and professional development.", es: "Rastrea tus certificaciones y desarrollo profesional." },
  credDli: { en: "DLI Certification", es: "Certificación DLI" },
  credNca: { en: "NCA Membership", es: "Membresía NCA" },
  credYears: { en: "Years of Experience", es: "Años de Experiencia" },
  credSpecialties: { en: "Specialties", es: "Especialidades" },
  credPortfolio: { en: "Portfolio", es: "Portafolio" },
  credBadge: { en: "Verified Badge", es: "Insignia Verificada" },
  profileCredentialsCta: { en: "Build your reputation. Coming with Operator.", es: "Construye tu reputación. Disponible con Operador." },
  profileTrialStatus: { en: "Trial Status", es: "Estado de Prueba" },
  profileDaysRemaining: { en: "days remaining", es: "días restantes" },
  profileTrialExpired: { en: "Trial expired", es: "Prueba expirada" },
  profileUpgradeNow: { en: "Upgrade now \u2192", es: "Mejorar ahora \u2192" },
  profileUpgradeCta: { en: "Upgrade to Spotter \u2014 $49/mo", es: "Mejorar a Spotter \u2014 $49/mes" },
  profileUpgradeDesc: { en: "Unlock all pro tools, garment analysis, and customer handoff scripts.", es: "Desbloquea todas las herramientas pro, análisis de prendas y guiones de respuesta al cliente." },
  // ── Error messages ──
  // ── General ──

  // ── Saved Protocols / Bookmarks ──
  savedNav: { en: 'Saved', es: 'Guardados' },
  savedTitle: { en: 'Saved Protocols', es: 'Protocolos Guardados' },
  savedCount: { en: 'protocols', es: 'protocolos' },
  savedEmpty: { en: 'No saved protocols yet', es: 'Sin protocolos guardados' },
  savedEmptyHint: { en: 'Bookmark protocols from your solve results', es: 'Guarda protocolos desde tus resultados' },
  savedSignIn: { en: 'Sign in to save protocols', es: 'Inicia sesión para guardar protocolos' },
  savedDelete: { en: 'Delete', es: 'Eliminar' },
  savedCustomBadge: { en: 'Custom', es: 'Personalizado' },
  savedSave: { en: 'Save protocol', es: 'Guardar protocolo' },
  savedUnsave: { en: 'Remove from saved', es: 'Quitar de guardados' },
  savedLimitReached: { en: 'Free tier limited to 3 saved protocols. Upgrade to save more.', es: 'El plan gratuito permite solo 3 protocolos guardados. Mejora tu plan para guardar más.' },

  // ── Custom Protocol Form ──
  customTitle: { en: 'Create Custom Protocol', es: 'Crear Protocolo Personalizado' },
  customStain: { en: 'Stain', es: 'Mancha' },
  customStainPlaceholder: { en: 'e.g. Red wine, Grease, Ink...', es: 'ej. Vino tinto, Grasa, Tinta...' },
  customSurface: { en: 'Surface / Material', es: 'Superficie / Material' },
  customSurfacePlaceholder: { en: 'e.g. Cotton, Silk, Polyester...', es: 'ej. Algodón, Seda, Poliéster...' },
  customSteps: { en: 'Protocol Steps', es: 'Pasos del Protocolo' },
  customStepNum: { en: 'Step', es: 'Paso' },
  customAgentPlaceholder: { en: 'Agent (e.g. NSD, POG, Enzyme...)', es: 'Agente (ej. NSD, POG, Enzima...)' },
  customInstructionPlaceholder: { en: 'What to do — be specific', es: 'Qué hacer — sé específico' },
  customAddStep: { en: 'Add Step', es: 'Agregar Paso' },
  customRemove: { en: 'Remove', es: 'Eliminar' },
  customNotes: { en: 'Notes (optional)', es: 'Notas (opcional)' },
  customNotesPlaceholder: { en: 'e.g. We use Brand X instead of generic POG', es: 'ej. Usamos la marca X en vez de POG genérico' },
  customCreate: { en: 'Create Protocol', es: 'Crear Protocolo' },
  customCreating: { en: 'Creating...', es: 'Creando...' },
  customErrorRequired: { en: 'Stain and surface are required', es: 'Mancha y superficie son obligatorios' },
  customErrorSteps: { en: 'Add at least one step with instructions', es: 'Agrega al menos un paso con instrucciones' },
  customErrorAuth: { en: 'Sign in to create custom protocols', es: 'Inicia sesión para crear protocolos personalizados' },

  // ── Missing keys (TASK-SPANISH-FIX) ────────────────────────────
  deepSolveDetailPlaceholder: { en: 'Add details about the stain, prior treatments, garment value...', es: 'Agrega detalles sobre la mancha, tratamientos previos, valor de la prenda...' },
  deepSolveExpandCta: { en: 'Deep Solve — Tailored Protocol', es: 'Deep Solve — Protocolo Personalizado' },
  deepSolveFallback: { en: 'Unable to generate a Deep Solve protocol. Please try again.', es: 'No se pudo generar un protocolo Deep Solve. Inténtalo de nuevo.' },
  deepSolveGenerateBtn: { en: 'Generate Protocol', es: 'Generar Protocolo' },
  deepSolveModuleHeader: { en: 'Deep Solve Analysis', es: 'Análisis Deep Solve' },
  fabricDescription: { en: 'Fabric feel', es: 'Textura de la tela' },
  garmentLocation: { en: 'Stain location', es: 'Ubicación de la mancha' },
  stainHint: { en: 'Stain type', es: 'Tipo de mancha' },
  surfaceHint: { en: 'Surface / fabric', es: 'Superficie / tela' },
}

export function t(key: string, lang: string = 'en'): string {
  return strings[key]?.[lang] || strings[key]?.en || key
}
