let cosmicScene = null;

function buildConstellations(width, height) {
  return [
    {
      points: [
        [0.12, 0.26, 3.2],
        [0.15, 0.23, 2.6],
        [0.18, 0.2, 2.8],
        [0.16, 0.31, 3.4],
        [0.2, 0.34, 2.6],
      ],
      lines: [[0, 1], [1, 2], [1, 3], [3, 4]],
    },
    {
      points: [
        [0.78, 0.18, 2.4],
        [0.83, 0.14, 2.8],
        [0.88, 0.18, 2.5],
        [0.85, 0.24, 2.9],
      ],
      lines: [[0, 1], [1, 2], [1, 3]],
    },
    {
      points: [
        [0.11, 0.72, 2.5],
        [0.16, 0.75, 2.8],
        [0.22, 0.78, 2.5],
      ],
      lines: [[0, 1], [1, 2]],
    },
    {
      points: [
        [0.82, 0.52, 2.8],
        [0.87, 0.49, 2.5],
        [0.92, 0.53, 3],
        [0.88, 0.59, 2.4],
      ],
      lines: [[0, 1], [1, 2], [1, 3]],
    },
    {
      points: [
        [0.3, 0.84, 2.5],
        [0.34, 0.81, 2.7],
        [0.38, 0.84, 2.5],
        [0.42, 0.81, 2.7],
        [0.46, 0.84, 2.5],
      ],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4]],
    },
  ].map((item) => ({
    stars: item.points.map((point) => ({
      x: width * point[0],
      y: height * point[1],
      size: point[2],
    })),
    lines: item.lines,
  }));
}

export function stopCosmicBackground() {
  if (!cosmicScene) return;
  if (cosmicScene.rafId) window.cancelAnimationFrame(cosmicScene.rafId);
  if (cosmicScene.resizeHandler) window.removeEventListener("resize", cosmicScene.resizeHandler);
  cosmicScene.canvas?.remove();
  cosmicScene = null;
}

