const COPY_BUTTON_RESET_MS = 2000;

export async function copyToClipboard(button: HTMLButtonElement, text: string) {
    const originalTitle = button.getAttribute('title');

    try {
        button.disabled = true;
        await navigator.clipboard.writeText(text);
        button.setAttribute('title', 'Copied!');
    } catch (e) {
        button.setAttribute('title', 'Copy failed');
    } finally {
        setTimeout(() => {
            if (originalTitle !== null) {
                button.setAttribute('title', originalTitle);
            } else {
                button.removeAttribute('title');
            }
            button.disabled = false;
        }, COPY_BUTTON_RESET_MS);
    }
}
