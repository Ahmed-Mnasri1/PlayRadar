/* ==========================================================================
   PlayRadar — scènes 3D (three.js r149, sans module ni serveur)
   · ring  : douze vraies jaquettes en orbite au-dessus d'un radar ;
             chaque jaquette s'allume quand le faisceau passe dessous.
   · helix : un mur de jaquettes en perspective qui défile (diapositive de fin).
   Les textures sont des data URI (textures.js) : WebGL refuse les images
   chargées depuis file://.
   ========================================================================== */
window.PRGL = (function () {
  "use strict";
  const W = 1920,
    H = 1080;
  const NIGHT = 0x0e1320;
  let texPromise = null;

  function textures() {
    if (texPromise) return texPromise;
    texPromise = Promise.all(
      (window.COVER_TEX || []).map(
        (t) =>
          new Promise((res) => {
            const img = new Image();
            img.onload = () => {
              const tx = new THREE.Texture(img);
              tx.encoding = THREE.sRGBEncoding;
              tx.anisotropy = 8;
              tx.needsUpdate = true;
              res(tx);
            };
            img.onerror = () => res(null);
            img.src = t.src;
          })
      )
    ).then((a) => a.filter(Boolean));
    return texPromise;
  }

  /** Faisceau du radar : dégradé conique dessiné sur un canvas 2D */
  function sweepTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const g = c.getContext("2d");
    const grad = g.createConicGradient(-Math.PI / 2, 256, 256);
    grad.addColorStop(0, "rgba(200,241,105,0)");
    grad.addColorStop(0.72, "rgba(200,241,105,0)");
    grad.addColorStop(0.985, "rgba(200,241,105,0.42)");
    grad.addColorStop(1, "rgba(200,241,105,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(256, 256, 256, 0, Math.PI * 2);
    g.fill();
    // ligne d'attaque du faisceau
    g.strokeStyle = "rgba(200,241,105,0.95)";
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(256, 256);
    g.lineTo(256, 0);
    g.stroke();
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    return t;
  }

  /** Une jaquette : recto texturé, verso sombre, reflet au sol */
  function card(tex, w, h, withReflection) {
    const grp = new THREE.Group();
    const geo = new THREE.PlaneGeometry(w, h);
    const front = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff }));
    const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x182033 }));
    back.rotation.y = Math.PI;
    back.position.z = -0.004;
    grp.add(front, back);
    // liseré fin autour de la jaquette
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x3a4768, transparent: true, opacity: 0.6 }));
    grp.add(edge);
    let refl = null;
    if (withReflection) {
      refl = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.13, depthWrite: false }));
      refl.scale.y = -1;
      grp.add(refl);
    }
    return { grp, front, refl };
  }

  function create(canvas, kind, opts = {}) {
    THREE.ColorManagement.legacyMode = false; // couleurs hexadécimales lues en sRGB
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: !!opts.preserve });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(W, H, false);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.setClearColor(NIGHT, 0);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(NIGHT, 10, 21);
    const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
    const world = new THREE.Group();
    scene.add(world);

    const cards = [];
    const wall = { rows: [], cols: 0, step: 1 };
    let sweep = null;
    const state = { t: 0, spin: 0, running: false, raf: 0, last: 0, intro: 1, mx: 0, my: 0 };

    // Cadrage : la scène occupe la moitié droite, le texte reste lisible à gauche
    const cam = kind === "ring" ? { from: new THREE.Vector3(0.6, 6.4, 19), to: new THREE.Vector3(0, 3.6, 13.6), look: new THREE.Vector3(1.5, 0.9, 0) } : { from: new THREE.Vector3(-1.5, 0.6, 19), to: new THREE.Vector3(0, 0.2, 14.2), look: new THREE.Vector3(2.4, 0, 0) };
    world.position.x = kind === "ring" ? 4.15 : 5.7;

    const ready = textures().then((tx) => {
      if (kind === "ring") {
        const floor = new THREE.Group();
        floor.rotation.x = -Math.PI / 2;
        world.add(floor);
        [1.15, 2.3, 3.45, 4.6].forEach((r, i) => {
          const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.012, r + 0.012, 160), new THREE.MeshBasicMaterial({ color: i === 3 ? 0x4a5672 : 0x2f3a58, transparent: true, opacity: 0.9 }));
          floor.add(m);
        });
        for (const a of [0, Math.PI / 2]) {
          const l = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 0.014), new THREE.MeshBasicMaterial({ color: 0x2f3a58, transparent: true, opacity: 0.8 }));
          l.rotation.z = a;
          floor.add(l);
        }
        sweep = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 9.2), new THREE.MeshBasicMaterial({ map: sweepTexture(), transparent: true, depthWrite: false }));
        sweep.position.z = 0.002;
        floor.add(sweep);
        const core = new THREE.Mesh(new THREE.CircleGeometry(0.09, 32), new THREE.MeshBasicMaterial({ color: 0xeef1f6 }));
        core.position.z = 0.004;
        floor.add(core);

        const R = 3.05,
          n = tx.length;
        tx.forEach((t, i) => {
          const a = (i / n) * Math.PI * 2;
          const c = card(t, 1.0, 1.5, true);
          const y = 1.3 + Math.sin(i * 1.7) * 0.12;
          c.grp.position.set(Math.sin(a) * R, y, Math.cos(a) * R);
          c.grp.rotation.y = a;
          if (c.refl) c.refl.position.y = -2 * y;
          world.add(c.grp);
          cards.push({ ...c, a, y });
        });
      } else {
        // Mur de jaquettes en perspective : trois rangées qui défilent en sens alternés
        const cols = 9,
          rows = 3,
          step = 1.2;
        wall.cols = cols;
        wall.step = step;
        const plane = new THREE.Group();
        plane.rotation.set(0.05, -0.72, 0.02);
        world.add(plane);
        for (let r = 0; r < rows; r++) {
          const row = new THREE.Group();
          row.position.y = (1 - r) * 1.72;
          plane.add(row);
          wall.rows.push(row);
          for (let c = 0; c < cols; c++) {
            const t = tx[(c * 2 + r * 5) % tx.length];
            const k = card(t, 1.02, 1.53, false);
            k.grp.position.x = (c - (cols - 1) / 2) * step;
            row.add(k.grp);
            cards.push({ ...k, a: 0, y: 0, row: r, base: k.grp.position.x });
          }
        }
      }
      place(1);
      render(0);
    });

    function place(p) {
      camera.position.lerpVectors(cam.from, cam.to, p);
      camera.position.x += state.mx * 0.35;
      camera.position.y += state.my * 0.2;
      camera.lookAt(cam.look);
    }

    function render(dt) {
      state.t += dt;
      const spinSpeed = kind === "ring" ? 0.11 : 0.16;
      world.rotation.y = state.t * spinSpeed;
      const sweepA = (state.t * (Math.PI * 2)) / 6; // un tour en 6 s
      if (sweep) sweep.rotation.z = -sweepA;
      if (kind !== "ring") {
        world.rotation.y = 0;
        const span = wall.cols * wall.step;
        for (const c of cards) {
          const dir = c.row % 2 ? -1 : 1;
          let x = c.base + dir * state.t * 0.28;
          x = ((((x + span / 2) % span) + span) % span) - span / 2;
          c.grp.position.x = x;
          const edge = Math.min(1, (span / 2 - Math.abs(x)) / 1.2);
          c.front.material.color.setScalar(0.35 + 0.6 * Math.max(0, edge));
        }
        place(state.intro);
        renderer.render(scene, camera);
        return;
      }
      for (const c of cards) {
        let k;
        if (kind === "ring") {
          // angle de la jaquette dans le repère du sol, comparé au faisceau
          const wa = (((c.a + world.rotation.y) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
          const ea = Math.PI - sweepA; // bord d'attaque du faisceau, dans le même repère
          let d = wa - ea;
          d = ((d % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); // temps écoulé depuis le passage
          k = 0.58 + 0.42 * Math.exp(-d * 1.6);
        } else {
          k = 0.92;
        }
        c.front.material.color.setScalar(k);
        c.grp.position.y = c.y + Math.sin(state.t * 0.9 + c.a * 2) * 0.05;
        if (c.refl) c.refl.position.y = -2 * c.grp.position.y;
      }
      place(state.intro);
      renderer.render(scene, camera);
    }

    function loop(now) {
      if (!state.running) return;
      const dt = state.last ? Math.min(0.05, (now - state.last) / 1000) : 0;
      state.last = now;
      render(dt);
      state.raf = requestAnimationFrame(loop);
    }

    canvas.closest(".slide").addEventListener("mousemove", (e) => {
      const r = canvas.getBoundingClientRect();
      state.mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      state.my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });

    return {
      ready,
      start() {
        if (state.running) return;
        state.running = true;
        state.last = 0;
        state.raf = requestAnimationFrame(loop);
      },
      stop() {
        state.running = false;
        cancelAnimationFrame(state.raf);
      },
      /** Travelling d'entrée de la caméra */
      intro(gsap) {
        state.intro = 0;
        gsap.to(state, { intro: 1, duration: 2.6, ease: "power3.out" });
      },
      /** Image fixe pour l'export PDF */
      still(t) {
        state.t = t;
        state.intro = 1;
        render(0);
        return canvas.toDataURL("image/png");
      },
    };
  }

  return { create, textures };
})();
