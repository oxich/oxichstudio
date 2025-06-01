const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// === CONFIGURATION ===
const BENCHMARK_CONFIG = {
  iterations: 3,
  timeout: 30000, // 30s max
  serverCheckInterval: 100, // 100ms
  memoryCheckInterval: 1000 // 1s
};

// === UTILITAIRES ===
function formatTime(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function checkServerReady(port = 3000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}`);
        if (response.ok) {
          clearInterval(checkInterval);
          resolve(Date.now() - startTime);
        }
      } catch (error) {
        // Server not ready yet
        if (Date.now() - startTime > BENCHMARK_CONFIG.timeout) {
          clearInterval(checkInterval);
          resolve(-1); // Timeout
        }
      }
    }, BENCHMARK_CONFIG.serverCheckInterval);
  });
}

function getElectronMemoryUsage(pid) {
  return new Promise((resolve) => {
    exec(`tasklist /FI "PID eq ${pid}" /FO CSV`, (error, stdout) => {
      if (error) {
        resolve(0);
        return;
      }
      
      const lines = stdout.split('\n');
      if (lines.length > 1) {
        const memoryStr = lines[1].split(',')[4];
        const memoryKB = parseInt(memoryStr.replace(/[^0-9]/g, ''));
        resolve(memoryKB * 1024); // Convert to bytes
      } else {
        resolve(0);
      }
    });
  });
}

// === BENCHMARK PRINCIPAL ===
async function runSingleBenchmark() {
  console.log('\n🚀 Démarrage du benchmark...');
  
  const results = {
    appStartTime: 0,
    serverStartTime: 0,
    memoryUsage: 0,
    success: false
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Lancer Electron
    const electronProcess = spawn('npm', ['run', 'electron:build'], {
      stdio: 'pipe',
      shell: true
    });

    let appReady = false;
    let serverReady = false;
    
    electronProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`📄 ${output.trim()}`);
      
      // Détecter quand l'app Electron est prête
      if (output.includes('🚀 Electron Mode:') && !appReady) {
        results.appStartTime = Date.now() - startTime;
        appReady = true;
        console.log(`✅ App démarrée en ${formatTime(results.appStartTime)}`);
      }
      
      // Détecter quand le serveur Next.js est prêt
      if (output.includes('Ready') && !serverReady) {
        results.serverStartTime = Date.now() - startTime;
        serverReady = true;
        console.log(`✅ Serveur prêt en ${formatTime(results.serverStartTime)}`);
        
        // Mesurer mémoire après 2s
        setTimeout(async () => {
          if (electronProcess.pid) {
            results.memoryUsage = await getElectronMemoryUsage(electronProcess.pid);
            console.log(`📊 Mémoire: ${formatMemory(results.memoryUsage)}`);
          }
          
          results.success = true;
          electronProcess.kill();
          resolve(results);
        }, 2000);
      }
    });

    electronProcess.stderr.on('data', (data) => {
      console.error(`❌ ${data.toString().trim()}`);
    });

    electronProcess.on('close', (code) => {
      if (!results.success) {
        console.log(`🔄 Processus fermé avec code ${code}`);
        resolve(results);
      }
    });

    // Timeout de sécurité
    setTimeout(() => {
      if (!results.success) {
        console.log('⏰ Timeout atteint');
        electronProcess.kill();
        resolve(results);
      }
    }, BENCHMARK_CONFIG.timeout);
  });
}

// === BENCHMARK COMPLET ===
async function runFullBenchmark() {
  console.log('🎯 === BENCHMARK ELECTRON + NEXT.JS ===');
  console.log(`📊 ${BENCHMARK_CONFIG.iterations} itérations`);
  
  const allResults = [];
  
  for (let i = 1; i <= BENCHMARK_CONFIG.iterations; i++) {
    console.log(`\n--- Itération ${i}/${BENCHMARK_CONFIG.iterations} ---`);
    
    const result = await runSingleBenchmark();
    allResults.push(result);
    
    // Pause entre itérations
    if (i < BENCHMARK_CONFIG.iterations) {
      console.log('⏸️ Pause 3s...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // === RÉSULTATS FINAUX ===
  const validResults = allResults.filter(r => r.success);
  
  if (validResults.length === 0) {
    console.log('\n❌ ÉCHEC : Aucun benchmark réussi');
    return;
  }
  
  const avgAppStart = validResults.reduce((sum, r) => sum + r.appStartTime, 0) / validResults.length;
  const avgServerStart = validResults.reduce((sum, r) => sum + r.serverStartTime, 0) / validResults.length;
  const avgMemory = validResults.reduce((sum, r) => sum + r.memoryUsage, 0) / validResults.length;
  
  console.log('\n🎯 === RÉSULTATS FINAUX ===');
  console.log(`✅ Benchmarks réussis: ${validResults.length}/${BENCHMARK_CONFIG.iterations}`);
  console.log(`⚡ Temps démarrage app: ${formatTime(avgAppStart)} (objectif: <5s)`);
  console.log(`🚀 Temps démarrage serveur: ${formatTime(avgServerStart)} (objectif: <10s)`);
  console.log(`📊 Mémoire moyenne: ${formatMemory(avgMemory)} (objectif: <200MB)`);
  
  // === VALIDATION CRITÈRES ===
  console.log('\n📋 === VALIDATION CRITÈRES ===');
  console.log(`${avgAppStart < 5000 ? '✅' : '❌'} Démarrage app < 5s: ${avgAppStart < 5000 ? 'PASS' : 'FAIL'}`);
  console.log(`${avgServerStart < 10000 ? '✅' : '❌'} Démarrage serveur < 10s: ${avgServerStart < 10000 ? 'PASS' : 'FAIL'}`);
  console.log(`${avgMemory < 200 * 1024 * 1024 ? '✅' : '❌'} Mémoire < 200MB: ${avgMemory < 200 * 1024 * 1024 ? 'PASS' : 'FAIL'}`);
  
  // === RECOMMANDATIONS ===
  console.log('\n💡 === RECOMMANDATIONS ===');
  if (avgAppStart >= 5000) {
    console.log('🔧 App démarrage lent: Optimiser preload, réduire imports initiaux');
  }
  if (avgServerStart >= 10000) {
    console.log('🔧 Serveur démarrage lent: Optimiser build Next.js, réduire dépendances');
  }
  if (avgMemory >= 200 * 1024 * 1024) {
    console.log('🔧 Mémoire élevée: Optimiser Electron, désactiver features inutiles');
  }
  
  console.log('\n🎉 Benchmark terminé !');
}

// === EXÉCUTION ===
if (require.main === module) {
  runFullBenchmark().catch(console.error);
}

module.exports = { runFullBenchmark, runSingleBenchmark }; 