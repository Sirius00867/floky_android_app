# Dislexic_App - Centro de Mando Digital

## Visión
App gamificada, visual, completamente accesible para adolescentes con **dislexia** y **diabetes tipo 1**. Sistema híbrido: digital para recordatorios, visual para reducir carga lectora, gamificado para sostener motivación.

## Stack Técnico
- **Frontend**: React Native + Expo
- **Estado**: Redux Toolkit + Redux Persist (offline-first)
- **UI**: React Native Paper + custom components
- **BD Local**: SQLite (expo-sqlite v10+)
- **Notificaciones**: Expo Notifications (local)
- **Text-to-Speech**: expo-speech

## Estructura del Proyecto

```
src/
├── app/                    # Expo Router (auto-generated)
├── components/
│   └── shared/             # Componentes reutilizables
│       └── DyslexiaText.tsx # Componente base (text-to-speech)
├── constants/
│   └── theme.ts           # Colores, tipografía, espaciado
├── db/
│   └── schema.ts          # SQLite schema + inicialización
├── store/
│   ├── store.ts           # Redux store + persistencia
│   └── slices/            # Redux slices
│       ├── healthSlice.ts
│       ├── studySlice.ts
│       ├── homeSlice.ts
│       ├── relationSlice.ts
│       ├── gamificationSlice.ts
│       └── uiSlice.ts
├── navigation/            # Navegación (En desarrollo Fase 0)
├── screens/               # Screens por módulo (En desarrollo Fase 1A)
├── services/              # Servicios (notificaciones, base datos, etc.)
├── utils/                 # Utilidades
└── hooks/                 # Hooks custom
```

## Módulos Principales (Fase 1A MVP)

### 1. HEALTH (Diabetes Management)
- Glucose Logger (entrada rápida, histórico 24h)
- Daily Protocol (6 fases circadianas)
- Autonomy Levels (1-3 progresivas)
- Visual feedback (gráficos, colores)

### 2. STUDY (Bloques Adaptados a Dislexia)
- Pomodoro Adaptado (15-20 min)
- Task Breakdown (máx 5 pasos)
- Focus Stats (racha semanal)
- Herramientas integradas (temporizador, resumen, break reminder)

### 3. DASHBOARD (Resumen Semanal)
- Grid 2x2 (Health, Study, Home, Relation)
- Semáforo próximas acciones
- Contador puntos visible
- Quick add buttons

### 4. GAMIFICACIÓN MVP
- Puntos por esfuerzo (+10 glucosa, +15 bloque, +10 rutina, etc.)
- Misiones diarias (3 fijas inicialmente)
- Contador de puntos global
- (Recompensas TIER 1-5 = Fase 2)

**NO incluir en MVP**:
- Home Module (Fase 2)
- Relation Module (Fase 2)
- Auth/Login (Fase 3)
- Multi-usuario (Fase 3)
- Parent Dashboard (Fase 3)
- CGM real (Simulado inicialmente)

## Diseño & Accesibilidad

