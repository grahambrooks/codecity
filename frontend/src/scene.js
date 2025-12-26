import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Scene {
  constructor(container) {
    this.container = container;
    this.buildings = new Map();
    this.hoveredBuilding = null;
    this.selectedBuilding = null;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.init();
    this.setupLights();
    this.setupGround();
    this.setupEventListeners();
    this.animate();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(30, 40, 30);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 150;

    // Buildings group
    this.buildingsGroup = new THREE.Group();
    this.scene.add(this.buildingsGroup);

    // City blocks group (for directory view)
    this.blocksGroup = new THREE.Group();
    this.scene.add(this.blocksGroup);

    // Labels group
    this.labelsGroup = new THREE.Group();
    this.scene.add(this.labelsGroup);
  }

  setupLights() {
    // Ambient light
    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    // Main directional light
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(50, 100, 50);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.near = 10;
    directional.shadow.camera.far = 200;
    directional.shadow.camera.left = -50;
    directional.shadow.camera.right = 50;
    directional.shadow.camera.top = 50;
    directional.shadow.camera.bottom = -50;
    this.scene.add(directional);

    // Fill light
    const fill = new THREE.DirectionalLight(0x4ecdc4, 0.3);
    fill.position.set(-30, 20, -30);
    this.scene.add(fill);

    // Hemisphere light for sky/ground ambience
    const hemisphere = new THREE.HemisphereLight(0x4ecdc4, 0x1a1a2e, 0.3);
    this.scene.add(hemisphere);
  }

  setupGround() {
    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a4e,
      roughness: 0.9,
      metalness: 0.1,
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    // Grid helper
    const grid = new THREE.GridHelper(200, 40, 0x3a3a5e, 0x3a3a5e);
    grid.position.y = 0.01;
    this.scene.add(grid);
  }

  setupEventListeners() {
    window.addEventListener('resize', () => this.onResize());
    this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  onMouseMove(event) {
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.buildingsGroup.children, true);

    // Reset previous hover
    if (this.hoveredBuilding) {
      this.hoveredBuilding.material.emissive.setHex(0x000000);
    }

    if (intersects.length > 0) {
      const building = this.findParentBuilding(intersects[0].object);
      if (building && building.userData.data) {
        this.hoveredBuilding = building;
        building.material.emissive.setHex(0x222244);
        this.container.style.cursor = 'pointer';

        // Show tooltip
        if (this.onHover) {
          this.onHover(building.userData.data, event.clientX, event.clientY);
        }
      }
    } else {
      this.hoveredBuilding = null;
      this.container.style.cursor = 'default';
      if (this.onHover) {
        this.onHover(null);
      }
    }
  }

  onClick(event) {
    if (this.hoveredBuilding && this.hoveredBuilding.userData.data) {
      if (this.onSelect) {
        this.onSelect(this.hoveredBuilding.userData.data);
      }
    }
  }

  findParentBuilding(object) {
    while (object) {
      if (object.userData && object.userData.data) {
        return object;
      }
      object = object.parent;
    }
    return null;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  clearBuildings() {
    // Clear buildings
    while (this.buildingsGroup.children.length > 0) {
      const child = this.buildingsGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.buildingsGroup.remove(child);
    }
    this.buildings.clear();

    // Clear blocks
    while (this.blocksGroup.children.length > 0) {
      const child = this.blocksGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
      this.blocksGroup.remove(child);
    }

    // Clear labels
    while (this.labelsGroup.children.length > 0) {
      const child = this.labelsGroup.children[0];
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (child.material.map) child.material.map.dispose();
        child.material.dispose();
      }
      this.labelsGroup.remove(child);
    }
  }

  addBuilding(data, position, dimensions, color) {
    const { width, depth, height } = dimensions;

    // Main building body
    const geometry = new THREE.BoxGeometry(width, height, depth);
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.7,
      metalness: 0.2,
    });

    const building = new THREE.Mesh(geometry, material);
    building.position.set(position.x, height / 2, position.z);
    building.castShadow = true;
    building.receiveShadow = true;
    building.userData.data = data;

    // Add roof accent
    const roofGeometry = new THREE.BoxGeometry(width * 0.9, 0.2, depth * 0.9);
    const roofMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(1.2),
      roughness: 0.5,
      metalness: 0.3,
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = height / 2;
    building.add(roof);

    // Add window lines for tall buildings
    if (height > 3) {
      const windowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffee,
        transparent: true,
        opacity: 0.3,
      });

      const floors = Math.floor(height / 2);
      for (let i = 0; i < floors; i++) {
        const windowGeometry = new THREE.BoxGeometry(width * 0.8, 0.3, depth * 0.01);
        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(0, -height / 2 + 1 + i * 2, depth / 2 + 0.01);
        building.add(window1);

        const window2 = window1.clone();
        window2.position.z = -depth / 2 - 0.01;
        building.add(window2);
      }
    }

    this.buildingsGroup.add(building);
    this.buildings.set(data.id || data.path, building);

    return building;
  }

  focusOnBuildings() {
    if (this.buildingsGroup.children.length === 0) return;

    // Calculate bounding box
    const box = new THREE.Box3().setFromObject(this.buildingsGroup);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Position camera to see all buildings
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;

    this.camera.position.set(
      center.x + distance,
      distance * 0.8,
      center.z + distance
    );
    this.controls.target.copy(center);
    this.controls.update();
  }

  addCityBlock(blockData) {
    const { position, width, depth, color, repoName } = blockData;

    // Create block ground plane
    const blockGeometry = new THREE.PlaneGeometry(width, depth);
    const blockMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color).multiplyScalar(0.3),
      roughness: 0.8,
      metalness: 0.1,
      transparent: true,
      opacity: 0.6,
    });

    const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.rotation.x = -Math.PI / 2;
    block.position.set(position.x, 0.02, position.z);
    block.receiveShadow = true;
    this.blocksGroup.add(block);

    // Add border
    const borderGeometry = new THREE.EdgesGeometry(blockGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8,
    });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    border.rotation.x = -Math.PI / 2;
    border.position.set(position.x, 0.03, position.z);
    this.blocksGroup.add(border);

    // Add repo name label
    this.addLabel(repoName, position, width, depth);
  }

  addLabel(text, position, blockWidth, blockDepth) {
    // Create canvas for text
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 64;

    // Draw text
    context.fillStyle = 'rgba(0, 0, 0, 0)';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 32px -apple-system, BlinkMacSystemFont, sans-serif';
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Truncate long names
    let displayText = text;
    if (context.measureText(text).width > canvas.width - 20) {
      while (context.measureText(displayText + '...').width > canvas.width - 20 && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      displayText += '...';
    }
    context.fillText(displayText, canvas.width / 2, canvas.height / 2);

    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
    });

    const sprite = new THREE.Sprite(spriteMaterial);

    // Scale based on block width
    const scale = Math.max(blockWidth * 0.8, 10);
    sprite.scale.set(scale, scale * 0.125, 1);

    // Position at front of block
    sprite.position.set(position.x, 0.5, position.z + blockDepth / 2 + 2);

    this.labelsGroup.add(sprite);
  }
}
