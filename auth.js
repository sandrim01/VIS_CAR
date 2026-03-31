export const ROLES = {
  ADMIN: 'ADMINISTRADOR',
  VISTORIADOR: 'VISTORIADOR',
  ENGENHEIRO: 'ENGENHEIRO'
};

// Simple mock user management
const users = [
  { id: 'ADM-001', name: 'Alê System', role: ROLES.ADMIN, email: 'admin@vistoria.car' },
  { id: 'VST-245', name: 'Carlos Perito', role: ROLES.VISTORIADOR, email: 'carlos@vistoria.car' }
];

let currentUser = JSON.parse(localStorage.getItem('vis_user'));

export const getCurrentUser = () => currentUser;

export const login = async (email, password) => {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (response.ok) {
      currentUser = await response.json();
      localStorage.setItem('vis_user', JSON.stringify(currentUser));
      window.dispatchEvent(new CustomEvent('userChanged', { detail: currentUser }));
      return true;
    }
    return false;
  } catch (err) {
    console.error('Login error:', err);
    return false;
  }
};

export const logout = () => {
  currentUser = null;
  localStorage.removeItem('vis_user');
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
