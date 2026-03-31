import { getCurrentUser, login, logout, maskData, ROLES } from './auth.js';
import { calculateScore, generateHash, formatUUID, CATEGORIES } from './engine.js';
import './style.css';

// Pre-load FontAwesome
const fontAwesome = document.createElement('script');
fontAwesome.src = 'https://kit.fontawesome.com/64d58efce2.js';
fontAwesome.crossOrigin = 'anonymous';
document.head.appendChild(fontAwesome);

let reports = [];
let users = [];
let activeSection = 'dashboard';
let isLoaded = false;
let usersLoaded = false;

const fetchReports = async () => {
  try {
    const response = await fetch('/api/reports');
    reports = await response.json();
    isLoaded = true;
    renderApp();
  } catch (err) {
    console.error('Erro ao buscar relatórios:', err);
  }
};

const fetchUsers = async () => {
  try {
    const response = await fetch('/api/users');
    users = await response.json();
    usersLoaded = true;
    renderApp();
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
  }
};

// App elements
const app = document.getElementById('app');

const renderApp = () => {
  if (!getCurrentUser()) {
    renderLogin();
    return;
  }

  // Load reports once
  if (!isLoaded) {
    fetchReports();
    return;
  }

  if (!usersLoaded && activeSection === 'usuarios') {
    fetchUsers();
  }

  const user = getCurrentUser();
  const total = reports.length;
  const approved = reports.filter(r => r.score.status === 'APROVADO').length;
  const warnings = reports.filter(r => r.score.status && r.score.status.includes('APONTAMENTO')).length;
  const rejected = reports.filter(r => r.score.status === 'REPROVADO').length;


  let mainContent = '';

  if (activeSection === 'dashboard') {
    mainContent = `
      <div class="container animate-in">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Total Vistorias</span>
              <i class="fas fa-car-side text-muted"></i>
            </div>
            <div class="stat-value">${total}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Aprovados</span>
              <i class="fas fa-check-circle text-success"></i>
            </div>
            <div class="stat-value" style="color: var(--success);">${approved}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Apontamentos</span>
              <i class="fas fa-exclamation-triangle text-warning"></i>
            </div>
            <div class="stat-value" style="color: var(--warning);">${warnings}</div>
          </div>
          <div class="stat-card">
            <div class="stat-header">
              <span class="stat-label">Reprovados</span>
              <i class="fas fa-times-circle text-danger"></i>
            </div>
            <div class="stat-value" style="color: var(--danger);">${rejected}</div>
          </div>
        </div>

        <div style="margin-bottom: 2rem;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 1.25rem;">Relatórios Recentes</h3>
          <div class="data-table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Modelo do Veículo</th>
                  <th>Placa</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${total === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 4rem; color: var(--text-muted);">Aguardando primeira vistoria...</td></tr>' : ''}
                ${reports.slice(0, 5).map(r => `
                  <tr>
                    <td>
                      <div style="font-weight: 600; color: #fff;">${r.model}</div>
                      <div style="font-size: 0.7rem; color: var(--text-muted);">${r.owner}</div>
                    </td>
                    <td><span style="font-family: monospace; font-weight: 700;">${r.plate}</span></td>
                    <td>
                      <div style="font-weight: 700;">${r.score.score}/100</div>
                    </td>
                    <td>
                      <span class="badge ${r.score.status === 'APROVADO' ? 'badge-success' : r.score.status === 'REPROVADO' ? 'badge-danger' : 'badge-warning'}">
                        ${r.score.status}
                      </span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-ghost open-report" data-id="${r.id}"><i class="far fa-eye"></i></button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (activeSection === 'vistorias') {
    mainContent = `
      <div class="container animate-in">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1.5rem;">Módulo de Gestão de Vistorias</h3>
        <div class="data-table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Data/Hora</th>
                <th>Veículo</th>
                <th>Proprietário</th>
                <th>Placa</th>
                <th>Rating</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${total === 0 ? '<tr><td colspan="7" style="text-align: center; padding: 4rem; color: var(--text-muted);">Nenhum laudo emitido até o momento.</td></tr>' : ''}
              ${reports.map(r => `
                <tr>
                  <td style="font-size: 0.75rem;">${new Date(r.timestamp).toLocaleString()}</td>
                  <td style="font-weight: 700; color: #fff;">${r.model}</td>
                  <td>${r.owner}</td>
                  <td><span style="font-family: monospace;">${r.plate}</span></td>
                  <td><div style="color: var(--warning);">${'★'.repeat(r.score.stars)}${'☆'.repeat(5 - r.score.stars)}</div></td>
                  <td>
                    <span class="badge ${r.score.status === 'APROVADO' ? 'badge-success' : r.score.status === 'REPROVADO' ? 'badge-danger' : 'badge-warning'}">
                      ${r.score.status}
                    </span>
                  </td>
                  <td>
                    <button class="btn btn-ghost open-report" data-id="${r.id}"><i class="fas fa-file-pdf"></i> Visualizar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (activeSection === 'analytics') {
    mainContent = `
      <div class="container animate-in">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 2rem;">Indicadores de Performance</h3>
        <div class="stats-grid">
           <div class="stat-card">
              <span class="stat-label">Eficiência Mensal</span>
              <div class="stat-value">94.2%</div>
              <p style="font-size: 0.65rem; color: var(--success); margin-top: 0.5rem;"><i class="fas fa-caret-up"></i> +2.1%</p>
           </div>
           <div class="stat-card">
              <span class="stat-label">Tempo Médio Vistoria</span>
              <div class="stat-value">18 min</div>
              <p style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.5rem;">Meta: 20 min</p>
           </div>
        </div>
        <div class="data-table-container" style="padding: 2rem; text-align: center; color: var(--text-muted);">
           <i class="fas fa-chart-bar fa-3x" style="margin-bottom: 1rem; opacity: 0.2;"></i>
           <p>Gráficos em tempo real estão sendo processados pela Engine v1.2...</p>
        </div>
      </div>
    `;
  } else if (activeSection === 'usuarios') {
    mainContent = `
      <div class="container animate-in">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
          <h3 style="font-size: 1.25rem; font-weight: 700;">Gestão de Acessos (RBAC)</h3>
          <button id="new-user-btn" class="btn btn-outline" style="font-size: 0.75rem;"><i class="fas fa-user-plus"></i> Novo Usuário</button>
        </div>
        <div class="data-table-container">
          <table class="table">
            <thead>
              <tr>
                <th>Nome do Perito</th>
                <th>ID</th>
                <th>E-mail</th>
                <th>Nível de Privilégio</th>
                <th>Status</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><div style="font-weight: 700; color: #fff;">${u.name}</div></td>
                  <td><span style="font-family: monospace;">${u.id}</span></td>
                  <td>${u.email}</td>
                  <td><span class="badge ${u.role === 'ADMINISTRADOR' ? 'badge-success' : 'badge-warning'}" style="${u.role === 'ADMINISTRADOR' ? 'background: rgba(99,102,241,0.2); color: var(--accent);' : 'background: rgba(94,234,212,0.1); color: #5eead4;'}">${u.role}</span></td>
                  <td><span class="badge badge-success">${u.status}</span></td>
                  <td style="text-align: right;">
                    <button class="btn btn-ghost edit-user" data-id="${u.id}"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-ghost delete-user" data-id="${u.id}" style="color: var(--danger);"><i class="fas fa-trash-alt"></i></button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (activeSection === 'ajustes') {
    mainContent = `
      <div class="container animate-in">
        <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 2rem;">Configurações do Motor (Core Engine)</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
          <div class="stat-card">
            <h4 style="font-size: 0.9rem; margin-bottom: 1.5rem;">Pesos das Categorias (Scoring)</h4>
            <div style="display: grid; gap: 1rem;">
               <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Estrutura e Chassi</span> <span style="font-weight: 700;">40%</span></div>
               <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Segurança / Pneus</span> <span style="font-weight: 700;">25%</span></div>
               <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Mecânica / Elétrica</span> <span style="font-weight: 700;">20%</span></div>
               <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Estética</span> <span style="font-weight: 700;">10%</span></div>
               <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Interior / Higiene</span> <span style="font-weight: 700;">05%</span></div>
            </div>
          </div>
          <div class="stat-card">
            <h4 style="font-size: 0.9rem; margin-bottom: 1.5rem;">Segurança e Conformidade</h4>
             <div style="display: grid; gap: 1rem;">
               <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Hash de Integridade</span> <span style="color: var(--success);">SHA-256 ATIVO</span></div>
               <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Mascaramento LGPD</span> <span style="color: var(--success);">ATIVO (Módulos v1.0)</span></div>
               <div style="display: flex; justify-content: space-between; font-size: 0.85rem;"><span>Watermark pericial</span> <span style="color: var(--warning);">PENDENTE</span></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-box"><i class="fas fa-shield-alt text-white"></i></div>
        <span style="font-weight: 800; font-size: 1rem; color: #fff;">VIS-CAR</span>
      </div>

      <div class="nav-group">
        <p class="nav-label">Menu Principal</p>
        <div class="nav-link ${activeSection === 'dashboard' ? 'active' : ''}" data-nav="dashboard"><i class="fas fa-grid-2-horizontal"></i> Dashboard</div>
        <div class="nav-link ${activeSection === 'vistorias' ? 'active' : ''}" data-nav="vistorias"><i class="fas fa-clipboard-list"></i> Vistorias</div>
        <div class="nav-link ${activeSection === 'analytics' ? 'active' : ''}" data-nav="analytics"><i class="fas fa-chart-line"></i> Analytics</div>
      </div>

      <div class="nav-group">
        <p class="nav-label">Gestão</p>
        <div class="nav-link ${activeSection === 'usuarios' ? 'active' : ''}" data-nav="usuarios"><i class="fas fa-users"></i> Usuários</div>
        <div class="nav-link ${activeSection === 'ajustes' ? 'active' : ''}" data-nav="ajustes"><i class="fas fa-cog"></i> Ajustes</div>
      </div>

      <div class="user-profile">
        <div class="avatar">${user.name.charAt(0)}</div>
        <div style="flex: 1; overflow: hidden;">
          <p style="font-size: 0.75rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${user.name}</p>
          <p style="font-size: 0.6rem; color: var(--text-muted);">${user.role}</p>
        </div>
        <button id="logout-btn" title="Sair do sistema" style="background: none; border: none; color: var(--text-muted); cursor: pointer;"><i class="fas fa-sign-out-alt"></i></button>
      </div>
    </aside>

    <main class="main">
      <header class="header">
        <h2 style="font-size: 1.1rem; font-weight: 600;">${activeSection.toUpperCase()}</h2>
        <div style="display: flex; gap: 1rem;">
          <button id="new-inspection-btn" class="btn btn-primary"><i class="fas fa-plus"></i> Iniciar Vistoria</button>
        </div>
      </header>

      ${mainContent}
    </main>
  `;

  // UI Event Bindings
  document.getElementById('logout-btn').onclick = () => {
    logout();
    renderApp();
  };

  document.getElementById('new-inspection-btn').onclick = showConsentModal;

  document.querySelectorAll('[data-nav]').forEach(el => {
    el.onclick = () => {
      activeSection = el.dataset.nav;
      renderApp();
    };
  });

  document.querySelectorAll('.open-report').forEach(btn => {
    btn.onclick = () => showReportDetails(btn.dataset.id);
  });

  if (activeSection === 'usuarios') {
    const newUserBtn = document.getElementById('new-user-btn');
    if (newUserBtn) {
      newUserBtn.onclick = showNewUserModal;
    }

    document.querySelectorAll('.edit-user').forEach(btn => {
      btn.onclick = () => showEditUserModal(btn.dataset.id);
    });

    document.querySelectorAll('.delete-user').forEach(btn => {
      btn.onclick = () => handleDeleteUser(btn.dataset.id);
    });
  }
};

const handleDeleteUser = async (id) => {
  if (confirm('Deseja realmente remover este usuário?')) {
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      await fetchUsers();
    } catch (err) {
      console.error('Erro ao deletar usuário:', err);
    }
  }
};

const showEditUserModal = (id) => {
  const user = users.find(u => u.id === id);
  if (!user) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay animate-in';
  modal.innerHTML = `
      <div style="background: var(--bg-surface); padding: 2.5rem; border-radius: var(--radius-lg); max-width: 480px; width: 100%; border: 1px solid var(--border-medium);">
         <h2 style="margin-bottom: 2rem; font-size: 1.25rem; font-weight: 800;">Editar Dados do Perito</h2>
         <form id="edit-user-form">
            <div class="form-group"><label>Nome Completo</label><input type="text" id="edit-user-name" value="${user.name}" required></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group"><label>ID (Código)</label><input type="text" id="edit-user-id" value="${user.id}" readonly style="opacity: 0.6;"></div>
                <div class="form-group"><label>E-mail</label><input type="email" id="edit-user-email" value="${user.email}" required></div>
            </div>
            <div class="form-group">
                <label>Nível de Acesso</label>
                <select id="edit-user-role" style="width: 100%; height: 45px; background: var(--bg-elevated); border: 1px solid var(--border-medium); border-radius: 8px; color: #fff; padding: 0 1rem;">
                    <option value="VISTORIADOR" ${user.role === 'VISTORIADOR' ? 'selected' : ''}>VISTORIADOR</option>
                    <option value="ADMINISTRADOR" ${user.role === 'ADMINISTRADOR' ? 'selected' : ''}>ADMINISTRADOR</option>
                </select>
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button type="button" id="close-edit-user-modal" class="btn btn-outline" style="flex: 1;">Cancelar</button>
                <button type="submit" class="btn btn-primary" style="flex: 2;">Salvar Alterações</button>
            </div>
         </form>
      </div>
    `;
  document.body.appendChild(modal);

  document.getElementById('close-edit-user-modal').onclick = () => modal.remove();
  document.getElementById('edit-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const updatedUser = {
      name: document.getElementById('edit-user-name').value,
      email: document.getElementById('edit-user-email').value,
      role: document.getElementById('edit-user-role').value,
      status: user.status
    };

    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedUser)
      });
      await fetchUsers();
      modal.remove();
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      alert('Falha ao atualizar dados.');
    }
  };
};

const showNewUserModal = () => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay animate-in';
  modal.innerHTML = `
      <div style="background: var(--bg-surface); padding: 2.5rem; border-radius: var(--radius-lg); max-width: 480px; width: 100%; border: 1px solid var(--border-medium);">
         <h2 style="margin-bottom: 2rem; font-size: 1.25rem; font-weight: 800;">Cadastrar Sistema / Perito</h2>
         <form id="new-user-form">
            <div class="form-group"><label>Nome Completo</label><input type="text" id="user-name" required></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group"><label>ID (Código)</label><input type="text" id="user-id" placeholder="EX: VST-999" required></div>
                <div class="form-group"><label>E-mail</label><input type="email" id="user-email" required></div>
            </div>
            <div class="form-group">
                <label>Nível de Acesso</label>
                <select id="user-role" style="width: 100%; height: 45px; background: var(--bg-elevated); border: 1px solid var(--border-medium); border-radius: 8px; color: #fff; padding: 0 1rem;">
                    <option value="VISTORIADOR">VISTORIADOR</option>
                    <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                </select>
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button type="button" id="close-user-modal" class="btn btn-outline" style="flex: 1;">Cancelar</button>
                <button type="submit" class="btn btn-primary" style="flex: 2;">Confirmar Cadastro</button>
            </div>
         </form>
      </div>
    `;
  document.body.appendChild(modal);

  document.getElementById('close-user-modal').onclick = () => modal.remove();
  document.getElementById('new-user-form').onsubmit = async (e) => {
    e.preventDefault();
    const newUser = {
      id: document.getElementById('user-id').value.toUpperCase(),
      name: document.getElementById('user-name').value,
      email: document.getElementById('user-email').value,
      role: document.getElementById('user-role').value,
      status: 'ATIVO'
    };

    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      await fetchUsers();
      modal.remove();
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      alert('Falha ao salvar usuário no banco.');
    }
  };
};

const showConsentModal = () => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay animate-in';
  modal.innerHTML = `
    <div style="background: var(--bg-surface); padding: 2.5rem; border-radius: var(--radius-lg); max-width: 480px; text-align: center; border: 1px solid var(--border-medium);">
       <div style="width: 56px; height: 56px; background: rgba(99,102,241,0.1); border-radius: 12px; display: grid; place-items: center; margin: 0 auto 1.5rem; color: var(--accent);">
         <i class="fas fa-lock fa-lg"></i>
       </div>
       <h2 style="margin-bottom: 1rem; font-size: 1.25rem;">Conformidade LGPD</h2>
       <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 2rem;">
         Ao iniciar esta vistoria, você confirma que os dados do proprietário (CPF/Chassi) serão tratados de acordo com a Lei Geral de Proteção de Dados, com mascaramento operacional e integridade SHA-256 no laudo final.
       </p>
       <div style="display: flex; gap: 1rem;">
          <button id="cancel-consent" class="btn btn-outline" style="flex: 1;">Cancelar</button>
          <button id="accept-consent" class="btn btn-primary" style="flex: 2;">Aceitar e Continuar</button>
       </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById('cancel-consent').onclick = () => modal.remove();
  document.getElementById('accept-consent').onclick = () => {
    modal.remove();
    showFullInspectionModal();
  };
};

const showFullInspectionModal = () => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay animate-in';

  let currentStep = 1;
  const capturedPhotos = {};

  const sections = [
    { key: 'ESTRUTURA', name: 'Estrutura & Chassi', weight: 40, items: ['Longarina Dianteira', 'Longarina Traseira', 'Colunas A/B/C', 'Painel Frontal', 'Painel Traseiro', 'Folha de Teto', 'Assoalho Porta Malas', 'Caixa de Ar/Soleiras', 'Numeração de Chassi', 'Numeração de Motor'] },
    { key: 'SEGURANÇA', name: 'Sistemas de Segurança', weight: 25, items: ['Pneus (TWI)', 'Estepe (Roda Reserva)', 'Freio de Mão', 'Luzes de Sinalização', 'Cintos de Segurança', 'Airbags Frontais/Laterais', 'Kit de Emergência (Triângulo)', 'Buzina', 'Limpadores de Parabrisa'] },
    { key: 'MECÂNICA', name: 'Mecânica & Transmissão', weight: 15, items: ['Vazamentos de Óleo/Fluídos', 'Nível de Arrefecimento', 'Ruído de Motor/Válvulas', 'Embreagem/Câmbio', 'Barulhos de Suspensão', 'Estado da Bateria', 'Escapamento'] },
    { key: 'ELÉTRICA', name: 'Sistemas Elétricos & Conforto', weight: 10, items: ['Ar Condicionado', 'Vidros Elétricos', 'Travas Elétricas', 'Instrumentos do Painel', 'Alternador (Carga)', 'Luzes Espias (Painel)'] },
    { key: 'ESTÉTICA', name: 'Estética & Lataria', weight: 10, items: ['Funilaria (Amassados)', 'Pintura (Retoques)', 'Vidros (Trincas/Ranhuras)', 'Espelhos Retrovisores', 'Estado dos Faróis/Lanternas'] }
  ];

  const photoLabels = ['Frente 45°', 'Traseira 45°', 'Lateral Direita', 'Lateral Esquerda', 'Motor', 'Chassi', 'Hodômetro'];

  modal.innerHTML = `
    <div class="modal-inspection animate-in">
      <input type="file" id="camera-input" accept="image/*" capture="environment" style="display: none;">
      
      <div class="modal-header">
        <div>
          <h2 style="font-size: 1.1rem; font-weight: 800;">Protocolo Pericial Digital</h2>
          <p style="font-size: 0.65rem; color: var(--text-muted);">Processo de vistoria em 4 etapas</p>
        </div>
        <button id="close-modal" class="btn btn-ghost"><i class="fas fa-times"></i></button>
      </div>

      <div class="modal-body" style="padding: 1.5rem 2.5rem;">
        <div class="stepper">
          <div class="step-circle active" data-step="1">1</div>
          <div class="step-circle" data-step="2">2</div>
          <div class="step-circle" data-step="3">3</div>
          <div class="step-circle" data-step="4">4</div>
        </div>

        <form id="full-inspection-form">
          <!-- Passo 1: Dados do Veículo -->
          <div class="step-content active" data-step="1">
            <h3 style="font-size: 1rem; margin-bottom: 2rem; font-weight: 800;">Etapa 1: Identificação do Veículo</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
               <div class="form-group"><label>Proprietário</label><input type="text" id="owner" required></div>
               <div class="form-group"><label>CPF/CNPJ</label><input type="text" id="cpf" required></div>
               <div class="form-group"><label>Chassi (VIN)</label><input type="text" id="chassi" required></div>
               <div class="form-group"><label>Marca/Modelo</label><input type="text" id="model" required></div>
               <div class="form-group"><label>Placa</label><input type="text" id="plate" required></div>
               <div class="form-group"><label>KM Atual</label><input type="number" id="km" required></div>
            </div>
          </div>

          <!-- Passo 2: Fotos -->
          <div class="step-content" data-step="2">
            <h3 style="font-size: 1rem; margin-bottom: 0.5rem; font-weight: 800;">Etapa 2: Registro Fotográfico</h3>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2rem;">Capture as evidências visuais obrigatórias.</p>
            <div class="photo-grid">
              ${photoLabels.map(label => `
                <div class="photo-card" data-photo="${label}">
                  <i class="fas fa-camera"></i>
                  <span>${label}</span>
                  <button type="button" class="remove-btn" title="Remover"><i class="fas fa-trash"></i></button>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Passo 3: Checklist Técnico -->
          <div class="step-content" data-step="3">
            <h3 style="font-size: 1rem; margin-bottom: 2rem; font-weight: 800;">Etapa 3: Checklist de Integridade</h3>
            ${sections.map(sec => `
              <div class="category-section">
                <div class="category-header">
                  <span class="category-title">${sec.name}</span>
                  <span class="category-weight">${sec.weight}% peso</span>
                </div>
                <div class="checklist-grid" style="grid-template-columns: 1fr 1fr; gap: 1rem;">
                  ${sec.items.map(item => `
                    <div class="check-item">
                      <div class="check-item-header">
                         <span class="check-item-label">${item}</span>
                         <div class="status-toggle" data-category="${sec.key}" data-item="${item}">
                            <button type="button" class="status-btn active success" data-val="CLEAR">✅</button>
                            <button type="button" class="status-btn" data-val="WARNING">⚠️</button>
                            <button type="button" class="status-btn" data-val="FAIL">❌</button>
                         </div>
                      </div>
                      <textarea class="comment-input" rows="1" placeholder="Parecer técnico..."></textarea>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
            <div style="background: rgba(239, 68, 68, 0.1); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--danger);">
               <p style="font-size: 0.8rem; font-weight: 800; color: var(--danger); margin-bottom: 1rem;">ALERTAS CRÍTICOS</p>
               <label style="display: flex; gap: 1rem; align-items: center; cursor: pointer; margin-bottom: 0.5rem; font-size: 0.8rem;">
                 <input type="checkbox" id="hard-reproval" style="width: 20px; height: 20px;"> Danos Estruturais / Corte / Remanche
               </label>
               <label style="display: flex; gap: 1rem; align-items: center; cursor: pointer; font-size: 0.8rem;">
                 <input type="checkbox" id="motor-mismatch" style="width: 20px; height: 20px;"> Motor não compatível com BIN
               </label>
            </div>
          </div>

          <!-- Passo 4: Revisão -->
          <div class="step-content" data-step="4">
             <h3 style="font-size: 1rem; margin-bottom: 2rem; font-weight: 800;">Etapa 4: Revisão Final</h3>
             <div style="background: var(--bg-elevated); padding: 2rem; border-radius: 12px; border: 1px solid var(--border-medium);">
                <p style="font-size: 0.9rem; margin-bottom: 1rem; font-weight: 700;">O laudo está pronto para conclusão.</p>
                <ul style="font-size: 0.8rem; color: var(--text-secondary); line-height: 2.5; list-style: none; padding: 0;">
                  <li><i class="fas fa-check-circle" style="color: var(--success);"></i> Dados do veículo validados</li>
                  <li><i class="fas fa-check-circle" style="color: var(--success);"></i> <span id="photo-count">0</span> de ${photoLabels.length} fotos registradas</li>
                  <li><i class="fas fa-check-circle" style="color: var(--success);"></i> Checklist técnico concluído</li>
                  <li><i class="fas fa-check-circle" style="color: var(--success);"></i> Assinatura digital pronta</li>
                </ul>
             </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button id="prev-step" class="btn btn-ghost" style="display: none;">Voltar</button>
        <button id="next-step" class="btn btn-primary" style="padding-left: 2rem; padding-right: 2rem;">Próximo Passo <i class="fas fa-arrow-right"></i></button>
        <button id="finalize-inspection" class="btn btn-primary" style="display: none; background: var(--success); color: white; border: none; padding-left: 2rem; padding-right: 2rem;">Assinar e Finalizar <i class="fas fa-signature"></i></button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const updateStepper = () => {
    document.querySelectorAll('.step-circle').forEach(c => {
      const stepNum = parseInt(c.dataset.step);
      c.classList.remove('active', 'completed');
      if (stepNum === currentStep) c.classList.add('active');
      if (stepNum < currentStep) c.classList.add('completed');
    });

    document.querySelectorAll('.step-content').forEach(c => {
      c.classList.remove('active');
      if (parseInt(c.dataset.step) === currentStep) c.classList.add('active');
    });

    document.getElementById('prev-step').style.display = currentStep > 1 ? 'block' : 'none';
    document.getElementById('next-step').style.display = currentStep < 4 ? 'block' : 'none';
    document.getElementById('finalize-inspection').style.display = currentStep === 4 ? 'block' : 'none';

    if (currentStep === 4) {
      document.getElementById('photo-count').textContent = Object.keys(capturedPhotos).length;
    }
  };

  // Camera Logic
  let activePhotoLabel = null;
  const cameraInput = document.getElementById('camera-input');

  document.querySelectorAll('.photo-card').forEach(card => {
    card.onclick = () => {
      activePhotoLabel = card.dataset.photo;
      cameraInput.click();
    };

    const removeBtn = card.querySelector('.remove-btn');
    removeBtn.onclick = (e) => {
      e.stopPropagation();
      delete capturedPhotos[card.dataset.photo];
      card.classList.remove('filled');
      const img = card.querySelector('img');
      if (img) img.remove();
    };
  });

  cameraInput.onchange = (e) => {
    const file = e.target.files[0];
    if (file && activePhotoLabel) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        capturedPhotos[activePhotoLabel] = base64;

        const card = document.querySelector(`.photo-card[data-photo="${activePhotoLabel}"]`);
        card.classList.add('filled');
        let img = card.querySelector('img');
        if (!img && base64) {
          img = document.createElement('img');
          card.appendChild(img);
        }
        if (img) img.src = base64;
      };
      reader.readAsDataURL(file);
    }
  };

  document.getElementById('next-step').onclick = () => {
    if (currentStep === 1) {
      if (!document.getElementById('owner').value || !document.getElementById('plate').value) {
        alert('Dados básicos do veículo são obrigatórios.');
        return;
      }
    }
    currentStep++;
    updateStepper();
  };

  document.getElementById('prev-step').onclick = () => {
    currentStep--;
    updateStepper();
  };

  // Status Toggle Logic
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.onclick = () => {
      const parent = btn.parentElement;
      parent.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active', 'success', 'warning', 'danger'));
      const val = btn.dataset.val;
      btn.classList.add('active');
      if (val === 'CLEAR') btn.classList.add('success');
      if (val === 'WARNING') btn.classList.add('warning');
      if (val === 'FAIL') btn.classList.add('danger');
    };
  });

  document.getElementById('close-modal').onclick = () => modal.remove();

  document.getElementById('finalize-inspection').onclick = async () => {
    const checks = {};
    sections.forEach(sec => {
      let catStatus = 'CLEAR';
      const items = {};
      const toggles = document.querySelectorAll(`[data-category="${sec.key}"]`);
      toggles.forEach(tog => {
        const itemLabel = tog.dataset.item;
        const activeVal = tog.querySelector('.active').dataset.val;
        items[itemLabel] = { status: activeVal };

        if (activeVal === 'FAIL') catStatus = 'FAIL';
        else if (activeVal === 'WARNING' && catStatus === 'CLEAR') catStatus = 'WARNING';
      });

      checks[sec.key] = {
        status: catStatus,
        items,
        remanche: sec.key === 'ESTRUTURA' ? document.getElementById('hard-reproval').checked : false,
        motorTrocadoSemCadastro: sec.key === 'MECÂNICA' ? document.getElementById('motor-mismatch').checked : false,
      };
    });

    const report = {
      id: formatUUID(),
      plate: document.getElementById('plate').value.toUpperCase(),
      model: document.getElementById('model').value,
      km: document.getElementById('km').value,
      owner: document.getElementById('owner').value,
      cpf: document.getElementById('cpf').value,
      chassi: document.getElementById('chassi').value,
      checks,
      photos: capturedPhotos,
      score: calculateScore(checks),
      inspector: getCurrentUser(),
      timestamp: new Date().toISOString()
    };

    report.hash = await generateHash(report);

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      await fetchReports();
      modal.remove();
    } catch (err) {
      console.error('Erro ao salvar relatório:', err);
      alert('Falha ao salvar no banco de dados.');
    }
  };

  updateStepper(); // Initial sync of step indicators and buttons
};

