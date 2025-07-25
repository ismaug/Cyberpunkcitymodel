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

// --- Luces ---
scene.add(new THREE.AmbientLight(0x111122, 0.7));

const moonLight = new THREE.DirectionalLight(0x99bbff, 0.5);
moonLight.position.set(10, 15, 10);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(1024, 1024);
moonLight.shadow.bias = -0.001;
scene.add(moonLight);


const audio = new Audio('/effect.mp3');
audio.loop = true;
audio.volume = 0.4;
audio.play();


let deloreanFly = null;
let deloreanStartZ = -40;
let deloreanEndZ = 40;
let deloreanSpeed = 0.5;
let isDeloreanVisible = true;
let delayBeforeNextCar = 3000;

// --- Audio del coche (radio) ---
const listener = new THREE.AudioListener();
camera.add(listener);

const carRadio = new THREE.Audio(listener);
const audioLoader = new THREE.AudioLoader();
let carRadioVolume = 0;
let isFadingOut = false;
let carRadioReady = false;




const loader = new GLTFLoader();
loader.load('/Semestral_def.glb', (gltf) => {
  const city = gltf.scene;

  city.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }

    if (child.name === 'delorean_fly') {
      deloreanFly = child;
      deloreanFly.position.z = deloreanStartZ;
      deloreanFly.visible = true;
    }
  });

  const box = new THREE.Box3().setFromObject(city);
  const center = new THREE.Vector3();
  box.getCenter(center);
  city.position.sub(center);
  scene.add(city);

  const size = box.getSize(new THREE.Vector3()).length();
  camera.position.set(size, size * 0.6, size);
  controls.target.set(0, 0, 0);
  controls.update();

  // Cargar modelo de Batman después de añadir ciudad
  const batmanLoader = new GLTFLoader();
  batmanLoader.load('/batman.glb', (batmanGltf) => {
    const batmanModel = batmanGltf.scene;
    batmanModel.scale.set(1, 1, 1);

    const rooftop = city.getObjectByName('building_1');
    if (rooftop) {
      const rooftopPos = new THREE.Vector3();
      rooftop.getWorldPosition(rooftopPos);
      rooftopPos.y += 1.5;
      batmanModel.position.copy(rooftopPos);

      batmanModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      scene.add(batmanModel);
    } else {
      console.warn('No se encontró el objeto "building_1" en el modelo de la ciudad.');
    }
  });

  const flickerMaterials = { ChinChenNeon: null, BarNeon: null, HotelNeon: null };
  const streetLampMaterials = [];

  city.traverse((child) => {
    if (child.isMesh && child.material) {
      const matName = child.material.name;
      const basePosition = child.getWorldPosition(new THREE.Vector3());

      // Neon signs
      if (flickerMaterials.hasOwnProperty(matName)) {
        flickerMaterials[matName] = child.material;

        let positionOffset = new THREE.Vector3(0, 2, 0);
        let lightColor = 0xff00cc;
        let intensity = 10;

        switch (matName) {
          case 'ChinChenNeon':
            positionOffset.set(1, 1, -4);
            lightColor = 0x33ff00;
            intensity = 12;
            break;
          case 'BarNeon':
            positionOffset.set(4, 2, -5);
            lightColor = 0xff1500;
            intensity = 10;
            break;
          case 'HotelNeon':
            positionOffset.set(0, 3, -0.5);
            lightColor = 0x3cd7ff;
            intensity = 14;
            break;
        }

        const neonLight = new THREE.PointLight(lightColor, intensity, 10);
        neonLight.position.copy(basePosition.clone().add(positionOffset));
        neonLight.castShadow = true;
        scene.add(neonLight);
      }

      // Postes de luz
      if (matName.startsWith('neon_lamp')) {
        streetLampMaterials.push(child.material);
        const lampLight = new THREE.PointLight(0xffddaa, 8, 10);
        lampLight.position.copy(basePosition.clone());
        lampLight.castShadow = true;
        scene.add(lampLight);
      }

      if (matName === 'lamp_neon') {
        const lampLight = new THREE.PointLight(0xffeeaa, 5, 8);
        lampLight.position.copy(basePosition.clone());
        lampLight.castShadow = true;
        scene.add(lampLight);
      }
    }
  });

  Object.entries(flickerMaterials).forEach(([name, material]) => {
    if (material) simulateNeonFlicker(material, 1500, name);
  });

  simulateStreetLampFlicker(streetLampMaterials);
});


function simulateNeonFlicker(material, interval = 1200) {
  setInterval(() => {
    const r = Math.random();
    if (r > 0.8) {
      material.emissiveIntensity = 0.0;
      setTimeout(() => (material.emissiveIntensity = 1.5), 300 + Math.random() * 500);
    } else if (r > 0.5) {
      material.emissiveIntensity = 0.2;
      setTimeout(() => (material.emissiveIntensity = 1.5), 100);
      setTimeout(() => (material.emissiveIntensity = 0.3), 200);
      setTimeout(() => (material.emissiveIntensity = 1.5), 300);
    } else {
      material.emissiveIntensity = 1.5;
    }
  }, interval + Math.random() * 300);
}

function simulateStreetLampFlicker(materials) {
  setInterval(() => {
    const r = Math.random();
    if (r > 0.9) {
      materials.forEach((mat) => (mat.emissiveIntensity = 0.0));
      setTimeout(() => materials.forEach((mat) => (mat.emissiveIntensity = 1.0)), 500);
    } else if (r > 0.6) {
      materials.forEach((mat) => (mat.emissiveIntensity = 0.2));
      setTimeout(() => materials.forEach((mat) => (mat.emissiveIntensity = 0.8)), 100);
      setTimeout(() => materials.forEach((mat) => (mat.emissiveIntensity = 0.3)), 200);
      setTimeout(() => materials.forEach((mat) => (mat.emissiveIntensity = 1.0)), 300);
    } else {
      materials.forEach((mat) => (mat.emissiveIntensity = 1.0));
    }
  }, 2000);
}


function animate() {
  requestAnimationFrame(animate);
  controls.update();

  if (deloreanFly && isDeloreanVisible) {
    deloreanFly.visible = true;
    deloreanFly.position.z += deloreanSpeed;

    if (carRadioReady && !carRadio.isPlaying) {
      carRadio.play();
    }

    const baseSpeed = 0.5;
    const speedRatio = deloreanSpeed / baseSpeed;
    carRadio.setPlaybackRate(speedRatio);

    if (carRadioVolume < 0.4 && !isFadingOut) {
      carRadioVolume += 0.01;
      carRadio.setVolume(carRadioVolume);
    }

    if (deloreanFly.position.z >= deloreanEndZ) {
      isFadingOut = true;
      const fadeInterval = setInterval(() => {
        if (carRadioVolume > 0.01) {
          carRadioVolume -= 0.01;
          carRadio.setVolume(carRadioVolume);
        } else {
          clearInterval(fadeInterval);
          carRadio.stop();
          carRadioVolume = 0;
          isFadingOut = false;
        }
      }, 100);

      isDeloreanVisible = false;
      deloreanFly.visible = false;

      setTimeout(() => {
        deloreanFly.position.z = deloreanStartZ;
        deloreanFly.visible = true;
        isDeloreanVisible = true;
      }, delayBeforeNextCar);
    }
  }

  renderer.render(scene, camera);
}
animate();

// --- Responsive ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
