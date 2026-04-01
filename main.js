import { getCurrentUser, login, logout, maskData, ROLES } from './auth.js';
import { calculateScore, generateHash, formatUUID, CATEGORIES } from './engine.js';
import './style.css';

// Pre-load FontAwesome CDN
const fontAwesome = document.createElement('link');
fontAwesome.rel = 'stylesheet';
fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
document.head.appendChild(fontAwesome);

let reports = [];
let users = [];
let activeSection = 'dashboard';
let isLoaded = false;
let usersLoaded = false;

const fetchReports = async () => {
  try {
    const response = await fetch('/api/reports');
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Data format error (expected array)');
    reports = data;
    isLoaded = true;
    renderApp();
  } catch (err) {
    console.error('Erro ao buscar relatórios:', err);
    // Force renderApp to show the error if we are already in an inconsistent state
    if (isLoaded) renderApp();
    else app.innerHTML = `<div style="color:white; padding: 2rem;">CRITICAL: ${err.message}</div>`;
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
  try {
    if (!getCurrentUser()) {
      renderLogin();
      return;
    }

    // Show loading state if reports not yet fetched
    if (!isLoaded) {
      app.innerHTML = `
        <div style="height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0a0a0b; color: #fff;">
          <i class="fas fa-circle-notch fa-spin fa-3x" style="color: var(--accent); margin-bottom: 2rem;"></i>
          <h2 style="font-weight: 800; letter-spacing: 2px;">SINCRONIZANDO DADOS...</h2>
          <p style="color: #64748b; font-size: 0.8rem; margin-top: 1rem;">Conectando ao banco de dados Railway</p>
        </div>
      `;
      fetchReports();
      return;
    }

    if (!usersLoaded && activeSection === 'usuarios') {
      fetchUsers();
    }

    const user = getCurrentUser();
    const total = reports.length;
    const approved = reports.filter(r => r.score?.status === 'APROVADO').length;
    const warnings = reports.filter(r => r.score?.status && r.score.status.includes('APONTAMENTO')).length;
    const rejected = reports.filter(r => r.score?.status === 'REPROVADO').length;


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
                 ${reports.map(r => `
                  <tr>
                    <td>
                      <div style="font-weight: 600; color: #fff;">${r.model}</div>
                      <div style="font-size: 0.7rem; color: var(--text-muted);">${r.owner}</div>
                    </td>
                    <td><span style="font-family: monospace; font-weight: 700;">${r.plate}</span></td>
                    <td>
                      <div style="font-weight: 700;">${r.score?.score || 0}/100</div>
                    </td>
                    <td>
                      <span class="badge ${r.score?.status === 'APROVADO' ? 'badge-success' : r.score?.status === 'REPROVADO' ? 'badge-danger' : 'badge-warning'}">
                        ${r.score?.status || 'N/A'}
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
                  <td style="font-size: 0.75rem;">${r.created_at || r.timestamp ? new Date(r.created_at || r.timestamp).toLocaleString() : 'N/A'}</td>
                  <td style="font-weight: 700; color: #fff;">${r.model}</td>
                  <td>${r.owner}</td>
                  <td><span style="font-family: monospace;">${r.plate}</span></td>
                  <td><div style="color: var(--warning);">${'★'.repeat(r.score?.stars || 0)}${'☆'.repeat(5 - (r.score?.stars || 0))}</div></td>
                  <td>
                    <span class="badge ${r.score?.status === 'APROVADO' ? 'badge-success' : r.score?.status === 'REPROVADO' ? 'badge-danger' : 'badge-warning'}">
                      ${r.score?.status || 'N/A'}
                    </span>
                    <div style="margin-top: 0.4rem;">
                        ${r.overall_status === 'REVISION_REQUESTED' ? '<span style="font-size: 0.6rem; color: var(--danger); font-weight: 700;"><i class="fas fa-undo"></i> REVISÃO SOLICITADA</span>' : (r.signed_by_engineer ? '<span style="font-size: 0.6rem; color: var(--success); font-weight: 700;"><i class="fas fa-check-double"></i> ASSINADO ENG</span>' : '<span style="font-size: 0.6rem; color: var(--warning); font-weight: 700;"><i class="fas fa-clock"></i> AGUARD. ENG</span>')}
                    </div>
                  </td>
                  <td style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                    <button class="btn btn-ghost open-report" data-id="${r.id}" title="Ver Laudo"><i class="fas fa-file-pdf"></i></button>
                    ${!r.signed_by_engineer ? `<button class="btn btn-ghost edit-report-btn" data-id="${r.id}" title="Editar"><i class="fas fa-edit"></i></button>` : ''}
                    <button class="btn btn-ghost delete-report" data-id="${r.id}" style="color: var(--danger);" title="Excluir"><i class="fas fa-trash"></i></button>
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
                  <td>${u.email}<br><span style="font-size: 0.65rem; color: var(--text-muted);">${u.crea ? `CREA: ${u.crea}` : ''}</span></td>
                  <td><span class="badge ${u.role === 'ADMINISTRADOR' ? 'badge-success' : u.role === 'ENGENHEIRO' ? 'badge-primary' : 'badge-warning'}" style="${u.role === 'ADMINISTRADOR' ? 'background: rgba(99,102,241,0.2); color: var(--accent);' : u.role === 'ENGENHEIRO' ? 'background: rgba(14,165,233,0.2); color: #0ea5e9;' : 'background: rgba(94,234,212,0.1); color: #5eead4;'}">${u.role}</span></td>
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
        </div>
      </div>
    `;
    } else if (activeSection === 'pendentes') {
      const pendingReports = reports.filter(r => !r.signed_by_engineer);
      mainContent = `
        <div class="container animate-in">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h3 style="font-size: 1.25rem; font-weight: 700;">Vistorias Aguardando Assinatura Técnica</h3>
            <span class="badge badge-warning">${pendingReports.length} Pendentes</span>
          </div>
          <div class="data-table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Veículo</th>
                  <th>Vistoriador</th>
                  <th>Placa</th>
                  <th>Status</th>
                  <th style="text-align: right;">Ação de Engenharia</th>
                </tr>
              </thead>
              <tbody>
                ${pendingReports.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 4rem; color: var(--text-muted);">Tudo em dia! Nenhuma vistoria pendente de assinatura.</td></tr>' : ''}
                ${pendingReports.map(r => `
                  <tr>
                    <td>${r.created_at || r.timestamp ? new Date(r.created_at || r.timestamp).toLocaleDateString() : 'N/A'}</td>
                    <td><div style="font-weight: 700; color: #fff;">${r.model}</div></td>
                    <td>${r.inspector?.name || 'Vistoriador'}</td>
                    <td><span style="font-family: monospace;">${r.plate}</span></td>
                    <td>
                      <span class="badge ${r.score?.status === 'APROVADO' ? 'badge-success' : 'badge-danger'}">${r.score?.status || 'N/A'}</span>
                    </td>
                    <td style="text-align: right;">
                      <button class="btn btn-primary sign-report-btn" data-id="${r.id}" style="font-size: 0.7rem; background: var(--accent);"><i class="fas fa-signature"></i> REVISAR E ASSINAR</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else if (activeSection === 'revisoes') {
      const myRevisions = reports.filter(r => r.overall_status === 'REVISION_REQUESTED');
      mainContent = `
        <div class="container animate-in">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
            <h3 style="font-size: 1.25rem; font-weight: 700;">Vistorias Devolvidas p/ Revisão</h3>
            <span class="badge badge-danger">${myRevisions.length} Requerem Ajuste</span>
          </div>
          <div class="data-table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Data Original</th>
                  <th>Veículo</th>
                  <th>Placa</th>
                  <th>Motivo da Devolução</th>
                  <th style="text-align: right;">Ação</th>
                </tr>
              </thead>
              <tbody>
                ${myRevisions.length === 0 ? '<tr><td colspan="5" style="text-align: center; padding: 4rem; color: var(--text-muted);">Nenhum pedido de revisão pendente.</td></tr>' : ''}
                ${myRevisions.map(r => `
                  <tr>
                    <td>${r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td><div style="font-weight: 700; color: #fff;">${r.model}</div></td>
                    <td><span style="font-family: monospace;">${r.plate}</span></td>
                    <td><div style="color: var(--danger); font-size: 0.8rem; font-weight: 600;">"${r.engineer_comment || 'Sem comentário detalhado'}"</div></td>
                    <td style="text-align: right;">
                      <button class="btn btn-primary edit-report-btn" data-id="${r.id}" style="font-size: 0.7rem;"><i class="fas fa-edit"></i> REFAZER / AJUSTAR</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    app.innerHTML = `
    <aside class="sidebar">
      <div class="sidebar-logo" style="display: flex; justify-content: center; padding: 2rem 0; margin-bottom: 3rem; border-bottom: 1px solid rgba(255,255,255,0.08);">
        <img src="/img/logo.png" alt="Logo" style="max-height: 120px; width: auto; filter: drop-shadow(0 0 15px rgba(99,102,241,0.25));">
      </div>

      <div class="nav-group">
        <p class="nav-label">Menu Principal</p>
        <div class="nav-link ${activeSection === 'dashboard' ? 'active' : ''}" data-nav="dashboard"><i class="fas fa-grid-2-horizontal"></i> Dashboard</div>
        <div class="nav-link ${activeSection === 'vistorias' ? 'active' : ''}" data-nav="vistorias"><i class="fas fa-clipboard-list"></i> Vistorias</div>
        ${user.role === 'ENGENHEIRO' ? `<div class="nav-link ${activeSection === 'pendentes' ? 'active' : ''}" data-nav="pendentes"><i class="fas fa-signature"></i> Vistorias a assinar <span style="background:var(--warning); color:#000; font-size:0.6rem; padding:2px 6px; border-radius:10px; margin-left:auto;">${reports.filter(r => !r.signed_by_engineer).length}</span></div>` : ''}
        ${user.role === 'VISTORIADOR' || user.role === 'ADMINISTRADOR' ? `<div class="nav-link ${activeSection === 'revisoes' ? 'active' : ''}" data-nav="revisoes"><i class="fas fa-exclamation-circle"></i> Vistorias p/ Revisão <span style="background:var(--danger); color:#fff; font-size:0.6rem; padding:2px 6px; border-radius:10px; margin-left:auto;">${reports.filter(r => r.overall_status === 'REVISION_REQUESTED').length}</span></div>` : ''}
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

    document.querySelectorAll('.edit-report-btn').forEach(btn => {
      btn.onclick = () => showFullInspectionModal(btn.dataset.id);
    });

    document.querySelectorAll('.delete-report').forEach(btn => {
      btn.onclick = () => handleDeleteReport(btn.dataset.id);
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

    if (activeSection === 'pendentes') {
      document.querySelectorAll('.sign-report-btn').forEach(btn => {
        btn.onclick = () => showReportDetails(btn.dataset.id);
      });
    }

    if (activeSection === 'revisoes') {
      document.querySelectorAll('.edit-report-btn').forEach(btn => {
        btn.onclick = () => showFullInspectionModal(btn.dataset.id);
      });
    }
  } catch (err) {
    console.error('Fatal application error:', err);
    app.innerHTML = `
      <div style="height: 100vh; width: 100vw; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #000; color: #fff; padding: 2rem; text-align: center;">
        <i class="fas fa-bug fa-3x" style="color: var(--danger); margin-bottom: 2rem;"></i>
        <h1 style="font-size: 1.5rem; margin-bottom: 1rem;">Erro de Sincronização</h1>
        <p style="color: #64748b; max-width: 400px; margin-bottom: 1rem;">Não foi possível carregar os dados do banco de dados Railway.</p>
        <div style="font-family: monospace; font-size: 0.7rem; color: var(--danger); background: rgba(255,0,0,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 2rem; max-width: 90%; overflow: hidden; text-overflow: ellipsis;">
          ${err.message}
        </div>
        <button onclick="localStorage.clear(); location.reload();" class="btn btn-primary">Limpar Cache e Reiniciar</button>
      </div>
    `;
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

const handleEngineerSign = (id) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay animate-in';
  modal.innerHTML = `
      <div style="background: var(--bg-surface); padding: 2.5rem; border-radius: var(--radius-lg); max-width: 500px; width: 100%; border: 1px solid var(--border-medium); text-align: center;">
         <h2 style="margin-bottom: 1rem; font-size: 1.25rem; font-weight: 800;">Assinatura do Engenheiro</h2>
         <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2rem;">Desenhe sua assinatura no campo abaixo para validar o laudo.</p>
         
         <div style="background: #fff; border-radius: 8px; border: 1px solid #ccc; padding: 10px; margin-bottom: 1.5rem;">
            <canvas id="canvas-engineer" width="400" height="150" style="width: 100%; height: 150px; cursor: crosshair; touch-action: none;"></canvas>
         </div>

         <div style="display: flex; gap: 1rem;">
            <button id="cancel-sign" class="btn btn-outline" style="flex: 1;">Cancelar</button>
            <button id="clear-engineer-sig" class="btn btn-ghost" style="flex: 1; border: 1px solid var(--border-medium);">Limpar</button>
            <button id="confirm-sign" class="btn btn-primary" style="flex: 2; background: var(--success);">Confirmar Assinatura</button>
         </div>
      </div>
  `;
  document.body.appendChild(modal);

  const canvas = document.getElementById('canvas-engineer');
  const ctx = canvas.getContext('2d');
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#000';

  let drawing = false;
  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e) => { drawing = true; const pos = getPos(e); ctx.beginPath(); ctx.moveTo(pos.x, pos.y); };
  const draw = (e) => { if (!drawing) return; e.preventDefault(); const pos = getPos(e); ctx.lineTo(pos.x, pos.y); ctx.stroke(); };
  const stopDrawing = () => { drawing = false; };

  canvas.onmousedown = startDrawing; canvas.onmousemove = draw; window.addEventListener('mouseup', stopDrawing);
  canvas.ontouchstart = startDrawing; canvas.ontouchmove = draw; canvas.ontouchend = stopDrawing;

  document.getElementById('clear-engineer-sig').onclick = () => ctx.clearRect(0, 0, canvas.width, canvas.height);
  document.getElementById('cancel-sign').onclick = () => modal.remove();

  document.getElementById('confirm-sign').onclick = async () => {
    const signature = canvas.toDataURL();
    if (signature.length < 2000) { alert('Por favor, assine no campo indicado.'); return; }

    try {
      const response = await fetch(`/api/reports/${id}/sign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature })
      });
      if (response.ok) {
        modal.remove();
        alert('Laudo assinado e finalizado com sucesso!');
        await fetchReports();
      }
    } catch (err) {
      console.error('Erro ao assinar:', err);
      alert('Erro técnico ao salvar assinatura.');
    }
  };
};

