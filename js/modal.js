import { content } from './content.js';
import { getCurrentLang } from './language.js';

export function initModal() {
    const modal = document.getElementById('info-modal');
    const closeBtn = document.querySelector('.close-modal');
    const modalContent = document.getElementById('modal-text');

    if (!modal || !closeBtn || !modalContent) return;

    // Helper to open modal
    window.openModal = (type) => {
        const lang = getCurrentLang(); // 'tr' or 'en'
        const langContent = content[lang] || content['tr'];

        if (langContent && langContent[type]) {
            modalContent.innerHTML = langContent[type];
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scroll
        }
    };

    // Close on cross
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}
