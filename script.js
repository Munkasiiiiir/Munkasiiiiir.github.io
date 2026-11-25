

document.addEventListener('DOMContentLoaded', () => {

    const writeupsData = {
    "notpolite": {
      title: "Reverse engineering: NotPolite",
      date: "February 25, 2026",
      readtime: "5 min read",
      content: `
        <p>CyberXbytes reverse engineering challenge.</p>
        <p>Author: Munkasir (AQU4M4N)</p>

        <h2>Challenge Overview:</h2>
        <p>This document presents a comprehensive write-up for the NotPolite reverse engineering challenge. The objective was to decrypt a hidden Virtual Machine (VM) bytecode and interpret its instructions to ultimately recover the flag.</p>
        <p>Binary: <code>notpolite</code><br>Flag Format: <code>CyberXbytes{…}</code><br>Difficulty: Hard<br>Description: <em>"Can you charm the beast, or does it devour?"</em></p>

        <h2>1. Initial Investigation:</h2>
        <p>The notpolite binary was identified as a 64-bit ELF executable. Initial reconnaissance using the <code>strings</code> utility revealed several intriguing, albeit misleading, text snippets:</p>
        <pre><code>The algorithm was not polite
but handsome
and yeah, I think everyone can do it</code></pre>
        <p>These strings appeared to be decoys, designed to distract analysts. Further examination of the binary's disassembly using <code>objdump</code> indicated a complex initialization routine, followed by a loop structure strongly suggestive of a Virtual Machine (VM) dispatcher.</p>

        <h2>2. Identifying the Decryption Routine:</h2>
        <p>First I dropped the binary into IDA. Translating the Assembly code to C-Code made it more readable — as we can see when its run all these strings are printed via <code>puts</code>.</p>
        <p>But the last one is suspicious — it contains another hidden function next to it that doesn't print to our screen or we don't see the result of.</p>
        <p>Looking into the function <code>sub_401126</code> we can see the following structure:</p>
        <p>Detailed analysis of the disassembly led to the identification of a critical decryption loop located at memory address <code>0x401126</code>. This routine was responsible for transforming an obfuscated bytecode into an executable format for the VM. The decryption algorithm was characterized by the following steps:</p>
        <p>1. <strong>Data Source:</strong> Encrypted bytes were loaded sequentially from a data section, specifically starting at address <code>0x402020</code> within the <code>.rodata</code> segment.</p>
        <p>2. <strong>Iteration Count:</strong> The decryption process iterated <code>0x1fc</code> (equivalent to 508 in decimal) times, indicating the total length of the encrypted bytecode.</p>
        <p>3. <strong>Decryption Logic:</strong> Each loaded byte was subjected to an XOR operation with a dynamically changing key.</p>
        <p>4. <strong>Storage:</strong> The resulting decrypted byte was then stored in a buffer located at <code>0x404040</code> within the <code>.data</code> segment.</p>
        <p>5. <strong>Key Update Mechanism:</strong> The key itself was updated in each iteration using a Linear Congruential Generator (LCG) with the formula: <code>key = (key * 0x1d + 0x4b) & 0xff</code>. The initial value of the key was <code>0x5a</code>.</p>

        <h2>3. Analyzing the VM Opcodes:</h2>
        <p>The buffer at <code>0x404040</code>, containing the decrypted bytecode, served as the instruction set for a simple VM. By meticulously tracing the VM dispatcher, which commenced at <code>0x401195</code>, the functionality of various opcodes was mapped:</p>
        <p>• <strong>Opcode 1:</strong> This opcode was responsible for a LOAD operation, immediately followed by the value to be loaded.</p>
        <p>• <strong>Opcode 6:</strong> This opcode performed a STORE operation, taking the previously loaded value and placing it into a specific index within a designated memory array.</p>
        <p>• <strong>Other Opcodes:</strong> Additional opcodes were observed to manage control flow and maintain the VM's internal state.</p>

        <h2>4. Reconstructing the Flag:</h2>
        <p>The process of flag reconstruction involved a multi-step approach:</p>
        <p>1. <strong>Extraction of Encrypted Data:</strong> The raw encrypted data was extracted directly from the binary's <code>.rodata</code> section at <code>0x402020</code>.</p>
        <p>2. <strong>Decryption:</strong> The identified decryption algorithm, including the initial key and LCG update mechanism, was applied to the extracted data to obtain the cleartext VM bytecode.</p>
        <p>3. <strong>Bytecode Interpretation:</strong> The decrypted bytecode was then parsed, specifically focusing on the LOAD (opcode 1) and STORE (opcode 6) instructions. These instructions revealed the individual characters of the flag and their respective positions within a flag buffer.</p>
        <p>By systematically following these steps, the complete flag was successfully reconstructed.</p>

        <h2>5. Solver Script:</h2>
        <p>The following Python script automates the entire process of decryption and flag reconstruction, directly implementing the logic derived from the reverse engineering efforts.</p>
        <pre><code><span class="keyword">def</span> <span class="keyword">solve</span>():
    <span class="comment"># Extracted hex data from the .rodata section at 0x402020</span>
    enc_hex = (
        <span class="string">"5b3e726f d6706105 a3adfdb5 a01b28ea"</span>
        <span class="string">"8fcb8737 6fb32ed7 3af454a1 336131d9"</span>
        <span class="comment"># ... (full hex data in original)</span>
    ).replace(<span class="string">" "</span>, <span class="string">""</span>)
    data = bytes.fromhex(enc_hex)

    <span class="comment"># Re-implementing the decryption logic</span>
    key = <span class="number">0x5a</span>
    decrypted = bytearray()
    <span class="keyword">for</span> b <span class="keyword">in</span> data:
        decrypted.append(b ^ key)
        key = (key * <span class="number">0x1d</span> + <span class="number">0x4b</span>) & <span class="number">0xff</span>

    <span class="comment"># Interpret the VM bytecode</span>
    <span class="comment"># Opcode 1: LOAD <val>, Opcode 6: STORE <index></span>
    res = {}
    i = <span class="number">0</span>
    <span class="keyword">while</span> i < len(decrypted):
        op = decrypted[i]
        <span class="keyword">if</span> op == <span class="number">1</span>:
            val = decrypted[i+<span class="number">1</span>]
            i += <span class="number">2</span>
            <span class="keyword">if</span> i < len(decrypted) <span class="keyword">and</span> decrypted[i] == <span class="number">6</span>:
                pos = decrypted[i+<span class="number">1</span>]
                i += <span class="number">2</span>
                res[pos] = val
        <span class="keyword">else</span>:
            i += <span class="number">1</span>

    <span class="comment"># Reconstruct the string from indices</span>
    flag = <span class="string">""</span>
    <span class="keyword">for</span> idx <span class="keyword">in</span> range(max(res.keys()) + <span class="number">1</span>):
        flag += chr(res.get(idx, ord(<span class="string">"?"</span>)))
    print(f<span class="string">"Flag: {flag}"</span>)

<span class="keyword">if</span> __name__ == <span class="string">"__main__"</span>:
    solve()</code></pre>

        <h2>6. Final Flag:</h2>
        <p>Upon successful execution of the solver script, the following flag is revealed:</p>
        <pre><code>CyberXbytes{hmmmmm_i_think_every1_can_doitdoitdoitgood}</code></pre>
      `
    },
    "elgamal": {
      title: "Normal El-Gamal, Flagyard crypto",
      date: "January 26, 2026",
      readtime: "7 min read",
      content: `
        <p>Author: Munkasir (AQU4M4N)</p>
        <p>Category: Cryptography<br>Question: Normal El-Gamal<br>Description: <em>Welcome to the Totally Normal ElGamal Oracle!</em><br>Difficulty: Hard</p>
        <p>This document presents a complete and deterministic solution to the Normal El-Gamal cryptography challenge. The solution was obtained by exploiting the homomorphic properties of the Elliptic Curve ElGamal (ECEG) cryptosystem and performing algebraic parameter recovery to bypass the oracle's security filters.</p>

        <h2>1. Challenge Overview and Initial Analysis:</h2>
        <p>The challenge provides an interactive service that implements an Elliptic Curve ElGamal Oracle. Upon connection, the user is presented with a target ciphertext and a menu of options.</p>

        <h3>1.1. Ciphertext Structure:</h3>
        <p>The initial output provides a ciphertext <code>ct</code> as a tuple of four large integers: <code>ct = (c1x, c1y, c2x, c2y)</code></p>
        <p>This structure corresponds to two points on an elliptic curve:</p>
        <pre><code>C₁ = (c1x, c1y)
C₂ = (c2x, c2y)</code></pre>

        <h2>1.2. Oracle Capabilities:</h2>
        <p>The service offers three options upon connection. Knowing instances, the flag is going to be dynamic but the solve steps are going to be the same and so is the vulnerability.</p>
        <p>The <code>dec</code> function contains a filter that prevents direct decryption of the flag's ciphertext or any points sharing coordinates with it, necessitating an indirect approach.</p>

        <h2>2. Vulnerability Analysis: The Malleable Oracle:</h2>
        <p>The core of the challenge involves bypassing the oracle's filter by utilizing the mathematical properties of the underlying cryptosystem. The vulnerability stems from the inherent malleability of the ElGamal scheme, which allows an attacker to transform a ciphertext into a new, valid ciphertext for a related message without knowing the private key.</p>

        <h3>2.1. The Additive Homomorphic Property (Malleability):</h3>
        <p>ElGamal is an additively homomorphic cryptosystem. This means that operations on the ciphertexts correspond to operations on the plaintexts. This property is the source of the malleability vulnerability.</p>
        <p>For a message point m encrypted as E(m) = (C₁, C₂), where C₁ = kG and C₂ = kA + m, an attacker can compute a new ciphertext E(n·m) for a message n·m by simply performing scalar multiplication on the ciphertext components:</p>
        <pre><code>E(n·m) = (C'₁, C'₂) = (n·C₁, n·C₂)</code></pre>
        <p>Substituting the original components demonstrates why this works:</p>
        <pre><code>C'₁ = n·(kG) = (nk)G
C'₂ = n·(kA + m) = n(kA) + n·m = (nk)A + n·m</code></pre>
        <p>The resulting pair (C'₁, C'₂) is a perfectly valid ElGamal ciphertext for the message n·m, using a new ephemeral key k' = nk. This ability to modify a ciphertext in a predictable way without knowing the private key is the definition of malleability.</p>

        <h2>2.2. Bypassing the Oracle Filter:</h2>
        <p>The challenge's security relies on a filter in the decryption oracle that prevents the direct decryption of the target flag ciphertext E(m). The filter likely checks for an exact match of the input ciphertext against the stored flag ciphertext.</p>
        <p>The homomorphic property allows us to generate a new ciphertext E(n·m) that is mathematically related to the flag's ciphertext but is structurally distinct. Since the coordinates of C'₁ and C'₂ are different from C₁ and C₂, the oracle's filter is successfully bypassed. The oracle, believing it is decrypting a "safe" ciphertext, returns the message point n·m. By generating two such related ciphertexts (e.g., n=2 and n=3), we can recover the original message m through algebraic manipulation.</p>

        <h2>3. Step-by-Step Solution:</h2>

        <h3>3.1. Elliptic Curve Parameter Recovery (p, a, b):</h3>
        <p>To perform elliptic curve arithmetic, we must first recover the curve parameters. The curve follows the Weierstrass equation:</p>
        <pre><code>y² ≡ x³ + ax + b (mod p)</code></pre>
        <p><strong>Modulus p Recovery:</strong> By encrypting known small integers, we obtain points (xᵢ, yᵢ). Subtracting the equations for two points yields:</p>
        <pre><code>(y₁² - x₁³) - (y₂² - x₂³) ≡ a(x₁ - x₂) (mod p)</code></pre>
        <p>By collecting multiple samples and computing the GCD across pairs of such equations, the 384-bit prime p is uniquely recovered.</p>
        <p><strong>Coefficients a and b Recovery:</strong> Once p is found, a and b are solved using modular inversion and linear systems.</p>

        <h3>3.2. Message Recovery via Homomorphism:</h3>
        <p>With the parameters (p, a, b) known, the following steps are taken:</p>
        <p>1. <strong>Scalar Multiplication:</strong> Multiply the flag ciphertext by 2 and 3 to get E(2m) and E(3m).</p>
        <p>2. <strong>Oracle Query:</strong> Submit these to the oracle to obtain decrypted points P₂ = 2·m and P₃ = 3·m.</p>
        <p>3. <strong>Point Subtraction:</strong> Recover the original message point m via:</p>
        <pre><code>m = P₃ - P₂</code></pre>

        <h3>3.3. Flag Extraction:</h3>
        <p>The flag is extracted from the x-coordinate of the recovered point m using the challenge's specific mapping:</p>
        <pre><code>flag_int = x_val >> 8</code></pre>

        <h2>4. Final Solver Script:</h2>
        <p>The following Python script implements the complete recovery process, including the custom Elliptic Curve class and the homomorphic bypass logic.</p>
        <pre><code><span class="keyword">import</span> socket
<span class="keyword">import</span> math, random
<span class="keyword">from</span> Cryptodome.Util.number <span class="keyword">import</span> long_to_bytes, inverse

<span class="keyword">def</span> <span class="keyword">modinv</span>(a, m):
    <span class="keyword">return</span> pow(a, -<span class="number">1</span>, m)

<span class="keyword">class</span> <span class="keyword">EC</span>:
    <span class="keyword">def</span> __init__(self, p, a, b):
        self.p, self.a, self.b = p, a, b

    <span class="keyword">def</span> add(self, P1, P2):
        <span class="keyword">if</span> P1 <span class="keyword">is</span> None: <span class="keyword">return</span> P2
        <span class="keyword">if</span> P2 <span class="keyword">is</span> None: <span class="keyword">return</span> P1
        x1, y1 = P1; x2, y2 = P2; p = self.p
        <span class="keyword">if</span> x1 == x2:
            <span class="keyword">if</span> (y1 + y2) % p == <span class="number">0</span>: <span class="keyword">return</span> None
            m = (<span class="number">3</span>*x1*x1 + self.a) * modinv(<span class="number">2</span>*y1, p) % p
        <span class="keyword">else</span>:
            m = (y2 - y1) * modinv(x2 - x1, p) % p
        x3 = (m*m - x1 - x2) % p
        y3 = (m*(x1 - x3) - y1) % p
        <span class="keyword">return</span> (x3, y3)

    <span class="keyword">def</span> mul(self, P, n):
        res = None; base = P
        <span class="keyword">while</span> n > <span class="number">0</span>:
            <span class="keyword">if</span> n % <span class="number">2</span> == <span class="number">1</span>: res = self.add(res, base)
            base = self.add(base, base); n //= <span class="number">2</span>
        <span class="keyword">return</span> res

    <span class="keyword">def</span> sub(self, P1, P2):
        <span class="keyword">return</span> self.add(P1, (P2[<span class="number">0</span>], (-P2[<span class="number">1</span>]) % self.p))

<span class="comment"># Connect, recover params, perform homomorphic bypass</span>
<span class="comment"># Multiply ct by 2 and 3, query oracle, subtract:</span>
<span class="comment"># m = P3 - P2</span>
<span class="comment"># flag_int = m_point[0] >> 8</span>
<span class="comment"># flag = long_to_bytes(flag_int)</span></code></pre>
        <p>Make sure to change your instance at the instance part!</p>

        <h2>5. Conclusion:</h2>
        <p>The challenge demonstrates that masking specific ciphertexts is insufficient if the cryptosystem is malleable. By utilizing the homomorphic nature of ElGamal, we can force the oracle to decrypt related messages that reveal the primary secret. The successful recovery of the flag.</p>
      `
    }
  };
  const canvas = document.getElementById('souls-canvas');
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  
  let particles = [];
  let isScreechMode = false;
  let mouse = { x: null, y: null, radius: 110 };

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initParticles();
  });

  window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mouseleave', () => {
    mouse.x = null;
    mouse.y = null;
  });

  class DustParticle {
    constructor() {
      this.reset();
      this.y = Math.random() * height;
    }

    reset() {
      this.x = Math.random() * width;
      this.y = height + Math.random() * 50 + 10;
      this.size = Math.random() * 2 + 1;
      this.speedY = Math.random() * 0.35 + 0.1;
      this.speedX = Math.sin(Math.random() * Math.PI) * 0.1;
      this.alpha = Math.random() * 0.25 + 0.08;
      this.wobbleValue = Math.random() * Math.PI;
      this.wobbleSpeed = Math.random() * 0.008 + 0.002;
    }

    update() {
      this.wobbleValue += this.wobbleSpeed;
      const speedFactor = isScreechMode ? 1.6 : 1.0;
      
      this.y -= this.speedY * speedFactor;
      this.x += (this.speedX + Math.sin(this.wobbleValue) * 0.1) * speedFactor;
      if (mouse.x !== null && mouse.y !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouse.radius) {
          const force = (mouse.radius - distance) / mouse.radius;
          const angle = Math.atan2(dy, dx);
          
          this.x += Math.cos(angle) * force * 2;
          this.y += Math.sin(angle) * force * 2;
        }
      }

      if (this.y < -20 || this.x < -20 || this.x > width + 20) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      const color = isScreechMode ? '167, 139, 250' : '192, 132, 252';
      ctx.fillStyle = `rgba(${color}, ${this.alpha})`;
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initParticles() {
    particles = [];
    const density = Math.floor((width * height) / 28000);
    const particleCount = Math.min(Math.max(density, 15), 60);
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new DustParticle());
    }
  }

  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(animate);
  }

  initParticles();
  animate();
  const resonanceBar = document.getElementById('resonance-bar');

  function updateScrollProgress() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    
    const scrollPercent = documentHeight > windowHeight 
      ? Math.round((scrollTop / (documentHeight - windowHeight)) * 100) 
      : 0;
    
    resonanceBar.style.width = `${scrollPercent}%`;
  }

  window.addEventListener('scroll', updateScrollProgress);
  updateScrollProgress();
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('.nav-link');

  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }, {
    root: null,
    rootMargin: '-40% 0px -50% 0px',
    threshold: 0
  });

  sections.forEach(section => navObserver.observe(section));
  const toggleBtn = document.getElementById('wavelength-toggle');
  const toggleLabel = toggleBtn.querySelector('.toggle-label');

  toggleBtn.addEventListener('click', () => {
    isScreechMode = !isScreechMode;
    document.body.classList.toggle('screech-theme', isScreechMode);
    
    if (isScreechMode) {
      toggleLabel.textContent = "Screech";
      toggleBtn.style.borderColor = "var(--accent-color)";
      toggleBtn.style.color = "var(--accent-color)";
    } else {
      toggleLabel.textContent = "Resonate";
      toggleBtn.style.borderColor = "";
      toggleBtn.style.color = "";
    }
  });
  const readerOverlay = document.getElementById('medium-reader-overlay');
  const closeReaderBtn = document.getElementById('close-reader');
  const readerTitle = document.getElementById('reader-title');
  const readerDate = document.getElementById('reader-date');
  const readerReadtime = document.getElementById('reader-readtime');
  const readerContentBody = document.getElementById('reader-content-body');
  const readerProgressBar = document.getElementById('reader-progress-bar');
  const writeupCards = document.querySelectorAll('.writeup-card');
  writeupCards.forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-id');
      const article = writeupsData[id];

      if (article) {
        readerTitle.textContent = article.title;
        readerDate.textContent = article.date;
        readerReadtime.textContent = article.readtime;
        readerContentBody.innerHTML = article.content;
        readerOverlay.scrollTop = 0;
        readerProgressBar.style.width = '0%';
        readerOverlay.style.display = 'block';
        setTimeout(() => {
          readerOverlay.classList.add('active');
        }, 10);
        document.body.style.overflow = 'hidden';
      }
    });
  });
  function closeReader() {
    readerOverlay.classList.remove('active');
    setTimeout(() => {
      readerOverlay.style.display = 'none';
    }, 300);
    document.body.style.overflow = '';
  }

  closeReaderBtn.addEventListener('click', closeReader);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && readerOverlay.classList.contains('active')) {
      closeReader();
    }
  });
  readerOverlay.addEventListener('scroll', () => {
    const scrollHeight = readerOverlay.scrollHeight;
    const clientHeight = readerOverlay.clientHeight;
    const scrollTop = readerOverlay.scrollTop;

    const scrollPercent = scrollHeight > clientHeight
      ? Math.round((scrollTop / (scrollHeight - clientHeight)) * 100)
      : 0;

    readerProgressBar.style.width = `${scrollPercent}%`;
  });
  const soulContainer = document.getElementById('interactive-soul-container');
  const soulImg = soulContainer ? soulContainer.querySelector('.crona-soul-3d-img') : null;

  if (soulContainer && soulImg) {
    soulContainer.addEventListener('mousemove', (e) => {
      const rect = soulContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((centerY - y) / centerY) * 20;
      const rotateY = ((x - centerX) / centerX) * 20;

      soulImg.style.transform = `scale(1.05) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      soulImg.style.boxShadow = `${-rotateY * 1.5}px ${rotateX * 1.5}px 35px rgba(192, 132, 252, 0.3)`;
    });

    soulContainer.addEventListener('mouseleave', () => {
      soulImg.style.transform = '';
      soulImg.style.boxShadow = '';
    });
  }
});
