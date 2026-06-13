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
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            closeBtn.focus();
        }
    };

    const closeInfoModal = () => {
        modal.style.display = 'none';
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    };

    // Close on button
    closeBtn.addEventListener('click', closeInfoModal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeInfoModal();
    });

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'flex') closeInfoModal();
    });
}
