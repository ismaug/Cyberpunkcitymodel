import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// --- Escena ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c1a);

// --- Cámara ---
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- Render ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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

// --- Luces generales ---
const ambientLight = new THREE.AmbientLight(0x111122, 0.4);
scene.add(ambientLight);

const moonLight = new THREE.DirectionalLight(0x99bbff, 0.5);
moonLight.position.set(10, 15, 10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
moonLight.shadow.bias = -0.001;
scene.add(moonLight);

// --- Cargar modelo ---
const loader = new GLTFLoader();
loader.load('/Semestral.glb', (gltf) => {
  const city = gltf.scene;
  city.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Centrar modelo
  const box = new THREE.Box3().setFromObject(city);
  const center = new THREE.Vector3();
  box.getCenter(center);
  city.position.sub(center);
  scene.add(city);

  // Cámara y control centrados
  const size = box.getSize(new THREE.Vector3()).length();
  camera.position.set(size, size * 0.6, size);
  controls.target.set(0, 0, 0);
  controls.update();

  // --- Materiales de carteles y faroles ---
  const flickerMaterials = {
    ChinChenNeon: null,
    BarNeon: null,
    HotelNeon: null,
  };
  const streetLampMaterials = [];

  // --- Añadir luces puntuales a carteles y faroles ---
city.traverse((child) => {
  if (child.isMesh && child.material) {
    const matName = child.material.name;
    const basePosition = child.getWorldPosition(new THREE.Vector3());

    // Guardar materiales de carteles
    if (flickerMaterials.hasOwnProperty(matName)) {
      flickerMaterials[matName] = child.material;

      // Definir ajustes por tipo de cartel
      let positionOffset = new THREE.Vector3(0, 2, 0); // default
      let lightColor = 0xff00cc; // default
      let intensity = 10;

      switch (matName) {
        case 'ChinChenNeon':
          positionOffset.set(1, 1, -4);
          lightColor = 0x33ff00; // sin canal alfa
          intensity = 12;
          break;
        case 'BarNeon':
          positionOffset.set(4, 2, -5);
          lightColor = 0xff1500; // sin canal alfa
          intensity = 10;
          break;
        case 'HotelNeon':
          positionOffset.set(0, 3, -0.5);
          lightColor = 0x3cd7ff; // sin canal alfa
          intensity = 14;
          break;
        default:
          break;
      }

      // Crear luz puntual
      const neonLight = new THREE.PointLight(lightColor, intensity, 10);
      neonLight.position.copy(basePosition.clone().add(positionOffset));
      neonLight.castShadow = true;
      scene.add(neonLight);
    }

    // Faroles (neon_lamp)
    if (matName.startsWith('neon_lamp')) {
      streetLampMaterials.push(child.material);

      const lampLight = new THREE.PointLight(0xffddaa, 8, 10);
      lampLight.position.copy(basePosition.clone().add(new THREE.Vector3(-2, -1, -4)));
      lampLight.castShadow = true;
      scene.add(lampLight);
    }
  }
});

  // Parpadeo
  Object.entries(flickerMaterials).forEach(([name, material]) => {
    if (material) simulateNeonFlicker(material, 1500, name);
  });

  simulateStreetLampFlicker(streetLampMaterials);
});

// --- Parpadeo cartel neon ---
function simulateNeonFlicker(material, interval = 1200) {
  setInterval(() => {
    const r = Math.random();
    if (r > 0.8) {
      material.emissiveIntensity = 0.0;
      setTimeout(() => material.emissiveIntensity = 1.5, 300 + Math.random() * 500);
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

// --- Parpadeo poste ---
function simulateStreetLampFlicker(materials) {
  setInterval(() => {
    const r = Math.random();
    if (r > 0.9) {
      materials.forEach((mat) => mat.emissiveIntensity = 0.0);
      setTimeout(() => materials.forEach((mat) => mat.emissiveIntensity = 1.0), 500);
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
