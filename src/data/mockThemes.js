// Mirrors the future `themes` table. The ML theme model returns one of these names.
export const themes = [
  { themeId: 'lab-instructions', name: 'Lab Instructions', category: 'Lab' },
  { themeId: 'lecture-pace', name: 'Lecture Pace', category: 'Lecture' },
  { themeId: 'assessment', name: 'Assessment', category: 'Assessment' },
  { themeId: 'teaching-quality', name: 'Teaching Quality', category: 'Teaching' },
  { themeId: 'learning-materials', name: 'Learning Materials', category: 'Learning Materials' },
  { themeId: 'tutorials', name: 'Tutorials', category: 'Tutorial' },
  { themeId: 'workload', name: 'Workload', category: 'Workload' },
  { themeId: 'technical-issues', name: 'Technical Issues', category: 'Technical Issues' },
];

export const themeById = Object.fromEntries(themes.map((t) => [t.themeId, t]));
export const themeByName = Object.fromEntries(themes.map((t) => [t.name, t]));
