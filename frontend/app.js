import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const API_BASE = 'http://localhost:3000/api';

let scene, camera, renderer, controls;
let cabinets = [];
let raycaster, mouse;
let selectedCabinet = null;

const tooltip = document.getElementById('tooltip');
const tooltipTitle = document.getElementById('tooltip-title');
const tooltipTemp = document.getElementById('tooltip-temp');
const tooltipStatus = document.getElementById('tooltip-status');
const cabinetList = document.getElementById('cabinet-list');
const loading = document.getElementById('loading');

function init() {
  const container = document.getElementById('scene-container');
  const canvas = document.getElementById('canvas');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0e27);
  scene.fog = new THREE.Fog(0x0a0e27, 15, 40);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 8, 12);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2.1;
  controls.minDistance = 5;
  controls.maxDistance = 25;
  controls.target.set(0, 2, 0);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  createLights();
  createRoom();
  createCabinets();
  createFloorGrid();

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('click', onMouseClick);
  window.addEventListener('mousemove', onMouseMove);

  loading.style.display = 'none';

  fetchTemperatures();
  setInterval(fetchTemperatures, 3000);

  animate();
}

function createLights() {
  const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
  mainLight.position.set(5, 10, 5);
  mainLight.castShadow = true;
  mainLight.shadow.mapSize.width = 2048;
  mainLight.shadow.mapSize.height = 2048;
  mainLight.shadow.camera.near = 0.5;
  mainLight.shadow.camera.far = 50;
  mainLight.shadow.camera.left = -15;
  mainLight.shadow.camera.right = 15;
  mainLight.shadow.camera.top = 15;
  mainLight.shadow.camera.bottom = -15;
  scene.add(mainLight);

  const fillLight = new THREE.DirectionalLight(0x7b8ff1, 0.4);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  const pointLight1 = new THREE.PointLight(0x7b8ff1, 0.5, 20);
  pointLight1.position.set(-6, 4, -3);
  scene.add(pointLight1);

  const pointLight2 = new THREE.PointLight(0x7b8ff1, 0.5, 20);
  pointLight2.position.set(6, 4, 3);
  scene.add(pointLight2);
}

function createRoom() {
  const floorGeometry = new THREE.PlaneGeometry(30, 25);
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1f3a,
    roughness: 0.9,
    metalness: 0.1
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f142e,
    roughness: 0.8,
    metalness: 0.2,
    side: THREE.BackSide
  });

  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(30, 12), wallMaterial);
  backWall.position.set(0, 6, -12.5);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(25, 12), wallMaterial);
  leftWall.position.set(-15, 6, 0);
  leftWall.rotation.y = Math.PI / 2;
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(25, 12), wallMaterial);
  rightWall.position.set(15, 6, 0);
  rightWall.rotation.y = -Math.PI / 2;
  rightWall.receiveShadow = true;
  scene.add(rightWall);
}

function createFloorGrid() {
  const gridHelper = new THREE.GridHelper(30, 30, 0x2a3566, 0x1a2350);
  gridHelper.position.y = 0.01;
  scene.add(gridHelper);
}

function createCabinet(x, z, id) {
  const cabinetGroup = new THREE.Group();
  cabinetGroup.userData.id = id;

  const width = 1.2;
  const height = 4.5;
  const depth = 1.0;

  const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d3759,
    roughness: 0.6,
    metalness: 0.3
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  cabinetGroup.add(body);

  const doorGeometry = new THREE.BoxGeometry(width * 0.96, height * 0.96, 0.05);
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: 0x3d4a7a,
    roughness: 0.4,
    metalness: 0.5
  });
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(0, height / 2, depth / 2 + 0.02);
  cabinetGroup.add(door);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a6ab0,
    roughness: 0.3,
    metalness: 0.7
  });

  const frameGeo = new THREE.BoxGeometry(width * 0.98, 0.06, depth + 0.06);
  const topFrame = new THREE.Mesh(frameGeo, frameMaterial);
  topFrame.position.set(0, height, 0);
  cabinetGroup.add(topFrame);

  const bottomFrame = new THREE.Mesh(frameGeo, frameMaterial);
  bottomFrame.position.set(0, 0.03, 0);
  cabinetGroup.add(bottomFrame);

  const ledStripGeo = new THREE.BoxGeometry(width * 0.9, 0.02, 0.06);
  const ledMaterial = new THREE.MeshBasicMaterial({ color: 0x4ade80 });
  const ledStrip = new THREE.Mesh(ledStripGeo, ledMaterial);
  ledStrip.position.set(0, height - 0.15, depth / 2 + 0.05);
  ledStrip.userData.isLed = true;
  cabinetGroup.add(ledStrip);

  const screenGeo = new THREE.PlaneGeometry(width * 0.7, 0.4);
  const screenMaterial = new THREE.MeshBasicMaterial({
    color: 0x1e3a5f,
    side: THREE.DoubleSide
  });
  const screen = new THREE.Mesh(screenGeo, screenMaterial);
  screen.position.set(0, height - 0.5, depth / 2 + 0.06);
  cabinetGroup.add(screen);

  const rackCount = 8;
  const rackHeight = (height - 1.5) / rackCount;
  const rackMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1f35,
    roughness: 0.7,
    metalness: 0.4
  });

  for (let i = 0; i < rackCount; i++) {
    const serverGeo = new THREE.BoxGeometry(width * 0.82, rackHeight * 0.75, depth * 0.6);
    const server = new THREE.Mesh(serverGeo, rackMaterial);
    server.position.set(0, 0.8 + i * rackHeight + rackHeight / 2, 0);
    cabinetGroup.add(server);

    const ledGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
    const serverLedMat = new THREE.MeshBasicMaterial({
      color: Math.random() > 0.3 ? 0x22c55e : 0xef4444
    });
    const serverLed = new THREE.Mesh(ledGeo, serverLedMat);
    serverLed.position.set(-width * 0.35, 0.8 + i * rackHeight + rackHeight / 2, depth / 2 + 0.04);
    cabinetGroup.add(serverLed);
  }

  cabinetGroup.position.set(x, 0, z);
  scene.add(cabinetGroup);

  cabinets.push({
    group: cabinetGroup,
    body: body,
    ledStrip: ledStrip,
    id: id,
    originalColor: doorMaterial.color.clone()
  });

  return cabinetGroup;
}

