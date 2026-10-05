import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

gsap.registerPlugin(ScrollTrigger);

const canvas = document.getElementById("film");
const mobile = innerWidth < 800;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !mobile,
  alpha: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.4 : 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.045);

const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, 0.15, 6.4);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(innerWidth, innerHeight),
  mobile ? 0.35 : 0.55,
  0.7,
  0.2
);
composer.addPass(bloom);

/* Environment — gold studio */
const envScene = new THREE.Scene();
const envGeo = new THREE.SphereGeometry(12, 32, 16);
const envMat = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
const envMesh = new THREE.Mesh(envGeo, envMat);
const cnv = document.createElement("canvas");
cnv.width = 512;
cnv.height = 256;
const ctx = cnv.getContext("2d");
const g = ctx.createLinearGradient(0, 0, 512, 256);
g.addColorStop(0, "#050403");
g.addColorStop(0.35, "#1a1208");
g.addColorStop(0.5, "#c9a56a");
g.addColorStop(0.62, "#3a2a14");
g.addColorStop(1, "#000");
ctx.fillStyle = g;
ctx.fillRect(0, 0, 512, 256);
ctx.fillStyle = "rgba(255,220,160,0.35)";
ctx.fillRect(180, 40, 40, 180);
ctx.fillRect(320, 20, 12, 220);
envMat.map = new THREE.CanvasTexture(cnv);
envScene.add(envMesh);
const pmrem = new THREE.PMREMGenerator(renderer);
const envMap = pmrem.fromScene(envScene, 0, 0.1, 20).texture;
scene.environment = envMap;

const gold = new THREE.MeshPhysicalMaterial({
  color: 0xc9a227,
  metalness: 1,
  roughness: 0.18,
  envMapIntensity: 1.6,
  clearcoat: 0.55,
  clearcoatRoughness: 0.2,
});
const goldSoft = gold.clone();
goldSoft.roughness = 0.28;
goldSoft.color = new THREE.Color(0xb8892e);

const diamond = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.05,
  roughness: 0.02,
  transmission: mobile ? 0 : 0.85,
  ior: 2.4,
  thickness: 0.6,
  envMapIntensity: 2.4,
  iridescence: 0.4,
  iridescenceIOR: 1.8,
  specularIntensity: 1,
});

function makeRing() {
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.09, 48, 160), gold);
  band.rotation.x = Math.PI / 2.15;
  g.add(band);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.035, 24, 120), goldSoft);
  inner.rotation.x = Math.PI / 2.15;
  inner.position.y = 0.02;
  g.add(inner);
  const prong = new THREE.CylinderGeometry(0.018, 0.012, 0.16, 8);
  for (let i = 0; i < 6; i++) {
    const p = new THREE.Mesh(prong, gold);
    const a = (i / 6) * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.08, 0.18, Math.sin(a) * 0.08);
    p.lookAt(0, 0.4, 0);
    g.add(p);
  }
  const stone = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), diamond);
  stone.position.y = 0.28;
  stone.rotation.y = 0.4;
  g.add(stone);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 12, 40), gold);
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.18;
  g.add(halo);
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = false;
      o.receiveShadow = false;
    }
  });
  return g;
}

function makeHoop() {
  const g = new THREE.Group();
  const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 24, 80), gold);
  g.add(hoop);
  const drop = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), diamond);
  drop.position.y = -0.48;
  g.add(drop);
  const link = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8), gold);
  link.position.y = -0.32;
  g.add(link);
  return g;
}

function makeBand() {
  const g = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(
    Array.from({ length: 24 }, (_, i) => {
      const t = (i / 24) * Math.PI * 1.6 - 0.3;
      return new THREE.Vector3(Math.cos(t) * 0.9, Math.sin(t * 2) * 0.08, Math.sin(t) * 0.35);
    })
  );
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.045, 12, false), gold);
  g.add(tube);
  return g;
}

const ring = makeRing();
scene.add(ring);

const hoopA = makeHoop();
hoopA.position.set(2.4, 0.2, -0.4);
hoopA.scale.setScalar(0);
scene.add(hoopA);

const hoopB = makeHoop();
hoopB.position.set(-2.2, -0.1, -0.6);
hoopB.scale.setScalar(0);
scene.add(hoopB);

const band = makeBand();
band.position.set(0, -1.2, -1.4);
band.scale.setScalar(0);
scene.add(band);

