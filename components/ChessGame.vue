<template>
  <div class="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-gray-100 font-sans">
    <div class="relative w-full max-w-5xl aspect-video bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.4)] overflow-hidden flex">
      
      <div class="w-1/4 p-8 border-r border-white/10 flex flex-col justify-between bg-black/40">
        <div>
          <h2 class="text-3xl font-light tracking-tighter mb-1 uppercase italic">Chess <span class="font-bold text-blue-500">3D</span></h2>
          <div class="h-1 w-8 bg-blue-600 mb-8 rounded-full shadow-[0_0_10px_#2563eb]"></div>
          
          <div class="space-y-6">
            <div class="flex items-center space-x-4">
              <div :class="['w-3 h-3 rounded-full transition-all duration-500', currentTurn === 'w' ? 'bg-white shadow-[0_0_15px_white]' : 'bg-gray-800']"></div>
              <p class="text-xs font-bold tracking-[0.2em] uppercase text-gray-400">
                Turno: <span class="text-white">{{ currentTurn === 'w' ? 'Blancas' : 'Negras' }}</span>
              </p>
            </div>
            
            <div class="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-[10px] text-blue-200">
              <p class="font-bold mb-1 tracking-widest uppercase">Estatus del Motor:</p>
              <p class="opacity-80">Si ves las piezas raras, usa el mouse para girar. El motor dice que ya están en posición.</p>
            </div>
          </div>
        </div>
        <div class="text-[10px] text-gray-600 font-mono tracking-widest uppercase italic">ITGAM • ICT Engineering</div>
      </div>

      <div class="w-3/4 relative" ref="canvasContainer">
        <div v-if="isLoading" class="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90 z-20">
          <div class="w-8 h-8 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
          <span class="text-[9px] font-bold tracking-[0.5em] text-blue-400 uppercase">Sincronizando Modelos</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, shallowRef } from 'vue';
import { Chess } from 'chess.js';
import * as THREE from 'three';

const canvasContainer = ref(null);
const isLoading = ref(true);
const currentTurn = ref('w');
const game = shallowRef(new Chess()); 

let scene, camera, renderer, animationId, controls;
const boardSquares = [];
const pieceMeshes = []; 
const loadedGeometries = {};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedSquareNotation = null;

onMounted(async () => {
  // Imports dinámicos para evitar fallos de SSR en Nuxt
  const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
  const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
  
  initThreeJS(OrbitControls);
  createBoard();
  
  const loader = new STLLoader();
  const models = {
    p: 'chess-pedone.stl', r: 'chess-torre.stl', n: 'chess-cavallo.stl',
    b: 'chess-alfiere.stl', q: 'chess-regina.stl', k: 'chess-re.stl'
  };

  await loadAllPieces(loader, models);
  renderPosition();
  
  isLoading.value = false;
  animate();

  window.addEventListener('resize', handleResize);
  canvasContainer.value.addEventListener('pointerdown', onMouseClick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', handleResize);
  canvasContainer.value?.removeEventListener('pointerdown', onMouseClick);
  if (renderer) renderer.dispose();
});

const initThreeJS = (OrbitControls) => {
  scene = new THREE.Scene();
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 15, 15); 

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  canvasContainer.value.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  // ILUMINACIÓN MÁS FUERTE
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(5, 20, 10);
  sun.castShadow = true;
  scene.add(sun);
};

const createBoard = () => {
  const size = 1.2;
  const offset = (size * 8) / 2 - (size / 2);
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const isL = (r + c) % 2 !== 0;
      const geo = new THREE.BoxGeometry(size, 0.2, size);
      const mat = new THREE.MeshStandardMaterial({ color: isL ? 0x1e293b : 0x0f172a });
      const cube = new THREE.Mesh(geo, mat);
      cube.position.set(c * size - offset, 0, r * size - offset);
      cube.receiveShadow = true;
      cube.userData = { notation: `${String.fromCharCode(97 + c)}${8 - r}`, r, c, defCol: isL ? 0x1e293b : 0x0f172a };
      scene.add(cube);
      boardSquares.push(cube);
    }
  }
};

const loadAllPieces = async (loader, models) => {
  const tasks = Object.entries(models).map(([key, file]) => {
    return new Promise((res) => {
      loader.load(`/models/${file}`, (geo) => {
        geo.center();
        geo.rotateX(-Math.PI / 2); 
        // AUTO-ESCALADO: Forzamos que el modelo quepa en la casilla
        geo.computeBoundingBox();
        const boxSize = new THREE.Vector3();
        geo.boundingBox.getSize(boxSize);
        const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z);
        geo.userData.autoScale = 0.8 / maxDim; // El modelo ahora mide 0.8 unidades reales
        
        loadedGeometries[key] = geo;
        res();
      });
    });
  });
  await Promise.all(tasks);
};

const renderPosition = () => {
  pieceMeshes.forEach(m => scene.remove(m));
  pieceMeshes.length = 0;
  const board = game.value.board();
  const size = 1.2;
  const offset = (size * 8) / 2 - (size / 2);

  board.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      if (cell) {
        const geo = loadedGeometries[cell.type];
        if (!geo) return;

        // MATERIAL DE DEBUG: Si esto sale, es que la geometría está cargada
        const mat = new THREE.MeshStandardMaterial({ 
          color: cell.color === 'w' ? 0xffffff : 0x111111,
          metalness: 0.3,
          roughness: 0.2
        });
        
        const mesh = new THREE.Mesh(geo, mat);
        const s = geo.userData.autoScale;
        mesh.scale.set(s, s, s);
        
        mesh.position.set(cIdx * size - offset, 0.2, rIdx * size - offset);
        if (cell.color === 'b') mesh.rotation.y = Math.PI;
        
        scene.add(mesh);
        pieceMeshes.push(mesh);
      }
    });
  });
};

const onMouseClick = (e) => {
  const rect = canvasContainer.value.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(boardSquares);

  if (hits.length > 0) {
    const square = hits[0].object.userData.notation;
    if (!selectedSquareNotation) {
      const p = game.value.get(square);
      if (p && p.color === game.value.turn()) {
        selectedSquareNotation = square;
        hits[0].object.material.color.setHex(0x3b82f6); 
      }
    } else {
      try {
        const move = game.value.move({ from: selectedSquareNotation, to: square, promotion: 'q' });
        if (move) {
          currentTurn.value = game.value.turn();
          renderPosition();
        }
      } catch (err) {}
      selectedSquareNotation = null;
      resetColors();
    }
  }
};

const resetColors = () => boardSquares.forEach(s => s.material.color.setHex(s.userData.defCol));
const handleResize = () => {
  const w = canvasContainer.value.clientWidth;
  const h = canvasContainer.value.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
};
const animate = () => {
  animationId = requestAnimationFrame(animate);
  if (controls) controls.update();
  renderer.render(scene, camera);
};
</script>