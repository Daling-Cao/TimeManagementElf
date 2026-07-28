import { createRoot } from 'react-dom/client';
import DesktopPet from './DesktopPet';
import './pet.css';

const container = document.getElementById('pet-root');
if (container) {
  createRoot(container).render(<DesktopPet />);
}
