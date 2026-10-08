import './styles.css';
import { mountAvatar } from './avatar';
import { resolveModelUrl } from './config';

const root = document.querySelector<HTMLElement>('#avatar');
if (!root) throw new Error('Missing #avatar');

const params = new URLSearchParams(window.location.search);
const background = params.get('background') === 'transparent' ? 'transparent' : 'hud';
document.body.classList.toggle('is-transparent', background === 'transparent');

try {
  mountAvatar(root, { modelUrl: resolveModelUrl(), background });
} catch (error) {
  root.textContent = error instanceof Error ? error.message : 'Avatar failed to start';
}