/* floating plates with photos — luxury stills as ghost layers */
const loader = new THREE.TextureLoader();
function plate(url, pos) {
  const group = new THREE.Group();
  loader.load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const img = tex.image;
    const aspect = img.width / img.height;
    const h = 1.6;
    const geo = new THREE.PlaneGeometry(h * aspect, h);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
    group.userData.mat = mat;
  });
  group.position.copy(pos);
  scene.add(group);
  return group;
}
const stillRing = plate("assets/hero-ring.png", new THREE.Vector3(0, 0.05, 0.2));
const stillNeck = plate("assets/necklace.png", new THREE.Vector3(1.8, 0.1, -0.8));
const stillEar = plate("assets/earrings.png", new THREE.Vector3(-1.7, 0.15, -0.9));
const stillBrace = plate("assets/bracelet.png", new THREE.Vector3(0.2, -1.15, -1.1));

/* dust */
const dustCount = mobile ? 180 : 520;
const dustGeo = new THREE.BufferGeometry();
const dustPos = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  dustPos[i * 3] = (Math.random() - 0.5) * 8;
  dustPos[i * 3 + 1] = (Math.random() - 0.5) * 5;
  dustPos[i * 3 + 2] = (Math.random() - 0.5) * 6;
}
dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
const dust = new THREE.Points(
  dustGeo,
  new THREE.PointsMaterial({
    color: 0xe8d4a4,
    size: 0.012,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
);
scene.add(dust);

/* lights */
const key = new THREE.SpotLight(0xffe4b5, 0, 12, 0.35, 0.6, 1);
key.position.set(-2.4, 3.2, 4);
scene.add(key);
const rim = new THREE.SpotLight(0xffd27a, 0, 10, 0.5, 0.8, 1);
rim.position.set(3, 1.4, -2);
scene.add(rim);
const spark = new THREE.PointLight(0xfff1c8, 0, 3, 2);
spark.position.set(0.3, 0.5, 1.2);
scene.add(spark);
const fill = new THREE.AmbientLight(0x16120c, 0.15);
scene.add(fill);

const satin = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 12),
  new THREE.MeshStandardMaterial({
    color: 0x070707,
    metalness: 0.7,
    roughness: 0.55,
    envMapIntensity: 0.35,
  })
);
satin.rotation.x = -Math.PI / 2.4;
satin.position.set(0, -1.6, -1);
satin.material.opacity = 0;
satin.material.transparent = true;
scene.add(satin);

/* scroll state */
const st = {
  p: 0,
  camR: 6.4,
  camY: 0.18,
  camX: 0,
  camZ: 6.4,
  lookY: 0.15,
  ringRotY: 0,
  ringRotX: 0.2,
  ringScale: 0.08,
  ringX: 0,
  bloom: 0.2,
  key: 0,
  rim: 0,
  spark: 8,
  satin: 0,
  exposure: 0.55,
};

if (!reduce) {
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: "#track",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.15,
    },
  });

  /* 0–20 black to reveal */
  tl.to(st, { p: 0.2, ringScale: 0.55, spark: 18, key: 6, camR: 4.2, camZ: 4.2, bloom: 0.7, exposure: 0.75, duration: 1 }, 0);
  /* 20–40 macro push */
  tl.to(st, { p: 0.4, ringScale: 1.15, camZ: 1.55, camY: 0.28, lookY: 0.22, key: 14, rim: 8, spark: 22, bloom: 0.85, exposure: 0.95, duration: 1 });
  /* 40–60 orbit */
  tl.to(st, { p: 0.6, ringRotY: Math.PI * 1.15, camX: 1.6, camZ: 2.4, camY: 0.45, satin: 0.55, rim: 12, duration: 1 });
  /* 60–75 second piece */
  tl.to(st, { p: 0.75, ringX: -1.35, camX: 0.2, camZ: 3.6, camY: 0.2, duration: 0.75 });
  /* 75–90 constellation */
  tl.to(st, { p: 0.9, camZ: 5.2, camY: 0.05, ringRotY: Math.PI * 1.7, bloom: 0.5, duration: 0.75 });
  /* 90–100 vanish */
  tl.to(st, { p: 1, ringScale: 0.02, key: 0, rim: 0, spark: 2, bloom: 0.25, exposure: 0.4, camZ: 7, satin: 0, duration: 0.6 });
}

const copy = {
  spark: document.querySelector('[data-copy="spark"]'),
  brand: document.querySelector('[data-copy="brand"]'),
  sub: document.querySelector('[data-copy="sub"]'),
  whisper: document.querySelector('[data-copy="whisper"]'),
  end: document.querySelector('[data-copy="end"]'),
  cue: document.querySelector('[data-copy="cue"]'),
};

function setOp(el, v, y = 0) {
  el.style.opacity = String(Math.max(0, Math.min(1, v)));
  el.style.transform = `translate3d(-50%, calc(-50% + ${y}px), 0)`;
  el.style.left = "50%";
  el.style.top = "50%";
}

