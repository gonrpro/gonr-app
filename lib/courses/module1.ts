export interface Lesson {
  id: string
  title: string
  titleEs: string
  icon: string
  objective: string
  objectiveEs: string
  sections: {
    heading: string
    headingEs: string
    body: string
    bodyEs: string
    visual?: 'decision-loop' | 'tip' | 'warning' | 'scenario' | 'key-concept'
  }[]
  keyTakeaway: string
  keyTakeawayEs: string
}

export interface QuizQuestion {
  id: string
  type: 'multiple-choice' | 'true-false' | 'scenario'
  question: string
  questionEs: string
  options: { text: string; textEs: string }[]
  correctIndex: number
  explanation: string
  explanationEs: string
  points: number
}

export const MODULE_1_META = {
  id: 'module-1',
  number: 1,
  title: "The Spotter's Mindset",
  titleEs: 'La Mentalidad del Spotter',
  description: 'Understand what spotting really is, why it matters, and the decision framework that guides every treatment.',
  descriptionEs: 'Comprende qué es realmente el spotting, por qué importa y el marco de decisión que guía cada tratamiento.',
  icon: '🧠',
  color: '#22c55e',
  lessonCount: 4,
  estimatedMinutes: 15,
  passThreshold: 0.8,
}

export const MODULE_1_LESSONS: Lesson[] = [
  {
    id: 'l1',
    title: 'What Is Spotting?',
    titleEs: '¿Qué Es el Spotting?',
    icon: '🔍',
    objective: 'Define spotting and understand why it is the highest-skill role in the plant.',
    objectiveEs: 'Definir el spotting y entender por qué es el rol de mayor habilidad en la planta.',
    sections: [
      {
        heading: 'More Than Cleaning',
        headingEs: 'Más Que Limpiar',
        body: 'Spotting is not cleaning. Cleaning puts a garment through a machine. Spotting is the targeted, chemical-level removal of a specific substance from a specific fiber — without damaging either. It requires chemistry knowledge, fiber awareness, and judgment under pressure.',
        bodyEs: 'El spotting no es limpiar. Limpiar es poner una prenda en una máquina. El spotting es la eliminación dirigida, a nivel químico, de una sustancia específica de una fibra específica — sin dañar ninguna. Requiere conocimiento de química, conciencia de fibras y juicio bajo presión.',
        visual: 'key-concept',
      },
      {
        heading: 'The Highest-Skill Role',
        headingEs: 'El Rol de Mayor Habilidad',
        body: 'In most dry cleaning plants, the spotter is the most skilled person on the floor. You are the one who saves garments that machines cannot. You are the one customers never see but always depend on. A great spotter prevents claims, protects reputation, and builds customer trust — one stain at a time.',
        bodyEs: 'En la mayoría de las tintorerías, el spotter es la persona más habilidosa. Tú eres quien salva prendas que las máquinas no pueden. Eres a quien los clientes nunca ven pero siempre dependen. Un gran spotter previene reclamos, protege la reputación y construye la confianza del cliente — una mancha a la vez.',
        visual: 'tip',
      },
      {
        heading: 'Art + Science',
        headingEs: 'Arte + Ciencia',
        body: 'Spotting is both art and science. The science is chemistry — knowing which agent breaks which bond. The art is judgment — knowing how much pressure, how long to dwell, when to stop, and when to say "this one needs to go to the next level." Both can be learned. That is why you are here.',
        bodyEs: 'El spotting es arte y ciencia. La ciencia es la química — saber qué agente rompe qué enlace. El arte es el juicio — saber cuánta presión, cuánto tiempo de acción, cuándo parar y cuándo decir "esta necesita ir al siguiente nivel." Ambos se pueden aprender. Por eso estás aquí.',
        visual: 'key-concept',
      },
    ],
    keyTakeaway: 'Spotting is targeted chemical work on specific stains and fibers. It is the highest-skill role in the plant.',
    keyTakeawayEs: 'El spotting es trabajo químico dirigido en manchas y fibras específicas. Es el rol de mayor habilidad en la planta.',
  },
  {
    id: 'l2',
    title: "The Spotter's Decision Loop",
    titleEs: 'El Ciclo de Decisión del Spotter',
    icon: '🔄',
    objective: 'Learn the 5-step framework that guides every spotting decision.',
    objectiveEs: 'Aprende el marco de 5 pasos que guía cada decisión de spotting.',
    sections: [
      {
        heading: 'The 5 Steps',
        headingEs: 'Los 5 Pasos',
        body: 'Every stain, every time: Observe → Identify → Test → Treat → Verify. This loop is your anchor. When you are unsure, return to step one. When a treatment is not working, return to step two. The loop keeps you safe and keeps you moving forward.',
        bodyEs: 'Cada mancha, cada vez: Observar → Identificar → Probar → Tratar → Verificar. Este ciclo es tu ancla. Cuando no estés seguro, vuelve al paso uno. Cuando un tratamiento no funcione, vuelve al paso dos. El ciclo te mantiene seguro y avanzando.',
        visual: 'decision-loop',
      },
      {
        heading: '1. Observe',
        headingEs: '1. Observar',
        body: 'Look at the stain under good light. What color is it? Is it raised or flat? Wet or dry? How old does it look? Look at the garment — what fiber? What color? Any existing damage? Your eyes tell you more than any chemical will.',
        bodyEs: 'Mira la mancha bajo buena luz. ¿De qué color es? ¿Está elevada o plana? ¿Húmeda o seca? ¿Qué tan vieja se ve? Mira la prenda — ¿qué fibra? ¿Qué color? ¿Hay daño existente? Tus ojos te dicen más que cualquier químico.',
      },
      {
        heading: '2. Identify',
        headingEs: '2. Identificar',
        body: 'Based on what you see, classify the stain into its family: protein, tannin, dye, oil/grease, combination, or oxidized. This tells you which chemistry to reach for. Wrong identification = wrong agent = potential damage.',
        bodyEs: 'Basándote en lo que ves, clasifica la mancha en su familia: proteína, tanino, tinte, aceite/grasa, combinación u oxidada. Esto te dice qué química usar. Identificación incorrecta = agente incorrecto = daño potencial.',
      },
      {
        heading: '3. Test',
        headingEs: '3. Probar',
        body: 'Always test on an inconspicuous area first. Apply a small amount of your chosen agent. Wait. Check for color change, bleeding, or fiber damage. This 30-second step prevents 90% of damage claims.',
        bodyEs: 'Siempre prueba en un área no visible primero. Aplica una pequeña cantidad del agente elegido. Espera. Verifica cambio de color, sangrado o daño a la fibra. Este paso de 30 segundos previene el 90% de los reclamos por daño.',
        visual: 'warning',
      },
      {
        heading: '4. Treat',
        headingEs: '4. Tratar',
        body: 'Apply the agent. Work from the outside of the stain toward the center to prevent spreading. Use the right technique — tamping, brushing, or flushing — for the stain and fiber. Be patient. Dwell time matters more than pressure.',
        bodyEs: 'Aplica el agente. Trabaja desde el exterior de la mancha hacia el centro para evitar que se extienda. Usa la técnica correcta — tamponear, cepillar o enjuagar — para la mancha y la fibra. Sé paciente. El tiempo de acción importa más que la presión.',
      },
      {
        heading: '5. Verify',
        headingEs: '5. Verificar',
        body: 'Check the result under good light. Is the stain gone? Is there any new damage? Any ring marks? If the stain remains, go back to step 2 and reconsider your identification. Know when to stop — over-treatment causes more damage than most stains.',
        bodyEs: 'Verifica el resultado bajo buena luz. ¿Se fue la mancha? ¿Hay daño nuevo? ¿Marcas de anillo? Si la mancha persiste, vuelve al paso 2 y reconsidera tu identificación. Sabe cuándo parar — el sobre-tratamiento causa más daño que la mayoría de las manchas.',
        visual: 'tip',
      },
    ],
    keyTakeaway: 'Observe → Identify → Test → Treat → Verify. When in doubt, return to step one.',
    keyTakeawayEs: 'Observar → Identificar → Probar → Tratar → Verificar. Ante la duda, vuelve al paso uno.',
  },
  {
    id: 'l3',
    title: 'Why Stains Are Your Reputation',
    titleEs: 'Por Qué las Manchas Son Tu Reputación',
    icon: '⭐',
    objective: 'Understand the business impact of spotting quality on customer trust and shop reputation.',
    objectiveEs: 'Comprender el impacto comercial de la calidad del spotting en la confianza del cliente y la reputación del negocio.',
    sections: [
      {
        heading: 'One Stain, One Customer',
        headingEs: 'Una Mancha, Un Cliente',
        body: 'A customer brings in a garment with a stain. If you remove it perfectly, they come back for years. If you damage the garment, they never come back — and they tell 10 friends. In dry cleaning, your reputation is built one garment at a time.',
        bodyEs: 'Un cliente trae una prenda con una mancha. Si la eliminas perfectamente, regresa por años. Si dañas la prenda, nunca regresa — y le dice a 10 amigos. En la tintorería, tu reputación se construye una prenda a la vez.',
        visual: 'scenario',
      },
      {
        heading: 'The Cost of a Mistake',
        headingEs: 'El Costo de un Error',
        body: 'A damaged garment does not just cost the replacement value. It costs the customer relationship, future revenue, and your shop\'s reputation. A $200 silk blouse you damage could cost $2,000 in lost business over the next year. Prevention is always cheaper than a claim.',
        bodyEs: 'Una prenda dañada no solo cuesta el valor de reemplazo. Cuesta la relación con el cliente, ingresos futuros y la reputación de tu negocio. Una blusa de seda de $200 que dañes podría costar $2,000 en negocio perdido durante el próximo año. La prevención siempre es más barata que un reclamo.',
      },
      {
        heading: 'The Power of "I Don\'t Know Yet"',
        headingEs: 'El Poder de "Aún No Sé"',
        body: 'The best spotters are not the ones who treat everything. They are the ones who know when to pause, research, or escalate. Saying "let me look into this" is a sign of expertise, not weakness. Rushing causes damage. Patience builds trust.',
        bodyEs: 'Los mejores spotters no son los que tratan todo. Son los que saben cuándo pausar, investigar o escalar. Decir "déjame investigar esto" es señal de experiencia, no de debilidad. Apurarse causa daño. La paciencia construye confianza.',
        visual: 'tip',
      },
    ],
    keyTakeaway: 'Every garment is a relationship. Treat it like your reputation depends on it — because it does.',
    keyTakeawayEs: 'Cada prenda es una relación. Trátala como si tu reputación dependiera de ello — porque así es.',
  },
  {
    id: 'l4',
    title: 'The #1 Rule: Test First',
    titleEs: 'La Regla #1: Prueba Primero',
    icon: '🧪',
    objective: 'Master the pre-test process that prevents damage before it happens.',
    objectiveEs: 'Dominar el proceso de pre-prueba que previene el daño antes de que ocurra.',
    sections: [
      {
        heading: 'Why Testing Is Non-Negotiable',
        headingEs: 'Por Qué Probar No Es Negociable',
        body: 'No matter how confident you are, no matter how many times you have treated this exact stain — test first. Dyes vary between manufacturers. Fiber blends are not always labeled correctly. A garment you treated safely yesterday could react differently today. Test. Every. Time.',
        bodyEs: 'No importa qué tan seguro estés, no importa cuántas veces hayas tratado esta misma mancha — prueba primero. Los tintes varían entre fabricantes. Las mezclas de fibras no siempre están etiquetadas correctamente. Una prenda que trataste con seguridad ayer podría reaccionar diferente hoy. Prueba. Cada. Vez.',
        visual: 'warning',
      },
      {
        heading: 'Where to Test',
        headingEs: 'Dónde Probar',
        body: 'Find a hidden area: inside seam, under collar, inside hem, under a pocket flap. Apply a small drop of your agent. Press with a white cloth. Wait 30 seconds. Check the cloth for any color transfer. Check the fabric for any change in texture, sheen, or color.',
        bodyEs: 'Busca un área oculta: costura interior, debajo del cuello, dentro del dobladillo, debajo de la solapa del bolsillo. Aplica una pequeña gota del agente. Presiona con un paño blanco. Espera 30 segundos. Revisa el paño por transferencia de color. Revisa la tela por cambios en textura, brillo o color.',
      },
      {
        heading: 'What You\'re Looking For',
        headingEs: 'Qué Estás Buscando',
        body: 'Color transfer to the white cloth (dye bleed). Color change on the fabric (lightening or darkening). Texture change (stiffening, softening, roughness). Ring marks or water spots. Any of these = STOP. Choose a different agent or escalate.',
        bodyEs: 'Transferencia de color al paño blanco (sangrado de tinte). Cambio de color en la tela (aclaramiento u oscurecimiento). Cambio de textura (rigidez, ablandamiento, aspereza). Marcas de anillo o manchas de agua. Cualquiera de estos = DETENTE. Elige un agente diferente o escala.',
        visual: 'key-concept',
      },
      {
        heading: 'When Testing Saves You',
        headingEs: 'Cuando la Prueba Te Salva',
        body: 'Real scenario from the plant: A spotter tested hydrogen peroxide on a "white" silk blouse. The test area turned yellow — the fabric had an optical brightener that reacted with the bleach. Without that test, the entire front of the blouse would have yellowed. Thirty seconds of testing saved a $400 garment and a customer relationship.',
        bodyEs: 'Escenario real de la planta: Un spotter probó peróxido de hidrógeno en una blusa de seda "blanca." El área de prueba se puso amarilla — la tela tenía un blanqueador óptico que reaccionó con el blanqueador. Sin esa prueba, todo el frente de la blusa se habría puesto amarillo. Treinta segundos de prueba salvaron una prenda de $400 y una relación con el cliente.',
        visual: 'scenario',
      },
    ],
    keyTakeaway: 'Test first. Every time. No exceptions. Thirty seconds of testing prevents thousands in damage.',
    keyTakeawayEs: 'Prueba primero. Cada vez. Sin excepciones. Treinta segundos de prueba previenen miles en daños.',
  },
]