function createCabinets() {
  const startX = -4.8;
  const spacing = 2.4;

  for (let i = 0; i < 5; i++) {
    createCabinet(startX + i * spacing, 0, i + 1);
  }
}

async function fetchTemperatures() {
  try {
    const response = await fetch(`${API_BASE}/cabinets/temps`);
    const result = await response.json();
    if (result.success) {
      updateCabinetList(result.data);
      updateCabinetColors(result.data);
    }
  } catch (error) {
    console.error('获取温度失败:', error);
  }
}

function updateCabinetList(data) {
  cabinetList.innerHTML = '';
  data.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cabinet-list-item';
    const statusClass = item.status === 'warning' ? 'status-warning' : 'status-normal';
    div.innerHTML = `
      <span>${item.name}</span>
      <span class="temp ${statusClass}">${item.temperature}°C</span>
    `;
    cabinetList.appendChild(div);
  });
}

function updateCabinetColors(data) {
  data.forEach(item => {
    const cabinet = cabinets.find(c => c.id === item.id);
    if (cabinet && cabinet.ledStrip) {
      const color = item.status === 'warning' ? 0xf59e0b : 0x4ade80;
      cabinet.ledStrip.material.color.setHex(color);
    }
  });
}

function onMouseClick(event) {
  if (!raycaster || !camera || !cabinets || cabinets.length === 0) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const cabinetGroups = cabinets.map(c => c.group);
  const intersects = raycaster.intersectObjects(cabinetGroups, true);

  if (!intersects || intersects.length === 0) {
    hideTooltip();
    selectedCabinet = null;
    return;
  }

  let cabinet = null;
  for (let i = 0; i < intersects.length; i++) {
    const int = intersects[i];
    if (!int || !int.object) continue;

    let obj = int.object;
    while (obj) {
      if (obj.userData && obj.userData.id) {
        cabinet = cabinets.find(c => c.group === obj);
        if (cabinet) break;
      }
      obj = obj.parent;
    }
    if (cabinet) break;
  }

  if (cabinet) {
    selectedCabinet = cabinet;
    showTooltip(cabinet, event);
    fetchCabinetDetail(cabinet.id);
  } else {
    hideTooltip();
    selectedCabinet = null;
  }
}

function onMouseMove(event) {
  if (selectedCabinet) {
    updateTooltipPosition(event);
  }
}

async function fetchCabinetDetail(id) {
  try {
    const response = await fetch(`${API_BASE}/cabinets/${id}/temp`);
    const result = await response.json();
    if (result.success) {
      updateTooltipContent(result.data);
    }
  } catch (error) {
    console.error('获取机柜详情失败:', error);
  }
}

function showTooltip(cabinet, event) {
  tooltipTitle.textContent = `机柜 ${cabinet.id}`;
  tooltipTemp.textContent = '加载中...';
  tooltipStatus.textContent = '查询中';
  tooltipStatus.className = 'status-badge normal';
  tooltip.classList.add('visible');
  updateTooltipPosition(event);
}

function updateTooltipContent(data) {
  tooltipTitle.textContent = data.name;
  tooltipTemp.textContent = `${data.temperature}°C`;
  if (data.status === 'warning') {
    tooltipStatus.textContent = '温度告警';
    tooltipStatus.className = 'status-badge warning';
  } else {
    tooltipStatus.textContent = '运行正常';
    tooltipStatus.className = 'status-badge normal';
  }
}

function updateTooltipPosition(event) {
  const tooltipWidth = tooltip.offsetWidth;
  const tooltipHeight = tooltip.offsetHeight;

  let x = event.clientX - tooltipWidth / 2;
  let y = event.clientY - tooltipHeight - 20;

  if (x < 10) x = 10;
  if (x + tooltipWidth > window.innerWidth - 10) {
    x = window.innerWidth - tooltipWidth - 10;
  }
  if (y < 80) y = event.clientY + 20;

  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}

function hideTooltip() {
  tooltip.classList.remove('visible');
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

init();
