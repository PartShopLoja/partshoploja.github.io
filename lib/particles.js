// ==========================================================================
// PARTSHOP PARTICLE CANVAS SYSTEM
// ==========================================================================

(() => {
  const canvas = document.getElementById("heroParticles");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  let particles = [];
  let animationFrameId;

  // Paleta de cores das partículas (Violeta, Shopee Laranja, Ouro Suave)
  const colors = [
    "rgba(168, 85, 247, ", // Violeta
    "rgba(238, 77, 45, ",  // Shopee Laranja
    "rgba(245, 158, 11, ", // Ouro
    "rgba(255, 255, 255, " // Ponto branco sutil
  ];

  function resizeCanvas() {
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * canvas.width;
      this.y = initial ? Math.random() * canvas.height : canvas.height + 10;
      this.radius = Math.random() * 2 + 0.8;
      this.colorBase = colors[Math.floor(Math.random() * colors.length)];
      this.alpha = Math.random() * 0.5 + 0.2;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -(Math.random() * 0.5 + 0.2); // Sobe suavemente
      this.fadeSpeed = Math.random() * 0.003 + 0.002;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      // Desvanecer e reaparecer ao sair dos limites
      if (this.y < -10 || this.x < -10 || this.x > canvas.width + 10) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = `${this.colorBase}${this.alpha})`;
      ctx.shadowBlur = 6;
      ctx.shadowColor = `${this.colorBase}0.8)`;
      ctx.fill();
    }
  }

  function init() {
    resizeCanvas();
    particles = [];
    
    // Quantidade balanceada (35 no PC, 18 no Telemóvel para máxima fluidez)
    const count = window.innerWidth < 640 ? 18 : 35;
    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    animationFrameId = requestAnimationFrame(animate);
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  // Pausa automática quando o utilizador sai da aba para economizar bateria
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrameId);
    } else {
      animate();
    }
  });

  init();
  animate();
})();