const handleEngineerReject = async (id) => {
  const comment = prompt('Por favor, descreva o motivo da devolução para o vistoriador:');
  if (comment) {
    try {
      const response = await fetch(`/api/reports/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment })
      });
      if (response.ok) {
        alert('Vistoria devolvida para revisão com sucesso.');
        await fetchReports();
      }
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
    }
  }
};

const handleDeleteReport = async (id) => {
  if (confirm('Deseja realmente excluir permanentemente este laudo de vistoria? Esta ação não pode ser desfeita.')) {
    try {
      await fetch(`/api/reports/${id}`, { method: 'DELETE' });
      await fetchReports();
    } catch (err) {
      console.error('Erro ao deletar laudo:', err);
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
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group"><label>Nova Senha (Opcional)</label><input type="password" id="edit-user-password" placeholder="Em branco p/ manter"></div>
                <div class="form-group">
                    <label>Nível de Acesso</label>
                    <select id="edit-user-role" style="width: 100%; height: 45px; background: var(--bg-elevated); border: 1px solid var(--border-medium); border-radius: 8px; color: #fff; padding: 0 1rem;">
                        <option value="VISTORIADOR" ${user.role === 'VISTORIADOR' ? 'selected' : ''}>VISTORIADOR</option>
                        <option value="ADMINISTRADOR" ${user.role === 'ADMINISTRADOR' ? 'selected' : ''}>ADMINISTRADOR</option>
                        <option value="ENGENHEIRO" ${user.role === 'ENGENHEIRO' ? 'selected' : ''}>ENGENHEIRO</option>
                    </select>
                </div>
            </div>
            <div id="crea-field-edit" class="form-group" style="display: ${user.role === 'ENGENHEIRO' ? 'block' : 'none'};"><label>Registro CREA</label><input type="text" id="edit-user-crea" value="${user.crea || ''}" placeholder="EX: 123456/D"></div>
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
      password: document.getElementById('edit-user-password').value || undefined,
      role: document.getElementById('edit-user-role').value,
      crea: document.getElementById('edit-user-crea').value,
      status: user.status
    };

    document.getElementById('edit-user-role').onchange = (e) => {
      document.getElementById('crea-field-edit').style.display = e.target.value === 'ENGENHEIRO' ? 'block' : 'none';
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
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div class="form-group"><label>Senha de Acesso</label><input type="password" id="user-password" placeholder="Mínimo 6 chars" required></div>
                <div class="form-group">
                    <label>Nível de Acesso</label>
                    <select id="user-role" style="width: 100%; height: 45px; background: var(--bg-elevated); border: 1px solid var(--border-medium); border-radius: 8px; color: #fff; padding: 0 1rem;">
                        <option value="VISTORIADOR">VISTORIADOR</option>
                        <option value="ADMINISTRADOR">ADMINISTRADOR</option>
                        <option value="ENGENHEIRO">ENGENHEIRO</option>
                    </select>
                </div>
            </div>
            <div id="crea-field-new" class="form-group" style="display: none;"><label>Registro CREA</label><input type="text" id="user-crea" placeholder="EX: 123456/D"></div>
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
      password: document.getElementById('user-password').value,
      role: document.getElementById('user-role').value,
      crea: document.getElementById('user-crea').value,
      status: 'ATIVO'
    };

    document.getElementById('user-role').onchange = (e) => {
      document.getElementById('crea-field-new').style.display = e.target.value === 'ENGENHEIRO' ? 'block' : 'none';
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

const showFullInspectionModal = (editId = null) => {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay animate-in';

  const editData = editId ? reports.find(r => r.id === editId) : null;
  let currentStep = 1;
  const capturedPhotos = editData ? { ...editData.photos } : {};

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
      <input type="file" id="camera-input" accept="image/*" style="display: none;">
      
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
          <div class="step-circle" data-step="5">5</div>
        </div>

        <form id="full-inspection-form">
          <!-- Passo 1: Dados do Veículo -->
          <div class="step-content active" data-step="1">
            <h3 style="font-size: 1rem; margin-bottom: 2rem; font-weight: 800;">Etapa 1: Identificação do Veículo</h3>
            ${editData ? `<div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: 8px; border: 1px solid var(--danger); font-size: 0.75rem; color: var(--danger); font-weight: 700;"> MOTIVO DA REVISÃO: "${editData.engineer_comment}" </div>` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
               <div class="form-group"><label>Proprietário</label><input type="text" id="owner" value="${editData?.owner || ''}" required></div>
               <div class="form-group"><label>CPF/CNPJ</label><input type="text" id="cpf" value="${editData?.cpf || ''}" required></div>
               <div class="form-group"><label>Chassi (VIN)</label><input type="text" id="chassi" value="${editData?.chassi || ''}" required></div>
               <div class="form-group"><label>Marca/Modelo</label><input type="text" id="model" value="${editData?.model || ''}" required></div>
               <div class="form-group"><label>Placa</label><input type="text" id="plate" value="${editData?.plate || ''}" required></div>
               <div class="form-group"><label>KM Atual</label><input type="number" id="km" value="${editData?.km || ''}" required></div>
            </div>
          </div>

          <!-- Passo 2: Fotos -->
          <div class="step-content" data-step="2">
            <h3 style="font-size: 1rem; margin-bottom: 0.5rem; font-weight: 800;">Etapa 2: Registro Fotográfico</h3>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2rem;">Capture as evidências visuais obrigatórias.</p>
            <div class="photo-grid">
               ${photoLabels.map(label => {
    const photo = capturedPhotos[label];
    return `
                    <div class="photo-card ${photo ? 'filled' : ''}" data-photo="${label}">
                      ${photo ? `<img src="${photo}">` : '<i class="fas fa-camera"></i>'}
                      <span>${label}</span>
                      <button type="button" class="remove-btn" title="Remover"><i class="fas fa-trash"></i></button>
                    </div>
                 `;
  }).join('')}
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
                                <button type="button" class="status-btn ${!editData || (editData.checks?.[sec.key]?.items?.[item]?.status === 'CLEAR') ? 'active success' : ''}" data-val="CLEAR">✅</button>
                                <button type="button" class="status-btn ${editData?.checks?.[sec.key]?.items?.[item]?.status === 'WARNING' ? 'active warning' : ''}" data-val="WARNING">⚠️</button>
                                <button type="button" class="status-btn ${editData?.checks?.[sec.key]?.items?.[item]?.status === 'FAIL' ? 'active danger' : ''}" data-val="FAIL">❌</button>
                             </div>
                          </div>
                          <textarea class="comment-input" rows="1" placeholder="Parecer técnico...">${editData?.checks?.[sec.key]?.items?.[item]?.comment || ''}</textarea>
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
                <div style="margin-top: 1.5rem; text-align: center; background: rgba(99,102,241,0.05); padding: 1rem; border-radius: 8px;">
                   <p style="font-size: 0.8rem; font-weight: 800; color: var(--accent); margin: 0;"><i class="fas fa-arrow-right"></i> CLIQUE EM "PRÓXIMO PASSO" PARA ASSINAR NO TABLET</p>
                </div>
              </div>
          </div>
          <!-- Passo 5: Assinaturas -->
          <div class="step-content" data-step="5">
             <h3 style="font-size: 1rem; margin-bottom: 1.5rem; font-weight: 800;">Etapa 5: Assinaturas Digitais (Tablet)</h3>
             <p style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 2rem;">Utilize a caneta ou o dedo para assinar nos campos abaixo.</p>
             <div style="display: grid; gap: 1.5rem;">
                <!-- Vistoriador -->
                <div style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-medium);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                       <div>
                          <p style="font-size: 0.8rem; font-weight: 700;">Assinatura do Vistoriador</p>
                          <p style="font-size: 0.65rem; color: var(--text-muted);">${getCurrentUser().name}</p>
                       </div>
                       <button type="button" class="btn btn-ghost clear-sig" data-target="canvas-inspector" style="font-size: 0.7rem; color: var(--danger);"><i class="fas fa-eraser"></i> Limpar</button>
                    </div>
                    <canvas id="canvas-inspector" width="600" height="200" style="background: #fff; border: 1.5px dashed #ccc; border-radius: 8px; width: 100%; height: 140px; touch-action: none; cursor: crosshair;"></canvas>
                </div>
                <!-- Proprietário -->
                <div style="background: var(--bg-elevated); padding: 1.5rem; border-radius: 12px; border: 1px solid var(--border-medium);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                       <div>
                          <p style="font-size: 0.8rem; font-weight: 700;">Assinatura do Responsável / Proprietário</p>
                          <p style="font-size: 0.65rem; color: var(--text-muted);">${editData?.owner || 'Confirmação de vistoria'}</p>
                       </div>
                       <button type="button" class="btn btn-ghost clear-sig" data-target="canvas-owner" style="font-size: 0.7rem; color: var(--danger);"><i class="fas fa-eraser"></i> Limpar</button>
                    </div>
                    <canvas id="canvas-owner" width="600" height="200" style="background: #fff; border: 1.5px dashed #ccc; border-radius: 8px; width: 100%; height: 140px; touch-action: none; cursor: crosshair;"></canvas>
                </div>
             </div>
          </div>
        </form>
      </div>

      <div class="modal-footer">
        <button id="prev-step" class="btn btn-ghost" style="display: none;">Voltar</button>
        <button id="next-step" class="btn btn-primary" style="padding-left: 2rem; padding-right: 2rem;">Próximo Passo <i class="fas fa-arrow-right"></i></button>
        <button id="finalize-inspection" class="btn btn-primary" style="display: none; background: var(--success); color: white; border: none; padding-left: 2rem; padding-right: 2rem;">Gravar e Finalizar Vistoria <i class="fas fa-save"></i></button>
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
    document.getElementById('next-step').style.display = currentStep < 5 ? 'block' : 'none';
    document.getElementById('finalize-inspection').style.display = currentStep === 5 ? 'block' : 'none';

    if (currentStep === 4) {
      document.getElementById('photo-count').textContent = Object.keys(capturedPhotos).length;
    }

    if (currentStep === 5) {
      // Initialize Canvas logic and event listeners when reaching Step 5
      initSignaturePads();
    }
  };

  const initSignaturePads = () => {
    ['canvas-inspector', 'canvas-owner'].forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';

      let drawing = false;
      const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * (canvas.width / rect.width),
          y: (clientY - rect.top) * (canvas.height / rect.height)
        };
      };

      const startDrawing = (e) => {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
      };

      const draw = (e) => {
        if (!drawing) return;
        e.preventDefault();
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      };

      const stopDrawing = () => { drawing = false; };

      canvas.onmousedown = startDrawing;
      canvas.onmousemove = draw;
      window.addEventListener('mouseup', stopDrawing);

      canvas.ontouchstart = startDrawing;
      canvas.ontouchmove = draw;
      canvas.ontouchend = stopDrawing;
    });

    document.querySelectorAll('.clear-sig').forEach(btn => {
      btn.onclick = () => {
        const canvas = document.getElementById(btn.dataset.target);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
    });
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
    if (currentStep === 2) {
      if (Object.keys(capturedPhotos).length < 3) {
        alert('Por favor, registre ao menos as fotos principais do veículo.');
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
    const inspectorSig = document.getElementById('canvas-inspector').toDataURL();
    const ownerSig = document.getElementById('canvas-owner').toDataURL();

    // Lower threshold to 1000 for more sensitivity
    if (inspectorSig.length < 1000 || ownerSig.length < 1000) {
      alert('As assinaturas digitais são obrigatórias para finalizar o laudo.');
      return;
    }

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
      id: editData ? editData.id : formatUUID(),
      plate: document.getElementById('plate').value.toUpperCase(),
      model: document.getElementById('model').value,
      km: document.getElementById('km').value,
      owner: document.getElementById('owner').value,
      cpf: document.getElementById('cpf').value,
      chassi: document.getElementById('chassi').value,
      checks,
      photos: capturedPhotos,
      signatures: {
        inspector: inspectorSig,
        owner: ownerSig
      },
      score: calculateScore(checks),
      inspector: getCurrentUser(),
      timestamp: new Date().toISOString()
    };

    report.hash = await generateHash(report);

    try {
      await fetch(editData ? `/api/reports/${editData.id}` : '/api/reports', {
        method: editData ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      await fetchReports();
      modal.remove();
      alert(editData ? 'Vistoria re-enviada com sucesso!' : 'Vistoria salva com sucesso!');
    } catch (err) {
      console.error('Erro ao salvar relatório:', err);
      alert('Falha ao conectar com o banco de dados.');
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

  const scoreColor = report.score?.status === 'APROVADO' ? '#22c55e' : report.score?.status === 'REPROVADO' ? '#ef4444' : '#eab308';

  modal.innerHTML = `
    <div id="printable-report" style="background: white; color: #000; width: 850px; min-height: 297mm; padding: 50px; position: relative; font-family: Inter, sans-serif; margin: 0 auto; box-sizing: border-box;">
      
      <!-- Logo do Laudo -->
      <div style="text-align: center; margin-bottom: 4rem;">
        <img src="/img/logo.png" style="max-height: 180px; width: auto; margin-bottom: 1.5rem;">
      </div>

      <!-- Cabeçalho Administrativo -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; border-bottom: 3px solid #000; padding-bottom: 2rem;">
        <div style="text-align: left;">
          <h1 style="font-size: 1.5rem; font-weight: 950; text-transform: uppercase;">Laudo Cautelar / Transferência</h1>
          <p style="font-size: 0.7rem; color: #64748b; font-weight: 800;">Protocolo: <span style="font-family: monospace; color: #000;">${report.id}</span></p>
          <p style="font-size: 0.7rem; color: #64748b; font-weight: 800;">Data/Hora: <span style="color: #000;">${new Date(report.created_at || report.timestamp).toLocaleString()}</span></p>
          ${report.signed_by_engineer ? '<div style="margin-top: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(34,197,94,0.1); color: #15803d; border: 1.5px solid #16a34a; padding: 0.3rem 0.6rem; border-radius: 4px; font-weight: 900; font-size: 0.65rem; text-transform: uppercase;"><i class="fas fa-check-double"></i> ASSINADO DIGITALMENTE POR ENGENHEIRO</div>' : ''}
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 1rem;">
          <button id="print-pdf-btn" class="btn btn-primary" style="background: #000; color: #fff; border-radius: 4px; padding: 0.75rem 1.5rem; font-weight: 800;">
            <i class="fas fa-file-download" style="margin-right: 0.5rem;"></i> BAIXAR LAUDO (PDF)
          </button>
          <button id="govbr-sign-btn" class="btn btn-outline" style="border: 1.5px solid #000; color: #000; font-weight: 850; font-size: 0.65rem; padding: 0.6rem 1rem; width: 100%; border-radius: 4px; margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
            <img src="https://www.gov.br/++theme++padrao_govbr/img/govbr-logo-large.png" style="height: 14px;"> ASSINAR COM GOV.BR (ITI)
          </button>
          ${!report.signed_by_engineer && getCurrentUser().role === 'ENGENHEIRO' ? `
            <button id="modal-sign-btn" class="btn btn-primary" style="background: var(--success); color: #fff; border-radius: 4px; padding: 0.75rem 1.5rem; width: 100%; font-weight: 800; margin-bottom: 0.5rem;">
              <i class="fas fa-signature"></i> CONCORDAR E ASSINAR
            </button>
            <button id="modal-reject-btn" class="btn btn-primary" style="background: var(--danger); color: #fff; border-radius: 4px; padding: 0.75rem 1.5rem; width: 100%; font-weight: 800;">
              <i class="fas fa-undo"></i> RECOMENDAR REVISÃO
            </button>
          ` : ''}
          <div style="font-size: 0.65rem; font-weight: 850; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 4px;">DATA DE EMISSÃO: ${report.created_at || report.timestamp ? new Date(report.created_at || report.timestamp).toLocaleString() : 'Data N/A'}</div>
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
    const catData = report.checks?.[key] || {};
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
             <div style="font-size: 2.5rem; font-weight: 950; color: ${scoreColor}; line-height: 1; text-transform: uppercase;">${report.score?.status || 'N/A'}</div>
             <div style="color: #eab308; font-size: 1.5rem; margin-top: 1rem;">${'★'.repeat(report.score?.stars || 0)}${'☆'.repeat(5 - (report.score?.stars || 0))}</div>
          </div>
          <div style="text-align: right;">
             <p style="font-size: 0.8rem; color: #94a3b8; font-weight: 900; margin-bottom: 0.8rem; text-transform: uppercase;">Índice de Integridade</p>
             <div style="font-size: 4.5rem; font-weight: 950; line-height: 1; color: #000;">${report.score?.score || 0}<span style="font-size: 1.5rem; color: #94a3b8;">/100</span></div>
          </div>
      </div>

      <!-- Rodapé Pericial de Assinaturas -->
      <div style="margin-top: 5rem; padding-top: 3rem; border-top: 2px solid #000; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2rem;">
          <div style="text-align: center; border-top: 1px solid #000; padding-top: 1.5rem; position: relative;">
              ${report.signatures && (typeof report.signatures === 'object' ? report.signatures.inspector : JSON.parse(report.signatures).inspector) ? `
                <img src="${typeof report.signatures === 'object' ? report.signatures.inspector : JSON.parse(report.signatures).inspector}" style="position: absolute; top: -55px; left: 50%; transform: translateX(-50%); max-height: 110px; mix-blend-mode: multiply; pointer-events: none; z-index: 10;">
              ` : ''}
              <p style="font-size: 0.6rem; color: #94a3b8; font-weight: 800; margin-bottom: 3rem; text-transform: uppercase;">Assinatura do Vistoriador</p>
              <div style="font-size: 0.8rem; font-weight: 700; color: #000;">${report.inspector?.name || 'Vistoriador N/A'}</div>
              <div style="font-size: 0.6rem; color: #64748b;">ID: ${report.inspector?.id || 'ID N/A'}</div>
          </div>
          
          <div style="text-align: center; border-top: 1px solid #000; padding-top: 1.5rem; position: relative;">
              ${report.signatures && (typeof report.signatures === 'object' ? report.signatures.owner : JSON.parse(report.signatures).owner) ? `
                <img src="${typeof report.signatures === 'object' ? report.signatures.owner : JSON.parse(report.signatures).owner}" style="position: absolute; top: -55px; left: 50%; transform: translateX(-50%); max-height: 110px; mix-blend-mode: multiply; pointer-events: none; z-index: 10;">
              ` : ''}
              <p style="font-size: 0.6rem; color: #94a3b8; font-weight: 800; margin-bottom: 3rem; text-transform: uppercase;">Assinatura do Proprietário / Responsável</p>
              <div style="font-size: 0.8rem; font-weight: 700; color: #000;">${report.owner || 'N/A'}</div>
              <div style="font-size: 0.6rem; color: #64748b;">DOC: ${report.cpf ? maskData(report.cpf, 'CPF') : 'N/A'}</div>
          </div>

          <div style="display: flex; flex-direction: column; align-items: center; justify-content: flex-end;">
             <div style="font-family: monospace; font-size: 0.55rem; color: #64748b; line-height: 1.6; text-align: left; margin-bottom: 1rem; width: 100%;">
                 <p style="font-weight: 900; color: #000; margin-bottom: 0.3rem;">HASH DE AUTENTICIDADE</p>
                 <span style="word-break: break-all;">${report.hash || 'N/A'}</span>
             </div>
            <div style="width: 100px; height: 100px; background: #fff; border: 1.5px solid #000; padding: 0.5rem; border-radius: 4px; display: grid; place-items: center;">
               <i class="fas fa-qrcode fa-4x" style="opacity: 0.05;"></i>
            </div>
         </div>
      </div>

      <div style="margin-top: 4rem; display: flex; justify-content: center;">
         <div style="text-align: center; border-top: 1px solid #000; padding-top: 1.5rem; width: 350px; position: relative;">
            ${report.signed_by_engineer && report.engineer_signature ? `<img src="${report.engineer_signature}" style="position: absolute; top: -50px; left: 50%; transform: translateX(-50%); max-height: 100px; mix-blend-mode: multiply; pointer-events: none;">` : ''}
            <p style="font-size: 0.6rem; color: #94a3b8; font-weight: 800; margin-bottom: 3.5rem; text-transform: uppercase;">Assinatura do Engenheiro Responsável Técnico</p>
            <div style="font-size: 0.8rem; font-weight: 700; color: #000;">${report.signed_by_engineer ? (users.find(u => u.role === 'ENGENHEIRO')?.name || 'ENGENHEIRO CADASTRADO') : '__________________________'}</div>
            <div style="font-size: 0.6rem; color: #64748b;">${report.signed_by_engineer ? `REGISTRO CREA: ${users.find(u => u.role === 'ENGENHEIRO')?.crea || 'N/A'}` : 'REGISTRO CREA / DATA'}</div>
         </div>
      </div>
      
      <button id="close-report" style="position: absolute; top: 1.5rem; right: 1.5rem; width: 44px; height: 44px; border-radius: 50%; border: none; background: #f1f5f9; cursor: pointer; display: flex; align-items: center; justify-content: center;"><i class="fas fa-times"></i></button>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('close-report').onclick = () => modal.remove();

  document.getElementById('print-pdf-btn').onclick = () => {
    const btn = document.getElementById('print-pdf-btn');
    const closeBtn = document.getElementById('close-report');
    const signArea = document.getElementById('modal-sign-btn');
    const rejectArea = document.getElementById('modal-reject-btn');

    // Hide buttons temporarily for capture
    btn.style.display = 'none';
    closeBtn.style.display = 'none';
    if (signArea) signArea.style.display = 'none';
    if (rejectArea) rejectArea.style.display = 'none';

    const element = document.getElementById('printable-report');
    const opt = {
      margin: [10, 0, 10, 0],
      filename: `LAUDO_${report.plate || 'VISTORIA'}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        width: 850,
        windowWidth: 850
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // Restore buttons
      btn.style.display = 'block';
      closeBtn.style.display = 'flex';
      if (signArea) signArea.style.display = 'block';
      if (rejectArea) rejectArea.style.display = 'block';
    });
  };
  if (document.getElementById('modal-sign-btn')) {
    document.getElementById('modal-sign-btn').onclick = () => {
      handleEngineerSign(id);
      modal.remove();
    };
  }
  if (document.getElementById('modal-reject-btn')) {
    document.getElementById('modal-reject-btn').onclick = () => {
      handleEngineerReject(id);
      modal.remove();
    };
  }

  document.getElementById('govbr-sign-btn').onclick = () => {
    const modalGov = document.createElement('div');
    modalGov.className = 'modal-overlay animate-in';
    modalGov.style.zIndex = '3000';
    modalGov.innerHTML = `
      <div style="background: white; padding: 2.5rem; border-radius: 12px; max-width: 500px; text-align: center; color: #000; font-family: Inter, sans-serif; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
         <img src="https://www.gov.br/++theme++padrao_govbr/img/govbr-logo-large.png" style="height: 40px; margin-bottom: 3.5rem;">
         <h2 style="font-weight: 950; margin-bottom: 1.5rem; text-transform: uppercase; font-size: 1.1rem; letter-spacing: 1px;">Assinatura Digital Gov.br</h2>
         <p style="font-size: 0.85rem; line-height: 1.6; color: #475569; margin-bottom: 2rem;">
            O laudo pericial atual será validado juridicamente através do portal oficial do Governo Federal.
            <br><br>
            <strong>PASSO 1:</strong> Clique em baixar para gerar o arquivo PDF.
            <br>
            <strong>PASSO 2:</strong> Use o botão do Assinador ITI para enviar o arquivo e assinar com seu CPF.
         </p>
         <div style="display: grid; gap: 0.8rem;">
            <button id="gov-download-first" class="btn btn-primary" style="background: #000; width: 100%; font-weight: 800; padding: 1rem;"><i class="fas fa-file-download"></i> 1. BAIXAR LAUDO PDF</button>
            <a href="https://assinador.iti.br/" target="_blank" class="btn btn-outline" style="border: 2px solid #000; color: #000; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 1rem; font-weight: 800;"><i class="fas fa-external-link-alt"></i> 2. IR PARA O ASSINADOR GOV.BR</a>
            <button id="close-gov-modal" class="btn btn-ghost" style="margin-top: 1rem; font-size: 0.7rem; color: #64748b;">FECHAR INSTRUÇÕES</button>
         </div>
      </div>
    `;
    document.body.appendChild(modalGov);

    document.getElementById('close-gov-modal').onclick = () => modalGov.remove();
    document.getElementById('gov-download-first').onclick = () => {
      document.getElementById('print-pdf-btn').click();
    };
  };
};


// Initial Render
renderApp();
app.style.display = 'flex';
app.style.width = '100vw';
app.style.height = '100vh';
