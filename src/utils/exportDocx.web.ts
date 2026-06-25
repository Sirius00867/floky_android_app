import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType,
} from 'docx';

interface ExportData {
  userName: string;
  dateStr: string;
  colorScheme: string;
  displayMode: string;
  gamificationEnabled: boolean;
  subjects: { icon: string; label: string }[];
  readings: any[];
  sessions: any[];
  points: number;
  streak: number;
}

export async function generateDocxBlob(data: ExportData): Promise<Blob | null> {
  const {
    userName, dateStr, colorScheme, displayMode, gamificationEnabled,
    subjects, readings, sessions, points, streak,
  } = data;

  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1000, bottom: 1000, left: 1200, right: 1200 } } },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 160 },
          children: [new TextRun({ text: 'floky', bold: true, size: 64, color: '4F46E5' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: 'Exportación de datos personales', size: 28, color: '6B7280' })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [new TextRun({ text: `${userName || 'Sin nombre'} · ${dateStr}`, size: 22, color: '9CA3AF' })],
        }),
        new Paragraph({ text: '' }),

        new Paragraph({ text: '1. PERFIL Y CONFIGURACIÓN', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
        new Paragraph({ text: `Nombre: ${userName}`, spacing: { after: 60 } }),
        new Paragraph({ text: `Tema: ${colorScheme === 'dark' ? 'Oscuro' : 'Claro'}`, spacing: { after: 60 } }),
        new Paragraph({ text: `Modo: ${displayMode === 'dyslexia' ? 'Dislexia' : 'Normal'}`, spacing: { after: 60 } }),
        new Paragraph({ text: `Gamificación: ${gamificationEnabled ? 'Sí' : 'No'}`, spacing: { after: 240 } }),

        new Paragraph({ text: '2. ASIGNATURAS DE ESTUDIO', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
        ...subjects.map(s => new Paragraph({ text: `${s.icon} ${s.label}`, spacing: { after: 60 } })),
        new Paragraph({ text: '' }),

        new Paragraph({ text: '3. REGISTROS DE GLUCOSA', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
        new Paragraph({ text: `Total: ${readings.length} registros (últimos 50 mostrados)`, spacing: { after: 120 } }),
        ...(readings.length > 0 ? [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: ['Fecha', 'Glucosa', 'Notas'].map(h =>
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '4F46E5' },
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })] })],
                  })
                ),
              }),
              ...readings.slice(-50).map((r: any) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: new Date(r.timestamp).toLocaleString('es-ES') })] }),
                    new TableCell({ children: [new Paragraph({ text: String(r.value ?? r.glucose ?? '—') })] }),
                    new TableCell({ children: [new Paragraph({ text: r.notes ?? '—' })] }),
                  ],
                })
              ),
            ],
          }),
        ] : [new Paragraph({ text: 'Sin registros de glucosa.' })]),
        new Paragraph({ text: '' }),

        new Paragraph({ text: '4. SESIONES DE ESTUDIO', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
        new Paragraph({ text: `Total: ${sessions.length} sesiones (últimas 30 mostradas)`, spacing: { after: 120 } }),
        ...(sessions.length > 0 ? [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                tableHeader: true,
                children: ['Fecha', 'Duración', 'Asignatura'].map(h =>
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: '0EA5E9' },
                    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })] })],
                  })
                ),
              }),
              ...sessions.slice(-30).map((s: any) =>
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph({ text: s.date ? new Date(s.date).toLocaleDateString('es-ES') : '—' })] }),
                    new TableCell({ children: [new Paragraph({ text: String(s.duration ?? s.minutes ?? '—') + ' min' })] }),
                    new TableCell({ children: [new Paragraph({ text: s.subject ?? s.subjectId ?? '—' })] }),
                  ],
                })
              ),
            ],
          }),
        ] : [new Paragraph({ text: 'Sin sesiones de estudio.' })]),
        new Paragraph({ text: '' }),

        new Paragraph({ text: '5. GAMIFICACIÓN', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
        new Paragraph({ text: `Puntos: ${points}`, spacing: { after: 60 } }),
        new Paragraph({ text: `Racha: ${streak} días`, spacing: { after: 240 } }),

        new Paragraph({ text: '⚠️ AVISO LEGAL', heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 120 } }),
        new Paragraph({ text: 'floky NO es un dispositivo médico certificado (SaMD). No reemplaza el diagnóstico médico profesional.', spacing: { after: 100 } }),
        new Paragraph({ text: 'Datos almacenados localmente. Contacto: diegozamoranogarcia@gmail.com' }),
      ],
    }],
  });

  return Packer.toBlob(doc);
}
