// frontend/src/pages/Documentation.tsx
import  { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  BookOpen, Plus, Search, Edit3, Eye, 
  Trash2, FileText, Code2, Server, Database, Sparkles, 
  ChevronRight, ArrowLeft, Copy, Check, Info, FileCode2, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  title: string;
  color: string | null;
  description: string | null;
}

interface DocumentationDoc {
  id: string;
  title: string;
  content: string;
  category: 'DEVELOPMENT' | 'ARCHITECTURE' | 'DESIGN' | 'DATABASE' | 'OTHER';
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project?: {
    title: string;
    color: string | null;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'DEVELOPMENT', label: 'Desarrollo', icon: Code2, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  { id: 'ARCHITECTURE', label: 'Arquitectura', icon: Server, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { id: 'DESIGN', label: 'Diseño y UI', icon: Sparkles, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  { id: 'DATABASE', label: 'Base de Datos', icon: Database, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  { id: 'OTHER', label: 'Otros', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENTATION TEMPLATES (SOFT DEV ORIENTED)
// ─────────────────────────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'development',
    label: 'Guía de Desarrollo Local',
    category: 'DEVELOPMENT',
    title: 'Guía de Configuración y Desarrollo',
    content: `# Guía de Configuración y Desarrollo

## 🛠️ Requisitos Previos
Antes de comenzar, asegúrate de tener instalado:
- **Node.js** v18 o superior
- **NPM** o **Yarn**
- **Git**

## 🚀 Instalación y Setup
Sigue estos pasos para levantar el entorno de desarrollo:

1. Clonar el repositorio:
\`\`\`bash
git clone https://github.com/tu-usuario/proyecto.git
cd proyecto
\`\`\`

2. Instalar dependencias:
\`\`\`bash
npm install
\`\`\`

3. Configurar variables de entorno:
\`\`\`bash
cp .env.example .env
\`\`\`
*(Edita el archivo \`.env\` con tus credenciales locales)*

## 📦 Scripts Disponibles
- \`npm run dev\` - Inicia el servidor de desarrollo local
- \`npm run build\` - Compila el proyecto para producción
- \`npm run lint\` - Ejecuta las comprobaciones de estilo de código

## 🌿 Flujo de Git (Workflow)
- Ramas de desarrollo: \`feature/nombre-feature\`, \`bugfix/nombre-bug\`
- Realizar Pull Requests (PR) siempre hacia la rama \`main\` o \`develop\`.
- Cada Commit debe seguir el estándar *Conventional Commits*:
  - \`feat: agregar autenticación con JWT\`
  - \`fix: corregir cálculo de racha en hábitos\`
`
  },
  {
    id: 'architecture',
    label: 'Arquitectura de Software',
    category: 'ARCHITECTURE',
    title: 'Arquitectura del Sistema',
    content: `# Arquitectura del Sistema y Componentes

## 🏗️ Patrón de Arquitectura
Este proyecto utiliza una **Arquitectura en Capas** (Layered Architecture) que fomenta la separación de conceptos y la modularidad de la base de código.

### Estructura de Directorios
\`\`\`
/src
  /config       # Inicializaciones de servicios (Prisma, Cloud, etc.)
  /modules      # Dominios de negocio estructurados (Auth, Proyectos, Tareas...)
    /controller # Controladores HTTP que procesan req y res
    /routes     # Definiciones de endpoints express
  /shared       # Middlewares y utilidades del sistema reutilizables
\`\`\`

## 🔄 Flujo de Datos
1. El usuario realiza una petición HTTP que pasa por los **Middlewares de Autenticación** y Seguridad.
2. Las **Rutas** reciben la petición y la delegan al **Controlador** correspondiente.
3. El **Controlador** valida el cuerpo utilizando esquemas de **Zod** y consulta el modelo ORM (PrismaClient).
4. El resultado refinado se devuelve en JSON de alta claridad.

## 📡 Tecnologías de la Pila (Stack)
- **Framework:** Express con TypeScript (Native Type Stripping)
- **Base de datos:** SQLite con Prisma ORM
- **Validación:** Zod
`
  },
  {
    id: 'database',
    label: 'Diseño de Base de Datos (ER)',
    category: 'DATABASE',
    title: 'Modelado y Diseño de Base de Datos',
    content: `# Modelado de Base de Datos (ER)

## 🗄️ Resumen del Motor
- **Base de datos:** SQLite (Entorno de desarrollo y pruebas locales)
- **Herramienta ORM:** Prisma Client para tipado estricto y migraciones controladas.

## 📉 Modelo Entidad Relación (Tablas Clave)

### 1. Modelo \`User\`
Representa las cuentas del sistema que poseen todo el ámbito de datos.
- \`id\` (String, PK, cuid)
- \`email\` (String, Único)
- \`password\` (String, hash bcrypt)
- \`name\` (String)

### 2. Modelo \`Project\`
Representa los contenedores principales de tareas y documentación.
- \`id\` (String, PK)
- \`title\` (String)
- \`description\` (String, Nullable)
- \`userId\` (String, FK -> User)

### 3. Modelo \`ProjectDocumentation\`
Espacio de documentación directa de un desarrollo específico.
- \`id\` (String, PK)
- \`title\` (String)
- \`content\` (String, Markdown)
- \`category\` (String, Enum: DEVELOPMENT, ARCHITECTURE, etc.)
- \`projectId\` (String, FK -> Project)

## ⚙️ Migraciones Comunes
Para aplicar cambios en el esquema:
\`\`\`bash
npx prisma db push # Entornos de prueba ligeros
npx prisma migrate dev --name descripcion_cambio # Producción
\`\`\`
`
  },
  {
    id: 'design',
    label: 'Tokens de Diseño y UI',
    category: 'DESIGN',
    title: 'Guía de Estilos y Diseño Visual',
    content: `# Guía de Estilos y Diseño Visual

## 🎚️ Tokens de UI
Este producto adopta una interfaz de contraste óptimo enfocada en diseño oscuro sobrio (Slate Concept).

### Paleta de Colores
- **Fondo Primario:** \`bg-background\` (#0b0f19 - Slate nocturno profundo)
- **Contenedor:** \`bg-surface-container\` (#1e293b / #151e2e)
- **Acento Primario:** \`text-primary\` (#4d8eff / Indigo brillante)
- **Texto Principal:** \`text-on-surface\` (#f8fafc)
- **Texto Desvanecido:** \`text-on-surface-variant\` (#94a3b8)

## 🔠 Tipografía y Jerarquías
- **Display Headings:** *Inter* / *Space Grotesk* con tracking ajustado (\`tracking-tight font-black\`).
- **Logos / Títulos de Tarjetas:** *Geist* bold con espaciado de balance (\`font-extrabold\`).
- **Código / Datos Técnicos:** *JetBrains Mono* con un look brutalista ligero (\`font-mono text-xs\`).

## 🧩 Principios de Diseño
- **Espacio Negativo Extenso:** Dejar respirar los elementos para evitar saturación de datos en pantalla.
- **Rodeamientos:** Border radius amplios en tarjetas (\`rounded-2xl\` de 16px) y botones (\`rounded-xl\` de 12px).
- **Retroalimentación Dinámica:** Hover con transiciones suaves (\`transition-all duration-300\`).
`
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// HTML MARKDOWN CONVERTER (SECURE RENDER)
// ─────────────────────────────────────────────────────────────────────────────

function renderMarkdownToHtml(text: string): string {
  if (!text) return '';
  
  return text
    // Escape HTML básico para prevenir inyección de scripts
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    
    // Code blocks con clases e identificadores elegantes
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-950/80 border border-outline-variant/15 rounded-xl p-4 text-xs font-mono my-4 overflow-x-auto whitespace-pre text-emerald-400 custom-scrollbar leading-relaxed"><code>$1</code></pre>')
    
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-surface-container-highest px-1.5 py-0.5 rounded text-xs font-mono text-amber-300 font-medium">$1</code>')
    
    // Negritas e Itálicas
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    
    // Encabezados limpios con tags semánticos
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-black text-on-surface tracking-wide uppercase mt-6 mb-2 flex items-center gap-2 border-b border-outline-variant/10 pb-1">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 class="text-md font-bold text-primary mt-8 mb-3 border-b border-outline-variant/15 pb-1 flex items-center gap-1">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 class="text-2xl font-black text-on-surface tracking-tight mt-10 mb-4">$1</h1>')
    
    // Línea horizontal
    .replace(/^---$/gm, '<hr class="border-outline-variant/10 my-6"/>')
    
    // Blockquote estilizado
    .replace(/^> (.+)$/gm, '<div class="border-l-4 border-primary/50 bg-primary/4 pl-4 py-2.5 pr-2 my-4 rounded-r-xl italic text-on-surface-variant">$1</div>')
    
    // Listas desordenadas con viñetas elegantes
    .replace(/^[-*] (.+)$/gm, '<div class="flex items-start gap-2 my-1.5 text-sm text-on-surface-variant"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span><span>$1</span></div>')
    
    // Listas ordenadas con numeración elegante
    .replace(/^\d+\. (.+)$/gm, '<div class="flex items-start gap-2 my-1.5 text-sm text-on-surface-variant"><span class="text-xs font-black text-primary shrink-0 mt-0.5">✓</span><span>$1</span></div>')
    
    // Párrafos dobles
    .replace(/\n\n+/g, '</p><p class="mb-4 leading-relaxed text-on-surface-variant">');
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function Documentation() {
  const [searchParams] = useSearchParams();
  const initProjectId = searchParams.get('projectId');

  const [projects, setProjects] = useState<Project[]>([]);
  const [docs, setDocs] = useState<DocumentationDoc[]>([]);
  
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [activeDoc, setActiveDoc] = useState<DocumentationDoc | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Create / Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editDoc, setEditDoc] = useState<Partial<DocumentationDoc> | null>(null);
  
  // Statuses
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch initial Projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const list = await api.projects.list();
        setProjects(list);
        
        if (list.length > 0) {
          const match = initProjectId && list.some((p: Project) => p.id === initProjectId);
          setSelectedProjectId(match ? initProjectId as string : list[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching projects:', err);
        setError('Error al cargar proyectos del sistema.');
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [initProjectId]);

  // Fetch documentations when project selection changes
  useEffect(() => {
    if (!selectedProjectId) return;
    
    const fetchDocs = async () => {
      try {
        setLoadingDocs(true);
        const data = await api.documentation.list(selectedProjectId);
        setDocs(data);
        
        // Auto-select first doc inside category or all
        if (data.length > 0) {
          setActiveDoc(data[0]);
        } else {
          setActiveDoc(null);
        }
      } catch (err) {
        console.error('Error fetching docs:', err);
      } finally {
        setLoadingDocs(false);
      }
    };
    
    fetchDocs();
  }, [selectedProjectId]);

  // Current active project
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Filter & Search Documentations
  const filteredDocs = useMemo(() => {
    return docs.filter(doc => {
      const matchCategory = selectedCategory === 'ALL' || doc.category === selectedCategory;
      const matchSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.content.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [docs, selectedCategory, searchQuery]);

  // Reset active doc if it's no longer in the filtered list
  useEffect(() => {
    if (activeDoc && !filteredDocs.some(d => d.id === activeDoc.id)) {
      if (filteredDocs.length > 0) {
        setActiveDoc(filteredDocs[0]);
      } else {
        setActiveDoc(null);
      }
    } else if (!activeDoc && filteredDocs.length > 0) {
      setActiveDoc(filteredDocs[0]);
    }
  }, [filteredDocs, activeDoc]);

  // Copy to clipboard helper
  const handleCopy = () => {
    if (!activeDoc) return;
    navigator.clipboard.writeText(activeDoc.content);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Export to markdown file
  const handleExport = () => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeDoc.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Quick template insertion
  const handleApplyTemplate = (templateContent: string, templateTitle: string) => {
    if (editDoc) {
      setEditDoc(prev => ({
        ...prev,
        title: prev.title || templateTitle,
        content: templateContent,
      }));
    }
  };

  // Start creating new doc
  const handleNewDoc = () => {
    setEditDoc({
      title: '',
      content: '',
      category: 'DEVELOPMENT',
      projectId: selectedProjectId,
    });
    setIsEditing(true);
  };

  // Start editing existing doc
  const handleEditActive = () => {
    if (!activeDoc) return;
    setEditDoc(activeDoc);
    setIsEditing(true);
  };

  // Save creation/updates
  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoc || !editDoc.title?.trim() || !editDoc.projectId) return;

    try {
      if (editDoc.id) {
        // Update
        const updated = await api.documentation.update(editDoc.id, {
          title: editDoc.title,
          content: editDoc.content || '',
          category: editDoc.category,
          projectId: editDoc.projectId,
        });
        
        setDocs(prev => prev.map(d => d.id === updated.id ? updated : d));
        setActiveDoc(updated);
      } else {
        // Create
        const created = await api.documentation.create({
          title: editDoc.title,
          content: editDoc.content || '',
          category: editDoc.category,
          projectId: editDoc.projectId,
        });

        setDocs(prev => [created, ...prev]);
        setActiveDoc(created);
      }
      setIsEditing(false);
      setEditDoc(null);
    } catch (err) {
      console.error('Error saving documentation:', err);
      alert('Error al guardar el documento.');
    }
  };

  // Delete documentation
  const handleDeleteDoc = async (id: string) => {
    if (!window.confirm('¿Seguro de que deseas eliminar este documento de especificaciones?')) return;
    
    try {
      await api.documentation.delete(id);
      setDocs(prev => prev.filter(d => d.id !== id));
      setActiveDoc(prev => prev && prev.id === id ? null : prev);
    } catch (err) {
      console.error('Error deleting doc:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-on-surface flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-primary" />
            Documentación de Software
          </h1>
          <p className="text-xs text-on-surface-variant font-medium mt-1">
            Lleva un registro claro de desarrollos, flujos, DB y arquitectura alineada a tus proyectos.
          </p>
        </div>

        {/* PROJECT SWITCHER */}
        <div className="flex items-center gap-2 bg-surface-container/80 border border-outline-variant/15 p-1 rounded-2xl">
          <span className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest pl-3">
            Proyecto:
          </span>
          {loadingProjects ? (
            <div className="h-9 w-40 bg-surface-container-highest animate-pulse rounded-xl" />
          ) : projects.length === 0 ? (
            <span className="text-xs text-amber-400 font-bold px-3">Ningún proyecto creado</span>
          ) : (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent border-0 text-xs font-bold text-on-surface focus:ring-0 cursor-pointer pr-8 py-1.5 focus:outline-none"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-surface-container-high text-on-surface font-semibold">
                  🚀 {p.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {projects.length === 0 && !loadingProjects ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-container border border-outline-variant/15 rounded-3xl text-center space-y-4 max-w-xl mx-auto mt-6">
          <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
            <Info className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-on-surface">No tienes proyectos asignados</h3>
          <p className="text-xs text-on-surface-variant max-w-md">
            La documentación de software está directamente relacionada a los proyectos activos. Crea un proyecto primero para poder documentar su arquitectura, diseño y guías.
          </p>
          <a
            href="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-on-primary text-xs font-bold rounded-xl hover:bg-primary-hover transition-all"
          >
            Ir a Proyectos
          </a>
        </div>
      ) : isEditing ? (
        /* ─────────────────────────────────────────────────────────────────────
           DOC EDITOR & WRITER
           ───────────────────────────────────────────────────────────────────── */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container border border-outline-variant/15 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-outline-variant/15 px-6 py-4 bg-surface-container-low">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditDoc(null);
              }}
              className="flex items-center gap-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <span className="text-[10px] font-black tracking-widest text-primary uppercase">
              {editDoc?.id ? 'EDITANDO ESPECIFICACIÓN' : 'NUEVO ARTÍCULO DE DOCUMENTACIÓN'}
            </span>
          </div>

          <form onSubmit={handleSaveDoc} className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
              {/* Left Form controls */}
              <div className="md:col-span-8 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/75">
                    Título de la Sección o Detalle
                  </label>
                  <input
                    type="text"
                    required
                    value={editDoc?.title || ''}
                    onChange={(e) => setEditDoc(p => p ? { ...p, title: e.target.value } : null)}
                    placeholder="Ej. Arquitectura de Servicios de Autenticación, Esquema Prisma"
                    className="w-full bg-surface-container-high border border-outline-variant/15 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/45 transition-all text-on-surface"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/75">
                      Categoría de Enfoque
                    </label>
                    <select
                      value={editDoc?.category || 'DEVELOPMENT'}
                      onChange={(e) => setEditDoc(p => p ? { ...p, category: e.target.value as any } : null)}
                      className="w-full bg-surface-container-high border border-outline-variant/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/45 text-on-surface"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/75">
                      Asociar al Proyecto
                    </label>
                    <select
                      value={editDoc?.projectId || ''}
                      onChange={(e) => setEditDoc(p => p ? { ...p, projectId: e.target.value } : null)}
                      className="w-full bg-surface-container-high border border-outline-variant/15 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-primary/45 text-on-surface"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Software Architect Templates panel */}
              <div className="md:col-span-4 bg-surface-container-high/60 border border-outline-variant/10 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <h4 className="text-[10px] font-black tracking-widest text-primary uppercase mb-2 flex items-center gap-1">
                    <FileCode2 className="w-3.5 h-3.5" />
                    Plantillas de Ingeniería
                  </h4>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mb-3">
                    Asigna un esqueleto de desarrollo óptimo dependiendo de tu objetivo de documentación.
                  </p>
                  
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                    {TEMPLATES.map(tmpl => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl.content, tmpl.title)}
                        className="w-full text-left bg-surface-container-high text-xs font-semibold px-3 py-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all duration-200 border border-outline-variant/5 flex items-center justify-between"
                      >
                        <span>{tmpl.label}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 text-[10px] text-on-surface-variant/65 flex items-center gap-1 bg-surface-container-highest/40 p-2 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span>Se cargará una plantilla con estructura de Markdown.</span>
                </div>
              </div>
            </div>

            {/* Split Markdown Editor Pane */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
              {/* TEXT EDITOR */}
              <div className="lg:col-span-6 space-y-1 flex flex-col h-[400px]">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/75 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-primary" />
                    Contenido (Soporta Markdown)
                  </label>
                  <span className="text-[9px] font-mono text-on-surface-variant/40">
                    {editDoc?.content?.length || 0} caract.
                  </span>
                </div>
                <textarea
                  value={editDoc?.content || ''}
                  onChange={(e) => setEditDoc(p => p ? { ...p, content: e.target.value } : null)}
                  placeholder="# Título del Módulo&#10;&#10;## Arquitectura&#10;- Capa de Controladores..."
                  className="w-full flex-1 bg-surface-container-high border border-outline-variant/15 rounded-xl p-4 font-mono text-xs focus:outline-none focus:border-primary/45 resize-none leading-relaxed text-on-surface"
                />
              </div>

              {/* REAL-TIME HTML PREVIEW */}
              <div className="lg:col-span-6 space-y-1 flex flex-col h-[400px]">
                <label className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/75 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  Previsualización de Documento
                </label>
                <div 
                  className="w-full flex-1 bg-slate-950/20 border border-outline-variant/10 rounded-xl p-4 overflow-y-auto custom-scrollbar prose prose-invert max-w-none prose-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(editDoc?.content || '*Comienza a escribir sobre el proyecto usando markdown para previsualizar aquí.*') }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant/10">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setEditDoc(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-on-surface bg-surface-container-high hover:bg-surface-container-highest transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-on-primary bg-primary hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 flex items-center gap-1 bg-gradient-to-r from-primary to-primary-hover cursor-pointer"
              >
                Guardar Documento
              </button>
            </div>
          </form>
        </motion.div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────────
           DEFAULT EXPLORER & VIEWER
           ───────────────────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: FILTERS & DOCUMENT LIST */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Quick Actions & Search */}
            <div className="bg-surface-container border border-outline-variant/15 p-4 rounded-3xl space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black tracking-widest text-on-surface-variant/40 uppercase">
                  Explorador de Docs
                </span>
                <button
                  type="button"
                  onClick={handleNewDoc}
                  className="px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-primary hover:text-on-primary text-xs font-black rounded-xl text-primary transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nuevo artículo
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-40" />
                <input
                  type="text"
                  placeholder="Buscar temas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/15 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary/40 text-on-surface transition-all placeholder:text-on-surface-variant/55"
                />
              </div>

              {/* Simple Category Tabs */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('ALL')}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border transition-all cursor-pointer',
                    selectedCategory === 'ALL'
                      ? 'bg-on-surface text-background border-on-surface'
                      : 'bg-surface-container-high text-on-surface-variant/70 border-outline-variant/10 hover:border-outline-variant/30'
                  )}
                >
                  Todos
                </button>
                {CATEGORIES.map(cat => {
                  const CatIcon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wide border transition-all flex items-center gap-1 cursor-pointer',
                        isSelected
                          ? cn(cat.bg, cat.border, cat.color, 'border-current')
                          : 'bg-surface-container-high text-on-surface-variant/70 border-outline-variant/10 hover:border-outline-variant/30'
                      )}
                    >
                      <CatIcon className="w-3 h-3" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Documentations List (grouped/filtered) */}
            <div className="bg-surface-container border border-outline-variant/15 rounded-3xl p-4 overflow-hidden shadow-sm">
              <span className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.16em]">
                Especificaciones ({filteredDocs.length})
              </span>

              {loadingDocs ? (
                <div className="space-y-2.5 mt-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 w-full bg-surface-container-high animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : filteredDocs.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-2">
                  <FileText className="w-8 h-8 text-on-surface-variant/20 mx-auto" />
                  <p className="text-xs font-bold text-on-surface-variant/80">No hay documentos cargados</p>
                  <p className="text-[11px] text-on-surface-variant/40 leading-relaxed">
                    Comienza creando una hoja de arquitectura, bases de datos o checklist de desarrollo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mt-3 max-h-[480px] overflow-y-auto custom-scrollbar pr-1">
                  <AnimatePresence mode="popLayout">
                    {filteredDocs.map(doc => {
                      const catConfig = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[4];
                      const CatIcon = catConfig.icon;
                      const isActive = activeDoc?.id === doc.id;

                      return (
                        <motion.button
                          key={doc.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          type="button"
                          onClick={() => setActiveDoc(doc)}
                          className={cn(
                            'w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer',
                            isActive 
                              ? 'bg-surface-container-high border-primary/30 shadow-[0_4px_12px_rgba(var(--primary),0.02)] scale-[1.01]' 
                              : 'bg-surface-container-low/60 border-outline-variant/5 hover:border-outline-variant/25'
                          )}
                        >
                          <div className="flex items-start gap-2.5 w-full">
                            <div className={cn('p-1.5 rounded-xl shrink-0', catConfig.bg, catConfig.color)}>
                              <CatIcon className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className={cn('text-xs font-bold leading-snug truncate', isActive ? 'text-primary' : 'text-on-surface')}>
                                {doc.title}
                              </h4>
                              <p className="text-[10px] text-on-surface-variant/60 mt-1 uppercase font-bold tracking-wider">
                                {catConfig.label}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL: RICH PREVIEW / ACTIVE VIEW */}
          <div className="lg:col-span-8">
            {activeDoc ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.99 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-surface-container border border-outline-variant/15 rounded-3xl p-6 lg:p-8 flex flex-col h-full shadow-lg"
              >
                {/* Active Header controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-outline-variant/15 gap-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'p-2.5 rounded-2xl border flex items-center justify-center shrink-0',
                      CATEGORIES.find(c => c.id === activeDoc.category)?.bg || 'bg-primary/10',
                      CATEGORIES.find(c => c.id === activeDoc.category)?.color || 'text-primary',
                      CATEGORIES.find(c => c.id === activeDoc.category)?.border || 'border-primary/10'
                    )}>
                      {React.createElement(CATEGORIES.find(c => c.id === activeDoc.category)?.icon || FileText, { className: "w-5 h-5" })}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-primary">
                          {CATEGORIES.find(c => c.id === activeDoc.category)?.label || 'OTROS'}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/30">&bull;</span>
                        <span className="text-[10px] text-on-surface-variant/50 font-semibold uppercase">
                          Modificado: {new Date(activeDoc.updatedAt || activeDoc.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-on-surface leading-tight mt-0.5">
                        {activeDoc.title}
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Copy */}
                    <button
                      type="button"
                      aria-label="Copiar Markdown"
                      onClick={handleCopy}
                      className="p-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/12 text-on-surface-variant hover:text-on-surface rounded-xl transition-all cursor-pointer relative"
                      title="Copiar Markdown"
                    >
                      {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {/* Export File */}
                    <button
                      type="button"
                      aria-label="Exportar archivo Markdown"
                      onClick={handleExport}
                      className="p-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/12 text-on-surface-variant hover:text-on-surface rounded-xl transition-all cursor-pointer relative"
                      title="Descargar .md"
                    >
                      <Download className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={handleEditActive}
                      className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container-highest border border-outline-variant/15 text-xs font-bold rounded-xl text-on-surface transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary" />
                      Editar
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteDoc(activeDoc.id)}
                      className="p-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-400 hover:text-on-primary rounded-xl transition-all cursor-pointer"
                      title="Eliminar especificación"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Markdown View Area */}
                <div className="flex-1 py-6 overflow-y-auto custom-scrollbar">
                  <div 
                    className="prose prose-invert prose-emerald max-w-none prose-sm leading-relaxed" 
                    dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(activeDoc.content) }}
                  />
                </div>

                <div className="pt-4 border-t border-outline-variant/10 text-[10px] text-on-surface-variant/20 flex justify-between items-center bg-surface-container-low/20 px-4 py-2 rounded-xl">
                  <span>Asociado a: <strong className="text-on-surface-variant/40">🚀 {activeDoc.project?.title || activeProject?.title || 'Proyecto'}</strong></span>
                  <span>ID: {activeDoc.id}</span>
                </div>
              </motion.div>
            ) : (
              <div className="bg-surface-container border border-outline-variant/15 rounded-3xl p-16 flex flex-col items-center justify-center text-center space-y-4 h-full shadow-inner">
                <div className="p-4 bg-primary/10 rounded-full text-primary border border-primary/20">
                  <BookOpen className="w-10 h-10 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-on-surface text-lg">Especificaciones de Software</h3>
                  <p className="text-xs text-on-surface-variant max-w-md mt-1.5 leading-relaxed">
                    Selecciona un documento de la lista lateral o crea uno nuevo para registrar diagramas, esquemas SQL, rutas de integración, y variables globales del desarrollo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleNewDoc}
                  className="px-4 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-on-primary border border-primary/20 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Escribir primer documento
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
