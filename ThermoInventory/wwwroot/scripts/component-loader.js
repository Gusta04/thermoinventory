/**
 * @file component-loader.js
 * @description
 */

// 1. Importa as funções que precisam ser inicializadas
import { initializeThemeSwitcher } from './theme-switcher.js';
import { initializeNavbar } from './navbar.js';
import {initializeInventarioPage} from "./inventario.js";

document.addEventListener('DOMContentLoaded', () => {
    const placeholders = document.querySelectorAll('[data-include-html]');

    const loadPromises = [];

    placeholders.forEach(el => {
        const file = el.getAttribute('data-include-html');
        if (file) {
            const promise = fetch(file)
                .then(response => {
                    if (response.ok) return response.text();
                    throw new Error(`Erro ao carregar componente: ${response.statusText}`);
                })
                .then(html => {
                    el.innerHTML = html;
                })
                .catch(error => {
                    el.innerHTML = 'Componente não pôde ser carregado.';
                    console.error(error);
                });
            loadPromises.push(promise);
        }
    });

    Promise.all(loadPromises).then(() => {
        console.log("Componentes carregados. Inicializando scripts...");
        initializeThemeSwitcher();
        initializeNavbar();
        initializeInventarioPage();
    });
});