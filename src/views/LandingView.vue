<template>
  <div class="landing-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="brand-logo">
          <img src="/bigbackicon.jpg" alt="BigBack FoodTracker" class="logo-img" />
          <span class="brand-name">BigBacks</span>
        </div>
        <h1 class="hero-title">
          Track Food. <span class="highlight">Save Money.</span><br />
          Reduce Waste.
        </h1>
        <p class="hero-subtitle">
          Your smart companion for managing groceries, preventing food waste, and building sustainable habits.
        </p>
        <div class="hero-actions">
          <router-link to="/signup" class="btn btn-primary">Get Started Free</router-link>
          <router-link to="/login" class="btn btn-secondary">Sign In</router-link>
        </div>
        <div class="hero-stats">
          <div class="stat">
            <div class="stat-number">$850</div>
            <div class="stat-label">Avg. Saved/Year</div>
          </div>
          <div class="stat">
            <div class="stat-number">40%</div>
            <div class="stat-label">Waste Reduced</div>
          </div>
          <div class="stat">
            <div class="stat-number">10k+</div>
            <div class="stat-label">Active Users</div>
          </div>
        </div>
      </div>
      <div class="hero-visual">
        <div class="floating-card card-1">
          <i class="bi bi-basket3-fill"></i>
          <span>Smart Inventory</span>
        </div>
        <div class="floating-card card-2">
          <i class="bi bi-graph-up"></i>
          <span>Track Savings</span>
        </div>
        <div class="floating-card card-3">
          <i class="bi bi-lightning-charge-fill"></i>
          <span>Get Recipes</span>
        </div>
        <div class="floating-card card-4">
          <i class="bi bi-chat-dots-fill"></i>
          <span>AI Chatbot</span>
        </div>
        <div class="hero-circle"></div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <h2 class="section-title">Everything you need to reduce food waste</h2>
      <div class="features-grid">
        <div class="feature-card">
          <div class="feature-icon">
            <i class="bi bi-calendar"></i>
          </div>
          <h3>Smart Tracking</h3>
          <p>Easily track your groceries with expiration dates, quantities, and categories.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <i class="bi bi-bell-fill"></i>
          </div>
          <h3>Expiration Alerts</h3>
          <p>Get notified before food expires so you can use it in time.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <i class="bi bi-book-fill"></i>
          </div>
          <h3>Recipe Suggestions</h3>
          <p>AI-powered recipe recommendations based on your available ingredients.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <i class="bi bi-graph-up-arrow"></i>
          </div>
          <h3>Savings Analytics</h3>
          <p>Visualize your savings and waste reduction over time with detailed charts.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <i class="bi bi-people-fill"></i>
          </div>
          <h3>Community</h3>
          <p>Share food that is about to expire with other people.</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">
            <i class="bi bi-chat-dots-fill"></i>
          </div>
          <h3>AI Chatbot</h3>
          <p>Get instant answers about food storage, recipes, and sustainability tips.</p>
        </div>
      </div>
    </section>

    <!-- How It Works Section -->
    <section class="how-it-works">
      <h2 class="section-title">How it works</h2>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <h3>Add Your Groceries</h3>
          <p>Whenever you buy an item, add it into your inventory to keep track.</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-number">2</div>
          <h3>Dashboard Analytics</h3>
          <p>Keep track of when your food is about to expire and update your inventory accordingly. Find recipes based on the food you have.</p>
        </div>
        <div class="step-arrow">→</div>
        <div class="step">
          <div class="step-number">3</div>
          <h3>Community Engagement</h3>
          <p>Share your food with others, reduce waste together, earn points and challenge your friends for the top spot on the leaderboard.</p>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta">
      <div class="cta-content">
        <h2>Ready to start saving?</h2>
        <p>Join thousands of users reducing food waste and saving money every month.</p>
        <router-link to="/signup" class="btn btn-cta">Create Free Account</router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
// No logic needed for static landing page
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: #fff;
}