const renderLogin = () => {
  app.innerHTML = `
    <div class="login-container animate-in">
      <div class="login-card">
        <div class="login-logo">
          <i class="fas fa-car-side"></i>
          <h1>VIS-CAR</h1>
          <p>Sistema Pericial de Vistoria</p>
        </div>
        <form id="login-form">
          <div class="form-group">
            <label>E-mail (Administrador)</label>
            <input type="email" id="login-email" placeholder="admin@vistoria.car" required>
          </div>
          <div class="form-group">
            <label>Senha</label>
            <input type="password" id="login-password" placeholder="admin123" required>
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%; height: 50px; font-size: 1rem; margin-top: 1rem;">
            ENTRAR NO SISTEMA
          </button>
        </form>
        <div id="login-error" style="color: var(--danger); font-size: 0.8rem; margin-top: 1.5rem; text-align: center; display: none; font-weight: 700;">
          <i class="fas fa-exclamation-triangle"></i> Credenciais inválidas. Tente novamente.
        </div>
      </div>
    </div>
  `;

  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (await login(email, password)) {
      renderApp();
    } else {
      document.getElementById('login-error').style.display = 'block';
      document.getElementById('login-error').classList.add('animate-shake');
    }
  };
};

const showReportDetails = (id) => {
  const report = reports.find(r => r.id === id);
  if (!report) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay animate-in';

  const scoreColor = report.score.status === 'APROVADO' ? '#22c55e' : report.score.status === 'REPROVADO' ? '#ef4444' : '#eab308';

  modal.innerHTML = `
    <div style="background: white; color: #000; width: 95%; max-width: 1000px; min-height: 95vh; border-radius: var(--radius-lg); overflow-y: auto; padding: 4rem; position: relative; font-family: Inter, sans-serif;">
      
      <!-- Cabeçalho Administrativo -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; border-bottom: 3px solid #000; padding-bottom: 2rem;">
        <div style="text-align: left;">
          <h1 style="font-size: 1.8rem; letter-spacing: 0.1em; font-weight: 950; margin: 0; color: #000; text-transform: uppercase;">Laudo Certificado de Vistoria Pericial</h1>
          <p style="font-size: 0.8rem; color: #64748b; font-weight: 800; margin-top: 0.5rem;">REGISTRO ÚNICO DE INSPEÇÃO • ID: ${report.id}</p>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 1rem;">
          <button id="print-pdf-btn" class="btn btn-primary" style="background: #000; color: #fff; border-radius: 4px; padding: 0.75rem 1.5rem;">
            <i class="fas fa-file-pdf"></i> EXPORTAR LAUDO COMPLETO (PDF)
          </button>
          <div style="font-size: 0.65rem; font-weight: 850; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 4px;">DATA DE EMISSÃO: ${new Date(report.timestamp).toLocaleString()}</div>
        </div>
      </div>

      <!-- Dados Primeiros: Proprietário e Veículo -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; margin-bottom: 4rem; background: #f8fafc; padding: 2rem; border-radius: 8px;">
         <div style="border-right: 1px solid #e2e8f0; padding-right: 4rem;">
            <h3 style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem; font-weight: 900;">Dados do Proprietário</h3>
            <p style="font-size: 1.25rem; font-weight: 900; margin-bottom: 0.5rem; color: #000;">${report.owner}</p>
            <p style="font-size: 0.9rem; color: #64748b; font-family: monospace;">DOC/CPF: ${maskData(report.cpf, 'CPF')}</p>
         </div>
         <div>
            <h3 style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 1.5rem; font-weight: 900;">Dados da Unidade Móvel</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; font-size: 0.9rem;">
               <div><p style="color: #94a3b8; font-size: 0.7rem; font-weight: 800; margin-bottom: 0.2rem;">PLACA</p><p style="font-weight: 900; font-family: monospace; font-size: 1.1rem; border: 1px solid #000; padding: 0.2rem 0.5rem; display: inline-block;">${report.plate}</p></div>
               <div><p style="color: #94a3b8; font-size: 0.7rem; font-weight: 800; margin-bottom: 0.2rem;">MARCA/MODELO</p><p style="font-weight: 900; color: #000;">${report.model}</p></div>
               <div><p style="color: #94a3b8; font-size: 0.7rem; font-weight: 800; margin-bottom: 0.2rem;">CHASSI (VIN)</p><p style="font-weight: 900; font-family: monospace; color: #000;">${maskData(report.chassi, 'CHASSI')}</p></div>
               <div><p style="color: #94a3b8; font-size: 0.7rem; font-weight: 800; margin-bottom: 0.2rem;">KM ATUAL</p><p style="font-weight: 900; color: #000;">${report.km}</p></div>
            </div>
         </div>
      </div>

      <!-- Registro Fotográfico -->
      ${report.photos && Object.keys(report.photos).length > 0 ? `
        <div style="margin-bottom: 5rem;">
          <h3 style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 2rem; font-weight: 900; text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem;">Evidências Fotográficas do Ato Pericial</h3>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
            ${Object.entries(report.photos).map(([label, src]) => `
              <div style="border: 2px solid #f1f5f9; border-radius: 4px; overflow: hidden; background: #fff;">
                <img src="${src}" style="width: 100%; aspect-ratio: 4/3; object-fit: cover; display: block;">
                <div style="padding: 0.75rem; font-size: 0.65rem; font-weight: 900; text-align: center; color: #334155; background: #f8fafc; border-top: 1px solid #f1f5f9; text-transform: uppercase;">PHOTO: ${label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- CHECKLIST DETALHADO POR CATEGORIA -->
      <div style="margin-bottom: 5rem;">
        <h3 style="font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 2rem; font-weight: 900; text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem;">Checklist Técnico de Avaliação Pericial</h3>
        <div style="display: grid; gap: 3rem;">
           ${Object.entries(CATEGORIES).map(([key, cat]) => {
    const catData = report.checks[key];
    const catItems = catData.items || {};
    const catColor = catData.status === 'CLEAR' ? '#22c55e' : catData.status === 'WARNING' ? '#eab308' : '#ef4444';

    return `
               <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
                  <div style="background: #f8fafc; padding: 1.25rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; border-left: 10px solid ${catColor};">
                     <span style="font-weight: 900; font-size: 1rem; text-transform: uppercase;">${cat.name}</span>
                     <span style="font-weight: 900; font-size: 0.8rem; color: ${catColor}; border: 1.5px solid ${catColor}; padding: 0.3rem 1rem; border-radius: 4px;">PARECER: ${catData.status === 'CLEAR' ? 'APROVADO' : catData.status === 'WARNING' ? 'COM APONTAMENTO' : 'REPROVADO'}</span>
                  </div>
                  <div style="padding: 1.5rem 2rem; display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                     ${Object.entries(catItems).length > 0 ? Object.entries(catItems).map(([item, data]) => {
      const itemColor = data.status === 'CLEAR' ? '#22c55e' : data.status === 'WARNING' ? '#eab308' : '#ef4444';
      return `
                          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px dashed #f1f5f9;">
                             <span style="font-size: 0.85rem; font-weight: 700; color: #475569;">${item}</span>
                             <span style="font-size: 0.75rem; font-weight: 900; color: ${itemColor};">${data.status === 'CLEAR' ? 'CONFORME' : data.status === 'WARNING' ? 'ANOMALIA' : 'NÃO CONFORME'}</span>
                          </div>
                        `;
    }).join('') : `<p style="grid-column: span 2; font-size: 0.8rem; color: #94a3b8; text-align: center;">Resultados consolidados em conformidade com o padrão técnico.</p>`}
                  </div>
                  ${catData.remanche || catData.motorTrocadoSemCadastro ? `
                    <div style="background: #fef2f2; padding: 1rem 2rem; border-top: 1px solid #fee2e2; color: #b91c1c; font-size: 0.75rem; font-weight: 900;">
                       <i class="fas fa-exclamation-circle"></i> ALERTA CRÍTICO: ${catData.remanche ? 'VESTÍGIOS DE RECORTE/REMANCHE DETECTADOS.' : ''} ${catData.motorTrocadoSemCadastro ? 'MOTOR DIVERGENTE DO CADASTRO BIN.' : ''}
                    </div>
                  ` : ''}
               </div>
             `;
  }).join('')}
        </div>
      </div>

      <!-- Sumário Final e Score -->
      <div class="score-box-print" style="border: 4px solid #000; padding: 3rem; border-radius: 12px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 5rem;">
         <div>
            <p style="font-size: 0.8rem; color: #94a3b8; font-weight: 900; margin-bottom: 0.8rem; text-transform: uppercase;">Classificação de Conformidade</p>
            <div style="font-size: 2.5rem; font-weight: 950; color: ${scoreColor}; line-height: 1; text-transform: uppercase;">${report.score.status}</div>
            <div style="color: #eab308; font-size: 1.5rem; margin-top: 1rem;">${'★'.repeat(report.score.stars)}${'☆'.repeat(5 - report.score.stars)}</div>
         </div>
         <div style="text-align: right;">
            <p style="font-size: 0.8rem; color: #94a3b8; font-weight: 900; margin-bottom: 0.8rem; text-transform: uppercase;">Índice de Integridade</p>
            <div style="font-size: 4.5rem; font-weight: 950; line-height: 1; color: #000;">${report.score.score}<span style="font-size: 1.5rem; color: #94a3b8;">/100</span></div>
         </div>
      </div>

      <!-- Rodapé Pericial de Assinaturas -->
      <div style="margin-top: 5rem; padding-top: 3rem; border-top: 2px solid #000; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem; align-items: flex-end;">
         <div style="text-align: center; border-top: 1px solid #000; padding-top: 1rem;">
            <p style="font-size: 0.6rem; color: #94a3b8; font-weight: 800; margin-bottom: 3.5rem; text-transform: uppercase;">Assinatura do Vistoriador</p>
            <div style="font-size: 0.8rem; font-weight: 700; color: #000;">${report.inspector.name}</div>
            <div style="font-size: 0.6rem; color: #64748b;">CPF: ***.***.***-**</div>
         </div>
         
         <div style="text-align: center; border-top: 1px solid #000; padding-top: 1rem;">
            <p style="font-size: 0.6rem; color: #94a3b8; font-weight: 800; margin-bottom: 3.5rem; text-transform: uppercase;">Assinatura do Proprietário / Responsável</p>
            <div style="font-size: 0.8rem; font-weight: 700; color: #000;">${report.owner}</div>
            <div style="font-size: 0.6rem; color: #64748b;">DOC: ${maskData(report.cpf, 'CPF')}</div>
         </div>

         <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-top: 1rem;">
            <div style="font-family: monospace; font-size: 0.55rem; color: #64748b; line-height: 1.6; text-align: left; margin-bottom: 1rem; width: 100%;">
                <p style="font-weight: 900; color: #000; margin-bottom: 0.3rem;">HASH DE AUTENTICIDADE</p>
                <span style="word-break: break-all;">${report.hash}</span>
            </div>
            <div style="width: 100px; height: 100px; background: #fff; border: 1.5px solid #000; padding: 0.5rem; border-radius: 4px; display: grid; place-items: center;">
               <i class="fas fa-qrcode fa-4x" style="opacity: 0.05;"></i>
            </div>
         </div>
      </div>
      
      <button id="close-report" style="position: absolute; top: 1.5rem; right: 1.5rem; width: 44px; height: 44px; border-radius: 50%; border: none; background: #f1f5f9; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fas fa-times"></i></button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-report').onclick = () => modal.remove();
  document.getElementById('print-pdf-btn').onclick = () => window.print();
};


// Initial Render
renderApp();
app.style.display = 'flex';
app.style.width = '100vw';
app.style.height = '100vh';