export const MODULE_1_QUIZ: QuizQuestion[] = [
  {
    id: 'q1',
    type: 'multiple-choice',
    question: 'A customer brings in a silk blouse with a coffee stain. What is your FIRST action?',
    questionEs: 'Un cliente trae una blusa de seda con una mancha de café. ¿Cuál es tu PRIMERA acción?',
    options: [
      { text: 'Apply tannin formula immediately', textEs: 'Aplicar fórmula de tanino inmediatamente' },
      { text: 'Flush with hot water', textEs: 'Enjuagar con agua caliente' },
      { text: 'Observe the stain and identify the fiber', textEs: 'Observar la mancha e identificar la fibra' },
      { text: 'Apply neutral lubricant', textEs: 'Aplicar lubricante neutro' },
    ],
    correctIndex: 2,
    explanation: 'Always start with Step 1: Observe. Before touching any chemical, assess the stain type, fiber, and garment condition. On silk especially, rushing to treat can cause irreversible damage.',
    explanationEs: 'Siempre comienza con el Paso 1: Observar. Antes de tocar cualquier químico, evalúa el tipo de mancha, la fibra y la condición de la prenda. En seda especialmente, apurarse a tratar puede causar daño irreversible.',
    points: 10,
  },
  {
    id: 'q2',
    type: 'true-false',
    question: 'If you have successfully treated the same stain type many times, you can skip the pre-test on familiar garments.',
    questionEs: 'Si has tratado exitosamente el mismo tipo de mancha muchas veces, puedes saltarte la pre-prueba en prendas familiares.',
    options: [
      { text: 'True', textEs: 'Verdadero' },
      { text: 'False', textEs: 'Falso' },
    ],
    correctIndex: 1,
    explanation: 'False. Never skip testing. Dyes vary between manufacturers, blends are not always labeled correctly, and garments that look identical can react differently. Test every time.',
    explanationEs: 'Falso. Nunca saltes la prueba. Los tintes varían entre fabricantes, las mezclas no siempre están etiquetadas correctamente, y prendas que se ven idénticas pueden reaccionar diferente. Prueba cada vez.',
    points: 10,
  },
  {
    id: 'q3',
    type: 'multiple-choice',
    question: 'What is the correct order of the Spotter\'s Decision Loop?',
    questionEs: '¿Cuál es el orden correcto del Ciclo de Decisión del Spotter?',
    options: [
      { text: 'Test → Treat → Observe → Identify → Verify', textEs: 'Probar → Tratar → Observar → Identificar → Verificar' },
      { text: 'Observe → Identify → Test → Treat → Verify', textEs: 'Observar → Identificar → Probar → Tratar → Verificar' },
      { text: 'Identify → Test → Treat → Observe → Verify', textEs: 'Identificar → Probar → Tratar → Observar → Verificar' },
      { text: 'Treat → Verify → Test → Observe → Identify', textEs: 'Tratar → Verificar → Probar → Observar → Identificar' },
    ],
    correctIndex: 1,
    explanation: 'Observe → Identify → Test → Treat → Verify. This sequence ensures you understand what you are dealing with before you touch a chemical.',
    explanationEs: 'Observar → Identificar → Probar → Tratar → Verificar. Esta secuencia asegura que entiendas con qué estás tratando antes de tocar un químico.',
    points: 10,
  },
  {
    id: 'q4',
    type: 'scenario',
    question: 'You are treating a stain and it is not coming out after two attempts. What should you do?',
    questionEs: 'Estás tratando una mancha y no sale después de dos intentos. ¿Qué deberías hacer?',
    options: [
      { text: 'Apply more pressure and try again', textEs: 'Aplicar más presión e intentar de nuevo' },
      { text: 'Switch to a stronger bleach', textEs: 'Cambiar a un blanqueador más fuerte' },
      { text: 'Go back to Step 2 and reconsider your stain identification', textEs: 'Volver al Paso 2 y reconsiderar tu identificación de la mancha' },
      { text: 'Tell the customer it cannot be removed', textEs: 'Decirle al cliente que no se puede quitar' },
    ],
    correctIndex: 2,
    explanation: 'When a treatment is not working, the most common reason is misidentification. Return to Step 2 (Identify) and reconsider which stain family you are dealing with. A different identification leads to a different agent.',
    explanationEs: 'Cuando un tratamiento no funciona, la razón más común es la identificación incorrecta. Vuelve al Paso 2 (Identificar) y reconsidera con qué familia de manchas estás tratando. Una identificación diferente lleva a un agente diferente.',
    points: 10,
  },
  {
    id: 'q5',
    type: 'multiple-choice',
    question: 'Where is the best place to perform a pre-test on a garment?',
    questionEs: '¿Cuál es el mejor lugar para hacer una pre-prueba en una prenda?',
    options: [
      { text: 'Directly on the stain to see how the agent reacts', textEs: 'Directamente en la mancha para ver cómo reacciona el agente' },
      { text: 'On a hidden area like an inside seam or under the collar', textEs: 'En un área oculta como una costura interior o debajo del cuello' },
      { text: 'On a similar fabric you have in the shop', textEs: 'En una tela similar que tengas en el negocio' },
      { text: 'Testing is only needed for silk and wool', textEs: 'La prueba solo es necesaria para seda y lana' },
    ],
    correctIndex: 1,
    explanation: 'Always test on a hidden area of the actual garment: inside seam, under collar, inside hem, or under a pocket flap. Testing on different fabric is not reliable — even identical-looking garments can react differently.',
    explanationEs: 'Siempre prueba en un área oculta de la prenda real: costura interior, debajo del cuello, dentro del dobladillo o debajo de la solapa del bolsillo. Probar en otra tela no es confiable — incluso prendas que se ven idénticas pueden reaccionar diferente.',
    points: 10,
  },
]