### Tipografía (Para Dislexia)
- **Fuente**: OpenDyslexic (libre) o Atkinson Hyperlegible
- **Tamaños**: H1 28px, H2 22px, H3 18px, Body 16px, Small 14px, Caption 12px
- **Line-height**: 1.5+ (mínimo 1.6 en body)
- **Letter-spacing**: +0.5px en body
- **Contraste**: 4.5:1 WCAG AA (text #212121 sobre blanco)
- **Botones**: mínimo 48x48pt
- **Sin justify**: siempre left-aligned
- **Máximo 70-80 caracteres por línea**

### Colores
- Verde (#4CAF50): Completado
- Amarillo (#FFC107): Pendiente
- Rojo (#F44336): Urgente
- Azul (#2196F3): Información
- Gris (#9E9E9E): Deshabilitado

### Componentes Accesibles
- `DyslexiaText`: Text-to-speech integrado, línea-height, letra-spacing
- `CardModule`: Cards con iconografía + texto
- `ChecklistItem`: 44x44pt checkbox
- `TimerDisplay`: Barra circular, números grandes
- Todos sin animaciones distractoras

## Flujo de Datos Redux

```
UI → dispatch(action) → Reducer → Store → Redux Persist → AsyncStorage (SQLite en futuro)
```

## Fases de Implementación

### FASE 0: Setup Inicial ✅ (En progreso)
- ✅ Proyecto Expo creado
- ✅ Dependencias instaladas
- ✅ Carpeta estructura creada
- ⏳ theme.ts
- ⏳ store.ts + slices
- ⏳ DyslexiaText.tsx
- ⏳ schema.ts SQLite
- ⏳ Navegación tab-based (AppNavigator.tsx)

**Status**: ~60% completo. Falta navegación y conectar Redux.

### FASE 1A: MVP Core (Próximo)
**Semana 1-2: Health Module**
- Glucose Logger
- Daily Protocol checklist
- Redux + SQLite persistence

**Semana 2-3: Study Module**
- Pomodoro Timer
- Task Breakdown
- Focus Stats

**Semana 3-4: Dashboard + Gamification**
- Dashboard Grid 2x2
- Contador puntos
- Misiones diarias

### FASE 1B: Pulir MVP
- Testing con usuarios piloto
- Accesibilidad verificada
- Bugs resueltos

### FASE 2: Full Features
- Home Module (rutinas)
- Relation Module (chat diario, reporte semanal)
- Gamificación completa (TIER 1-5, recompensas)
- Autonomy Levels 2-3 funcionales

### FASE 3: Familia & Integración
- Auth/Login local
- Multi-usuario
- Parent Dashboard
- HealthKit/Google Fit (opcional)

### FASE 4: Producción
- Beta testing (TestFlight, Google Play Internal)
- Publicación oficial

## Configuración para Desarrollo

```bash
npm install
npm run web      # Web preview (Expo)
npm run ios      # iOS (requiere macOS)
npm run android  # Android (requiere Android Studio)
```

## Testing Strategy

### MVP (Fase 1B)
- Manual testing: 2-3 adolescentes + padres
- Sesiones diarias 1h
- Feedback loop iterativo
- Métricas: 0 crashes, glucosa <2 min, offline-first funciona

### Usuarios Piloto
- Estrategia: Paralelo (contactar mientras se desarrolla Fase 0-1A)
- Fase 1B: Testing intensivo (sesiones 1h diarias)
- Feedback incorporado en Fase 2

## Restricciones Críticas

### Autonomía Progresiva
- NO es control parental invasivo
- Transición cada 2 semanas si cumple 80%+
- Desbloqueada como recompensa gamification
- Padres = "observadores no invasivos"

### Gamificación Sin Presión
- Puntos por **esfuerzo**, no resultados
- Registró glucosa = +10 pts (sea alto/bajo)
- Misión no completada = no gana puntos (sin castigo)
- Autonomía = recompensa suprema

### Privacidad & Offline-First
- Redux Persist → SQLite local
- Datos médicos no se envían sin consentimiento (Fase 3+)
- Queue-based sync cuando hay WiFi
- Borrado seguro de históricos (90 días)

## URLs & Recursos

- **Plan detallado**: Véase `C:\Users\diego\.claude\plans\haz-un-plan-para-buzzing-noodle.md`
- **Expo Docs**: https://docs.expo.dev
- **Redux Toolkit**: https://redux-toolkit.js.org
- **React Native Paper**: https://callstack.github.io/react-native-paper

## Checklist Próximos Pasos

- [ ] Completar navegación TabNavigator (AppNavigator.tsx)
- [ ] Conectar Redux store a app principal
- [ ] Crear primera screen (GlucoseLogger)
- [ ] Verificar Redux DevTools
- [ ] Setup SQLite inicialización
- [ ] Test Pomodoro Timer
- [ ] Contactar usuarios piloto (paralelo)

## Notas de Desarrollo

- Usar `DyslexiaText` como componente base para todo texto
- Máximo 5-7 pasos por tarea (restricción dislexia)
- Iconografía + texto (nunca solo iconos)
- Offline-first: siempre pensar en persistencia
- Gamificación: puntos por esfuerzo, no perfección
