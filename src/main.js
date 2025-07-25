import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Escena ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c1a);

// --- Cámara ---
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 3, 7);

// --- Render ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = '100vh';
document.body.appendChild(renderer.domElement);

// --- Controles ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// --- Luces ---
const ambientLight = new THREE.AmbientLight(0x111122, 0.3);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x99bbff, 0.3);
moonLight.position.set(5, 10, 7);
scene.add(moonLight);

// --- Cargar modelo ---
const loader = new GLTFLoader();
loader.load('/Semestral.glb', (gltf) => {
  const city = gltf.scene;
  scene.add(city);

  // Centramos la ciudad
  const box = new THREE.Box3().setFromObject(city);
  const center = new THREE.Vector3();
  box.getCenter(center);
  city.position.sub(center); // Mueve el modelo para que su centro quede en (0, 0, 0)

  // Ajustamos la cámara para orbitar alrededor del centro
  controls.target.set(0, 0, 0);
  controls.update();

  // Ajustamos la cámara más lejos según tamaño de la ciudad
  const size = box.getSize(new THREE.Vector3()).length();
  camera.position.set(size, size * 0.6, size);
  camera.lookAt(0, 0, 0);

  const flickerMaterials = {
    ChinChenNeon: null,
    BarNeon: null,
    HotelNeon: null,
  };

  const streetLampMaterials = [];

  city.traverse((child) => {
    if (child.isMesh && child.material) {
      const matName = child.material.name;

      if (flickerMaterials.hasOwnProperty(matName)) {
        flickerMaterials[matName] = child.material;
      }

      if (matName.startsWith('neon_lamp')) {
        streetLampMaterials.push(child.material);
      }
    }
  });

  // Efectos individuales de parpadeo para carteles
  Object.entries(flickerMaterials).forEach(([name, material]) => {
    if (material) {
      simulateNeonFlicker(material, 1500, name);
    }
  });

  // Parpadeo en grupo para lámparas
  simulateStreetLampFlicker(streetLampMaterials);
});

// --- Simula parpadeo tipo cartel de neón ---
function simulateNeonFlicker(material, interval = 1200, name = '') {
  setInterval(() => {
    const r = Math.random();
    if (r > 0.8) {
      material.emissiveIntensity = 0.0;
      setTimeout(() => {
        material.emissiveIntensity = 1.5;
      }, 300 + Math.random() * 500);
    } else if (r > 0.5) {
      material.emissiveIntensity = 0.2;
      setTimeout(() => material.emissiveIntensity = 1.5, 100);
      setTimeout(() => material.emissiveIntensity = 0.3, 200);
      setTimeout(() => material.emissiveIntensity = 1.5, 300);
    } else {
      material.emissiveIntensity = 1.5;
    }
  }, interval + Math.random() * 300);
}

// --- Parpadeo grupal tipo luz de poste ---
function simulateStreetLampFlicker(materials) {
  setInterval(() => {
    const r = Math.random();
    if (r > 0.9) {
      materials.forEach((mat) => mat.emissiveIntensity = 0.0);
      setTimeout(() => {
        materials.forEach((mat) => mat.emissiveIntensity = 1.0);
      }, 500);
    } else if (r > 0.6) {
      materials.forEach((mat) => mat.emissiveIntensity = 0.2);
      setTimeout(() => materials.forEach((mat) => mat.emissiveIntensity = 0.8), 100);
      setTimeout(() => materials.forEach((mat) => mat.emissiveIntensity = 0.3), 200);
      setTimeout(() => materials.forEach((mat) => mat.emissiveIntensity = 1.0), 300);
    } else {
      materials.forEach((mat) => mat.emissiveIntensity = 1.0);
    }
  }, 2000);
}

// --- Audio de fondo ---
const audio = new Audio('/audio/cyberpunk_ambient.mp3');
audio.loop = true;
audio.volume = 0.4;
audio.play().catch(() => {
  console.warn('Autoplay bloqueado, el usuario debe interactuar para iniciar el audio.');
});

// --- Animación ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