function fadeRange(p, a, b, c, d) {
  if (p <= a || p >= d) return 0;
  if (p < b) return (p - a) / (b - a);
  if (p > c) return 1 - (p - c) / (d - c);
  return 1;
}

const clock = new THREE.Clock();

function frame() {
  const t = clock.getElapsedTime();
  const p = st.p;

  ring.rotation.y = st.ringRotY + t * 0.05;
  ring.rotation.x = st.ringRotX + Math.sin(t * 0.4) * 0.04;
  ring.position.x = st.ringX;
  ring.position.y = Math.sin(t * 0.6) * 0.03;
  ring.scale.setScalar(Math.max(0.001, st.ringScale));

  const appear2 = fadeRange(p, 0.58, 0.68, 0.88, 0.96);
  hoopA.scale.setScalar(appear2 * 0.95);
  hoopA.position.set(1.55 + st.ringX * 0.1, 0.25 + Math.sin(t * 0.7) * 0.05, -0.3);
  hoopA.rotation.y = t * 0.35;
  hoopA.rotation.z = 0.3;

  hoopB.scale.setScalar(fadeRange(p, 0.7, 0.78, 0.9, 0.97) * 0.85);
  hoopB.position.set(-1.7, -0.05 + Math.cos(t * 0.5) * 0.06, -0.5);
  hoopB.rotation.y = -t * 0.28;

  band.scale.setScalar(fadeRange(p, 0.72, 0.82, 0.9, 0.97));
  band.rotation.y = t * 0.2;

  if (stillRing.userData.mat) {
    stillRing.userData.mat.opacity = fadeRange(p, 0.12, 0.22, 0.42, 0.55) * 0.55;
    stillRing.position.set(st.ringX * 0.2, 0.05, 0.15);
    stillRing.lookAt(camera.position);
  }
  if (stillNeck.userData.mat) {
    stillNeck.userData.mat.opacity = fadeRange(p, 0.62, 0.72, 0.86, 0.94) * 0.85;
    stillNeck.lookAt(camera.position);
  }
  if (stillEar.userData.mat) {
    stillEar.userData.mat.opacity = fadeRange(p, 0.7, 0.78, 0.88, 0.95) * 0.85;
    stillEar.lookAt(camera.position);
  }
  if (stillBrace.userData.mat) {
    stillBrace.userData.mat.opacity = fadeRange(p, 0.74, 0.82, 0.88, 0.95) * 0.8;
    stillBrace.lookAt(camera.position);
  }

  camera.position.x = st.camX + Math.sin(p * Math.PI * 2) * 0.15;
  camera.position.y = st.camY;
  camera.position.z = st.camZ;
  camera.lookAt(st.ringX * 0.4, st.lookY, 0);

  key.intensity = st.key;
  rim.intensity = st.rim;
  spark.intensity = st.spark + Math.sin(t * 9) * 4 * fadeRange(p, 0.18, 0.3, 0.55, 0.7);
  spark.position.set(Math.sin(t * 1.4) * 0.8, 0.4 + Math.cos(t) * 0.2, 1.1);
  renderer.toneMappingExposure = st.exposure;
  bloom.strength = st.bloom;
  satin.material.opacity = st.satin;
  scene.fog.density = 0.03 + (1 - p) * 0.02;

  dust.rotation.y = t * 0.02;
  const dpos = dust.geometry.attributes.position.array;
  for (let i = 1; i < dpos.length; i += 3) {
    dpos[i] += Math.sin(t * 0.2 + i) * 0.00015;
  }
  dust.geometry.attributes.position.needsUpdate = true;
  dust.material.opacity = 0.15 + fadeRange(p, 0.1, 0.3, 0.85, 1) * 0.35;

  setOp(copy.spark, fadeRange(p, 0, 0.02, 0.08, 0.16) + (p < 0.02 ? 0.7 : 0), 0);
  setOp(copy.brand, fadeRange(p, 0.08, 0.16, 0.28, 0.4), 8);
  copy.brand.style.letterSpacing = `${0.12 + p * 0.2}em`;
  setOp(copy.sub, fadeRange(p, 0.14, 0.22, 0.3, 0.42), 90);
  setOp(copy.whisper, fadeRange(p, 0.2, 0.28, 0.34, 0.48), 150);
  setOp(copy.end, fadeRange(p, 0.9, 0.94, 1, 1.05), 0);
  copy.cue.style.opacity = String(fadeRange(p, 0, 0, 0.08, 0.18));

  composer.render();
  requestAnimationFrame(frame);
}

/* first 3 seconds — gold spark breathes before scroll */
gsap.to(st, { spark: 14, bloom: 0.45, duration: 1.8, ease: "sine.inOut" });
gsap.to(copy.spark, { opacity: 1, duration: 1.2, ease: "power2.out" });

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

frame();
