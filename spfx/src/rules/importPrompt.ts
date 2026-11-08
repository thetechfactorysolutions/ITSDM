import { toDayKey } from './dates';

export type PromptLanguage = 'en' | 'es';

const TEMPLATE = `{
  "meeting": { "title": "", "date": "YYYY-MM-DD", "summary": "", "attendees": ["email or name"] },
  "ideas": [ { "title": "", "description": "", "owner": "", "estimatedValue": 0, "targetDate": "", "tags": [] } ],
  "initiatives": [ { "title": "", "description": "", "owner": "", "targetDate": "" } ],
  "projects": [ { "title": "", "description": "", "owner": "", "initiative": "exact title of an initiative", "startDate": "", "endDate": "", "budget": 0, "forecast": 0, "riskLevel": "LOW" } ],
  "actions": [ { "title": "", "description": "", "owner": "", "dueDate": "", "priority": "MEDIUM", "project": "exact title of a project", "initiative": "exact title of an initiative" } ],
  "risks": [ { "title": "", "description": "", "owner": "", "probability": "MEDIUM", "impact": "MEDIUM", "mitigation": "", "dueDate": "", "project": "exact title of a project", "initiative": "exact title of an initiative" } ],
  "decisions": [ { "title": "", "description": "context", "rationale": "why this option", "decidedBy": "", "project": "exact title of a project", "initiative": "exact title of an initiative" } ],
  "lessons": [ { "title": "", "description": "what happened", "recommendation": "what to do next time", "category": "PROCESS", "owner": "", "project": "exact title of a project", "initiative": "exact title of an initiative" } ],
  "notes": [ { "title": "", "body": "", "category": "INFO", "project": "exact title of a project", "initiative": "exact title of an initiative" } ]
}`;

/**
 * The instruction the user copies into their own AI together with the transcript. It fixes the
 * output format the importer understands, so keep it in step with transcriptImport.ts.
 * `today` lets the AI turn "next Friday" into a real date when the meeting has no date.
 */
export const buildImportPrompt = (language: PromptLanguage, today: Date = new Date()): string => {
  const day = toDayKey(today);

  if (language === 'es') {
    return `Actúa como asistente de gestión de TI. Te paso la transcripción de una reunión. Extrae SOLO lo que se dijo de verdad y devuelve ÚNICAMENTE un objeto JSON válido (sin texto antes ni después, sin comentarios) con esta estructura:

${TEMPLATE}

Reglas:
- Usa exactamente esos nombres de campo. Si una sección no tiene nada, devuelve [] en ella. No inventes datos.
- Las fechas van en formato AAAA-MM-DD. Resuelve expresiones como "el viernes" o "la semana que viene" a partir de la fecha de la reunión; si no se sabe, usa la de hoy (${day}).
- "owner": el email si aparece en la transcripción; si no, el nombre tal como se dijo; si no se dijo, déjalo vacío.
- "priority" y "riskLevel": LOW, MEDIUM, HIGH o CRITICAL. "probability" e "impact" de los riesgos: LOW, MEDIUM o HIGH. "category" de las notas: DECISION, RISK, INFO o FOLLOW_UP. "category" de las lecciones: PROCESS, TECHNOLOGY, PEOPLE, VENDOR u OTHER.
- Qué va en cada sección: "actions" = tareas concretas con alguien que las hace; "projects" = trabajos con alcance propio; "initiatives" = programas grandes que agrupan proyectos; "ideas" = propuestas todavía sin decidir; "risks" = cosas que podrían salir mal; "decisions" = decisiones ya tomadas (con su motivo y quién la tomó); "lessons" = aprendizajes para la próxima vez; "notes" = información a tener en cuenta y seguimientos que no encajan en lo anterior.
- Títulos cortos (menos de 100 caracteres) y claros. Escribe los textos en el idioma de la transcripción.
- Para vincular, "initiative" y "project" deben repetir EXACTAMENTE el título de un elemento de este mismo JSON (o de uno que ya conozcas).
- No incluyas estados: la aplicación los asigna.

TRANSCRIPCIÓN:
[pega aquí la transcripción]`;
  }

  return `Act as an IT management assistant. I am giving you the transcript of a meeting. Extract ONLY what was really said and return ONLY one valid JSON object (no text before or after, no comments) with this structure:

${TEMPLATE}

Rules:
- Use exactly these field names. If a section has nothing, return [] for it. Do not invent data.
- Dates use the format YYYY-MM-DD. Resolve expressions such as "on Friday" or "next week" from the meeting date; if it is unknown, use today (${day}).
- "owner": the email if it appears in the transcript; otherwise the name as it was said; if nobody was named, leave it empty.
- "priority" and "riskLevel": LOW, MEDIUM, HIGH or CRITICAL. Risk "probability" and "impact": LOW, MEDIUM or HIGH. Note "category": DECISION, RISK, INFO or FOLLOW_UP. Lesson "category": PROCESS, TECHNOLOGY, PEOPLE, VENDOR or OTHER.
- What goes where: "actions" = concrete tasks that someone will do; "projects" = pieces of work with their own scope; "initiatives" = large programmes that group projects; "ideas" = proposals not yet decided; "risks" = things that could go wrong; "decisions" = decisions already taken (with the reason and who took it); "lessons" = learnings for next time; "notes" = information to keep in mind and follow-ups that do not fit the others.
- Short, clear titles (under 100 characters). Write the texts in the language of the transcript.
- To link items, "initiative" and "project" must repeat EXACTLY the title of an item in this same JSON (or one you already know).
- Do not include statuses: the application sets them.

TRANSCRIPT:
[paste the transcript here]`;
};