export function startCosmicBackground() {
  if (!document.body) return;
  if (cosmicScene?.canvas?.isConnected) return;

  const canvas = document.createElement("canvas");
  canvas.className = "theme-cosmic-canvas";
  canvas.setAttribute("aria-hidden", "true");
  document.body.insertBefore(canvas, document.body.firstChild || null);

  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return;
  }

  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let frame = 0;
  let stars = [];
  let shootingStars = [];
  let planets = [];
  let constellations = [];

  const rand = (min, max) => Math.random() * (max - min) + min;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const starCount = Math.max(220, Math.floor((width * height) / 12000));
    stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: rand(0.5, 2.6),
      opacity: rand(0.16, 0.92),
      twinkle: rand(0.008, 0.024),
      phase: rand(0, Math.PI * 2),
      driftX: rand(-0.04, 0.04),
      driftY: rand(-0.03, 0.03),
    }));
    constellations = buildConstellations(width, height);
    planets = [
      { x: width * 0.12, y: height * 0.18, radius: 62, ring: true },
      { x: width * 0.86, y: height * 0.76, radius: 44, ring: true },
      { x: width * 0.92, y: height * 0.18, radius: 22, ring: false },
    ];
    shootingStars = [];
  }

  function drawStar(star) {
    star.phase += star.twinkle;
    star.x += star.driftX;
    star.y += star.driftY;
    if (star.x < -8) star.x = width + 8;
    if (star.x > width + 8) star.x = -8;
    if (star.y < -8) star.y = height + 8;
    if (star.y > height + 8) star.y = -8;

    const shimmer = Math.sin(star.phase) * 0.34 + 0.66;
    const alpha = star.opacity * shimmer;
    const glow = star.size * 5.5;
    const gradient = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, glow);
    gradient.addColorStop(0, `rgba(255,255,255,${alpha * 0.92})`);
    gradient.addColorStop(0.45, `rgba(185,214,255,${alpha * 0.34})`);
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(star.x, star.y, glow, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = `rgba(255,255,255,${Math.min(1, alpha + 0.08)})`;
    context.beginPath();
    context.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    context.fill();
  }

  function drawConstellations() {
    context.save();
    context.lineWidth = 1.2;
    context.strokeStyle = "rgba(255,255,255,0.22)";
    context.shadowBlur = 8;
    context.shadowColor = "rgba(255,255,255,0.14)";
    constellations.forEach((constellation) => {
      constellation.lines.forEach((line) => {
        const start = constellation.stars[line[0]];
        const end = constellation.stars[line[1]];
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      });
      constellation.stars.forEach((point) => {
        context.fillStyle = "rgba(255,255,255,0.94)";
        context.beginPath();
        context.arc(point.x, point.y, point.size * 0.55, 0, Math.PI * 2);
        context.fill();

        const halo = context.createRadialGradient(point.x, point.y, 0, point.x, point.y, point.size * 4);
        halo.addColorStop(0, "rgba(255,255,255,0.32)");
        halo.addColorStop(1, "rgba(255,255,255,0)");
        context.fillStyle = halo;
        context.beginPath();
        context.arc(point.x, point.y, point.size * 4, 0, Math.PI * 2);
        context.fill();
      });
    });
    context.restore();
  }

  function drawPlanets() {
    context.save();
    planets.forEach((planet, index) => {
      const pulse = 1 + Math.sin(frame * 0.006 + index) * 0.03;
      const radius = planet.radius * pulse;
      context.strokeStyle = "rgba(255,255,255,0.58)";
      context.lineWidth = 1.8;
      context.shadowBlur = 12;
      context.shadowColor = "rgba(255,255,255,0.24)";
      context.beginPath();
      context.arc(planet.x, planet.y, radius, 0, Math.PI * 2);
      context.stroke();

      context.shadowBlur = 0;
      context.strokeStyle = "rgba(255,255,255,0.16)";
      context.lineWidth = 1;
      context.beginPath();
      context.arc(planet.x, planet.y, radius * 0.68, 0, Math.PI * 2);
      context.stroke();

      if (planet.ring) {
        context.strokeStyle = "rgba(255,255,255,0.3)";
        context.beginPath();
        context.ellipse(planet.x, planet.y, radius * 1.55, radius * 0.44, Math.PI * 0.26, 0, Math.PI * 2);
        context.stroke();
      }
    });
    context.restore();
  }

  function updateShootingStars() {
    if (Math.random() < 0.012 && shootingStars.length < 3) {
      shootingStars.push({
        x: rand(width * 0.08, width * 0.9),
        y: rand(0, height * 0.45),
        vx: rand(6, 10),
        vy: rand(3.5, 6.5),
        life: 1,
      });
    }

    for (let index = shootingStars.length - 1; index >= 0; index -= 1) {
      const star = shootingStars[index];
      star.x += star.vx;
      star.y += star.vy;
      star.life -= 0.016;
      if (star.life <= 0) {
        shootingStars.splice(index, 1);
        continue;
      }

      const tail = context.createLinearGradient(star.x, star.y, star.x - star.vx * 10, star.y - star.vy * 10);
      tail.addColorStop(0, `rgba(255,255,255,${star.life * 0.95})`);
      tail.addColorStop(0.5, `rgba(153,214,255,${star.life * 0.45})`);
      tail.addColorStop(1, "rgba(255,255,255,0)");
      context.strokeStyle = tail;
      context.lineWidth = 2;
      context.shadowBlur = 12;
      context.shadowColor = "rgba(153,214,255,0.8)";
      context.beginPath();
      context.moveTo(star.x, star.y);
      context.lineTo(star.x - star.vx * 10, star.y - star.vy * 10);
      context.stroke();
    }
  }

  function animate() {
    frame += 1;
    context.clearRect(0, 0, width, height);
    stars.forEach(drawStar);
    drawConstellations();
    drawPlanets();
    updateShootingStars();
    cosmicScene.rafId = window.requestAnimationFrame(animate);
  }

  resize();
  const resizeHandler = () => resize();
  window.addEventListener("resize", resizeHandler, { passive: true });

  cosmicScene = { canvas, resizeHandler, rafId: 0 };
  animate();
}
