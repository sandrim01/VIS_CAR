export const ROLES = {
  ADMIN: 'ADMINISTRADOR',
  VISTORIADOR: 'VISTORIADOR'
};

// Simple mock user management
const users = [
  { id: 'ADM-001', name: 'Alê System', role: ROLES.ADMIN, email: 'admin@vistoria.car' },
  { id: 'VST-245', name: 'Carlos Perito', role: ROLES.VISTORIADOR, email: 'carlos@vistoria.car' }
];

let currentUser = null;

export const getCurrentUser = () => currentUser;

export const login = (email, password) => {
  // Simple check for demo
  const user = users.find(u => u.email === email && password === 'admin123');
  if (user) {
    currentUser = user;
    window.dispatchEvent(new CustomEvent('userChanged', { detail: currentUser }));
    return true;
  }
  return false;
};

export const logout = () => {
  currentUser = null;
  window.dispatchEvent(new CustomEvent('userChanged', { detail: null }));
};

export const setUser = (role) => {
  currentUser = users.find(u => u.role === role) || users[0];
  console.log('Role switched to:', currentUser.role);
  window.dispatchEvent(new CustomEvent('userChanged', { detail: currentUser }));
};

export const hasPermission = (requiredRole) => currentUser.role === requiredRole;

// Masking logic based on role
export const maskData = (data, type) => {
  if (currentUser.role === ROLES.ADMIN) return data; // Unmasked for admin

  switch (type) {
    case 'CPF':
      // Ex: ***.567.***-00
      return `***.${data.substring(4, 7)}.***-${data.substring(12, 14)}`;
    case 'CHASSI':
      // Ex: ***************123
      return `***************${data.substring(14)}`;
    default:
      return data;
  }
};