/* Brand Logo */
.brand-logo {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.logo-img {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.brand-name {
  font-size: 1.8rem;
  font-weight: 800;
  color: #059669;
}

/* Hero Section */
.hero {
  min-height: 90vh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  padding: 4rem 8%;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 50%, #fef3c7 100%);
  position: relative;
  overflow: hidden;
}

.hero-content {
  z-index: 2;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.2;
  color: #1f2937;
  margin-bottom: 1.5rem;
}

.highlight {
  color: #059669;
  position: relative;
}

.hero-subtitle {
  font-size: 1.25rem;
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 3rem;
}

.btn {
  padding: 1rem 2rem;
  border-radius: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: all 0.3s ease;
  display: inline-block;
  font-size: 1.1rem;
}

.btn-primary {
  background: #059669;
  color: white;
  box-shadow: 0 4px 14px rgba(5, 150, 105, 0.3);
}

.btn-primary:hover {
  background: #047857;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(5, 150, 105, 0.4);
}

.btn-secondary {
  background: white;
  color: #059669;
  border: 2px solid #059669;
}

.btn-secondary:hover {
  background: #f0fdf4;
  transform: translateY(-2px);
}

.hero-stats {
  display: flex;
  gap: 3rem;
  margin-top: 3rem;
}

.stat {
  text-align: center;
}

.stat-number {
  font-size: 2.5rem;
  font-weight: 800;
  color: #059669;
  line-height: 1;
}

.stat-label {
  font-size: 0.9rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

/* Hero Visual */
.hero-visual {
  position: relative;
  height: 500px;
  z-index: 1;
}

.hero-circle {
  position: absolute;
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.1;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.1); }
}

.floating-card {
  position: absolute;
  background: white;
  padding: 1.5rem 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: float 3s ease-in-out infinite;
}

.floating-card i {
  font-size: 2rem;
  color: #059669;
}

.floating-card span {
  font-weight: 700;
  color: #1f2937;
}

.card-1 {
  top: 5%;
  left: 5%;
  animation-delay: 0s;
}

.card-2 {
  top: 35%;
  right: 0%;
  animation-delay: 1s;
}

.card-3 {
  bottom: 20%;
  left: 10%;
  animation-delay: 2s;
}

.card-4 {
  top: 60%;
  right: 10%;
  animation-delay: 1.5s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* Features Section */
.features {
  padding: 6rem 8%;
  background: white;
}

.section-title {
  font-size: 2.5rem;
  font-weight: 800;
  text-align: center;
  color: #1f2937;
  margin-bottom: 4rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.feature-card {
  padding: 2rem;
  border-radius: 16px;
  background: #f9fafb;
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  background: white;
}

.feature-icon {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.feature-icon i {
  font-size: 1.8rem;
  color: white;
}

.feature-card h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #6b7280;
  line-height: 1.6;
}

/* How It Works Section */
.how-it-works {
  padding: 6rem 8%;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 100%);
}

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  flex-wrap: wrap;
}

.step {
  flex: 1;
  min-width: 250px;
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.step-number {
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  font-weight: 800;
  margin: 0 auto 1.5rem;
}

.step h3 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
}

.step p {
  color: #6b7280;
  line-height: 1.6;
}

.step-arrow {
  font-size: 2.5rem;
  color: #059669;
  font-weight: 700;
}

/* CTA Section */
.cta {
  padding: 6rem 8%;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  text-align: center;
}

.cta-content h2 {
  font-size: 3rem;
  font-weight: 800;
  color: white;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.25rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 2rem;
}

.btn-cta {
  background: white;
  color: #059669;
  padding: 1.25rem 3rem;
  font-size: 1.2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.btn-cta:hover {
  transform: translateY(-3px);
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}

/* Footer */
.footer {
  background: #1f2937;
  color: white;
  padding: 4rem 8% 2rem;
}

.footer-content {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 4rem;
  margin-bottom: 3rem;
}

.footer-brand h3 {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.footer-brand p {
  color: #9ca3af;
}

.footer-links {
  display: flex;
  gap: 4rem;
}

.footer-column h4 {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: #10b981;
}

.footer-column a {
  display: block;
  color: #9ca3af;
  text-decoration: none;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.footer-column a:hover {
  color: white;
}

.footer-bottom {
  border-top: 1px solid #374151;
  padding-top: 2rem;
  text-align: center;
  color: #9ca3af;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
    padding: 4rem 5%;
  }

  .brand-logo {
    justify-content: center;
  }

  .hero-visual {
    display: none;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-title {
    font-size: 2.5rem;
  }
}

@media (max-width: 768px) {
  .features,
  .how-it-works,
  .cta {
    padding: 4rem 5%;
  }

  .section-title {
    font-size: 2rem;
  }

  .step-arrow {
    display: none;
  }

  .btn {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }

  .logo-img {
    width: 50px;
    height: 50px;
  }

  .brand-name {
    font-size: 1.5rem;
  }
}

@media (max-width: 480px) {
  .hero-title {
    font-size: 2rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-stats {
    flex-direction: column;
    gap: 1.5rem;
  }

  .cta-content h2 {
    font-size: 2rem;
  }

  .logo-img {
    width: 45px;
    height: 45px;
  }

  .brand-name {
    font-size: 1.3rem;
  }
}
</style>
