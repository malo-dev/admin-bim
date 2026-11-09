import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

// Icônes : on les montre seulement quand la police « Material Symbols » est
// chargée (sinon leurs noms s'affichent en texte). Filet de sécurité à 4 s.
const showIcons = () => document.documentElement.classList.remove('icons-loading')
if (document.fonts?.load) {
  Promise.race([
    document.fonts.load('24px "Material Symbols Outlined"', 'home'),
    new Promise((resolve) => setTimeout(resolve, 4000))
  ]).finally(showIcons)
} else {
  showIcons()
}

createApp(App).use(router).mount('#app')
