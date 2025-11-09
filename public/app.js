// Estado da aplicação
let prospects = [];
let currentFilter = 'all';

// Status disponíveis
const STATUS_OPTIONS = [
    'Não contatado ainda',
    'Contato com atendente',
    'Contato com decisor',
    'Continuidade do whatsapp',
    'Reunião marcada',
    'Objeção da atendente',
    'Objeção do decisor'
];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadProspects();
    setupEventListeners();
});

// Configurar event listeners
function setupEventListeners() {
    // Formulário de adicionar prospect
    document.getElementById('prospectForm').addEventListener('submit', handleAddProspect);

    // Filtro de status
    document.getElementById('statusFilter').addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderProspects();
    });
}

// Carregar prospects da API
async function loadProspects() {
    try {
        const response = await fetch('/api/prospects');
        prospects = await response.json();
        renderProspects();
    } catch (error) {
        console.error('Erro ao carregar prospects:', error);
        showMessage('Erro ao carregar prospects', 'error');
    }
}

// Adicionar novo prospect
async function handleAddProspect(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const prospectData = {
        nome: formData.get('nome'),
        telefone: formData.get('telefone'),
        instagram: formData.get('instagram'),
        googleMeuNegocio: formData.get('googleMeuNegocio'),
        presencaRedeSocial: formData.get('presencaRedeSocial')
    };

    try {
        const response = await fetch('/api/prospects', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(prospectData)
        });

        if (response.ok) {
            const newProspect = await response.json();
            prospects.push(newProspect);
            renderProspects();
            e.target.reset();
            showMessage('Prospect adicionado com sucesso!', 'success');
        }
    } catch (error) {
        console.error('Erro ao adicionar prospect:', error);
        showMessage('Erro ao adicionar prospect', 'error');
    }
}

// Atualizar status do prospect
async function updateProspectStatus(id, newStatus) {
    try {
        const response = await fetch(`/api/prospects/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            const updatedProspect = await response.json();
            const index = prospects.findIndex(p => p.id === id);
            if (index !== -1) {
                prospects[index] = updatedProspect;
                renderProspects();
                showMessage('Status atualizado!', 'success');
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        showMessage('Erro ao atualizar status', 'error');
    }
}

// Deletar prospect
async function deleteProspect(id) {
    if (!confirm('Tem certeza que deseja remover este prospect?')) {
        return;
    }

    try {
        const response = await fetch(`/api/prospects/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            prospects = prospects.filter(p => p.id !== id);
            renderProspects();
            showMessage('Prospect removido!', 'success');
        }
    } catch (error) {
        console.error('Erro ao deletar prospect:', error);
        showMessage('Erro ao deletar prospect', 'error');
    }
}

// Renderizar lista de prospects
function renderProspects() {
    const container = document.getElementById('prospectsList');

    // Filtrar prospects
    let filteredProspects = prospects;
    if (currentFilter !== 'all') {
        filteredProspects = prospects.filter(p => p.status === currentFilter);
    }

    // Se não houver prospects
    if (filteredProspects.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Nenhum prospect encontrado</h3>
                <p>Adicione um novo prospect usando o formulário acima.</p>
            </div>
        `;
        return;
    }

    // Renderizar prospects
    container.innerHTML = filteredProspects.map(prospect => `
        <div class="prospect-card">
            <div class="prospect-header">
                <h3 class="prospect-name">${prospect.nome}</h3>
                <button class="btn-delete" onclick="deleteProspect('${prospect.id}')">
                    🗑️ Remover
                </button>
            </div>

            <div class="prospect-info">
                <div class="info-item">
                    <span class="info-label">📞 Telefone</span>
                    <span class="info-value">${prospect.telefone}</span>
                </div>

                ${prospect.instagram ? `
                    <div class="info-item">
                        <span class="info-label">📱 Instagram</span>
                        <span class="info-value">${prospect.instagram}</span>
                    </div>
                ` : ''}

                ${prospect.googleMeuNegocio ? `
                    <div class="info-item">
                        <span class="info-label">🌐 Google Meu Negócio</span>
                        <span class="info-value">${prospect.googleMeuNegocio}</span>
                    </div>
                ` : ''}

                <div class="info-item">
                    <span class="info-label">👥 Presença na Rede Social</span>
                    <span class="info-value">${prospect.presencaRedeSocial}</span>
                </div>
            </div>

            <div class="prospect-status">
                <label class="info-label">Status do Contato</label>
                <select
                    class="status-select"
                    onchange="updateProspectStatus('${prospect.id}', this.value)"
                >
                    ${STATUS_OPTIONS.map(status => `
                        <option value="${status}" ${prospect.status === status ? 'selected' : ''}>
                            ${status}
                        </option>
                    `).join('')}
                </select>
            </div>
        </div>
    `).join('');
}

// Mostrar mensagem temporária
function showMessage(message, type) {
    // Remover mensagem anterior se existir
    const existingMessage = document.querySelector('.toast-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // Criar nova mensagem
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? '#28a745' : '#dc3545'};
        color: white;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(toast);

    // Remover após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
