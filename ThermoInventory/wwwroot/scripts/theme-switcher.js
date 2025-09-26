function initializeThemeSwitcher() {
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const THEME_KEY = 'themePreference';

    if (!themeToggle) {
        return;
    }

    const savedTheme = localStorage.getItem(THEME_KEY);

    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggle.checked = true;
    }

    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            body.classList.add('dark-mode');
            localStorage.setItem(THEME_KEY, 'dark');
        } else {
            body.classList.remove('dark-mode');
            localStorage.setItem(THEME_KEY, 'light');
        }
    });
}

export { initializeThemeSwitcher };