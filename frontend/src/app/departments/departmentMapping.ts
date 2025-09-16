// frontend/src/lib/departmentMapping.ts
// Map backend department IDs to display names

export const DEPARTMENT_DISPLAY_NAMES: Record<string, string> = {
    'tech': 'Tech and Collaboration',
    'digital_creatives': 'Digital Creatives', 
    'smcw': 'Social Media and Content Writing',
    'events': 'Events',
    'marketing': 'Marketing',
    'workshops': 'Workshops', 
    'agm': 'Artist and Guest Management',
    'hospitality': 'Hospitality',
    'photography': 'Photography',
    'administration': 'Administration',
    'ihc': 'Infrastructure, Hospitality & Crafts',
    'publicity': 'Publicity',
    'logistics': 'Logistics',
    'informals': 'Informals'
  };
  
  export const DEPARTMENT_COLORS: Record<string, string> = {
    'tech': '#FF8200',
    'digital_creatives': '#FF6B6B',
    'smcw': '#4ECDC4', 
    'events': '#45B7D1',
    'marketing': '#96CEB4',
    'workshops': '#FFEAA7',
    'agm': '#DDA0DD',
    'hospitality': '#98D8C8',
    'photography': '#F7DC6F',
    'administration': '#BB8FCE',
    'ihc': '#85C1E9',
    'publicity': '#F8C471',
    'logistics': '#82E0AA',
    'informals': '#F1948A'
  };
  
  export function getDepartmentDisplayName(id: string): string {
    return DEPARTMENT_DISPLAY_NAMES[id] || id.replace(/_/g, ' ').toUpperCase();
  }
  
  export function getDepartmentColor(id: string): string {
    return DEPARTMENT_COLORS[id] || '#FF8200';
  }