const { spawn, exec } = require('child_process');
const os = require('os');

// === CONFIGURATION ===
const config = {
  iterations: 3,
  timeout: 15000, // 15s max
  port: 3000
};

// === UTILITAIRES ===
function formatTime(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatMemory(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function getProcessMemory(pid) {
  return new Promise((resolve) => {
    if (os.platform() === 'win32') {
      exec(`wmic process where processid=${pid} get PageFileUsage /value`, (error, stdout) => {
        if (error) {
          resolve(0);
          return;
        }
        
        const match = stdout.match(/PageFileUsage=(\d+)/);
        if (match) {
          resolve(parseInt(match[1]) * 1024); // Convert KB to bytes
        } else {
          resolve(0);
        }
      });
    } else {
      // Linux/Mac
      exec(`ps -o rss= -p ${pid}`, (error, stdout) => {
        if (error) {
          resolve(0);
          return;
        }
        const rssKB = parseInt(stdout.trim());
        resolve(rssKB * 1024); // Convert KB to bytes
      });
    }
  });
}

// === BENCHMARK RAPIDE ===
async function runQuickBenchmark() {
  console.log('\n🚀 Benchmark rapide (app pré-buildée)...');
  
  const results = {
    appStartTime: 0,
    serverStartTime: 0,
    memoryUsage: 0,
    success: false
  };

  return new Promise((resolve) => {
    const startTime = Date.now();
    
    // Lancer Electron directement (sans rebuild)
    const electronProcess = spawn('npx', ['electron', '.'], {
      stdio: 'pipe',
      shell: true
    });

    let appReady = false;
    let serverReady = false;
    
    electronProcess.stdout.on('data', (data) => {
      const output = data.toString();
      
      // Détecter quand l'app Electron est prête
      if (output.includes('🚀 Electron Mode:') && !appReady) {
        results.appStartTime = Date.now() - startTime;
        appReady = true;
        console.log(`✅ App Electron: ${formatTime(results.appStartTime)}`);
      }
      
      // Détecter quand le serveur Next.js est prêt
      if (output.includes('Ready in') && !serverReady) {
        results.serverStartTime = Date.now() - startTime;
        serverReady = true;
        console.log(`✅ Serveur Next.js: ${formatTime(results.serverStartTime)}`);
        
        // Mesurer mémoire après 2s
        setTimeout(async () => {
          if (electronProcess.pid) {
            results.memoryUsage = await getProcessMemory(electronProcess.pid);
            console.log(`📊 Mémoire: ${formatMemory(results.memoryUsage)}`);
          }
          
          results.success = true;
          electronProcess.kill();
          resolve(results);
        }, 2000);
      }
    });

    electronProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Ignorer les warnings DevTools
      if (!output.includes('DevTools') && !output.includes('Autofill')) {
        console.error(`❌ ${output.trim()}`);
      }
    });

    electronProcess.on('close', (code) => {
      if (!results.success) {
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
    }, config.timeout);
  });
}

// === BENCHMARK COMPLET ===
async function runFullQuickBenchmark() {
  console.log('🎯 === BENCHMARK RAPIDE ELECTRON + NEXT.JS ===');
  console.log('📝 Note: App pré-buildée (scénario réaliste d\'utilisation)');
  console.log(`📊 ${config.iterations} itérations\n`);
  
  const allResults = [];
  
  for (let i = 1; i <= config.iterations; i++) {
    console.log(`--- Test ${i}/${config.iterations} ---`);
    
    const result = await runQuickBenchmark();
    allResults.push(result);
    
    // Pause entre tests
    if (i < config.iterations) {
      console.log('⏸️ Pause 2s...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // === ANALYSE RÉSULTATS ===
  const validResults = allResults.filter(r => r.success);
  
  if (validResults.length === 0) {
    console.log('\n❌ ÉCHEC : Aucun test réussi');
    return;
  }
  
  const avgAppStart = validResults.reduce((sum, r) => sum + r.appStartTime, 0) / validResults.length;
  const avgServerStart = validResults.reduce((sum, r) => sum + r.serverStartTime, 0) / validResults.length;
  const avgMemory = validResults.reduce((sum, r) => sum + r.memoryUsage, 0) / validResults.length;
  
  console.log('\n🎯 === RÉSULTATS FINAUX ===');
  console.log(`✅ Tests réussis: ${validResults.length}/${config.iterations}`);
  console.log(`⚡ Démarrage Electron: ${formatTime(avgAppStart)}`);
  console.log(`🚀 Démarrage Serveur: ${formatTime(avgServerStart)}`);
  console.log(`📊 Mémoire moyenne: ${formatMemory(avgMemory)}`);
  
  // === VALIDATION CRITÈRES ===
  console.log('\n📋 === VALIDATION OBJECTIFS ===');
  const appOK = avgAppStart < 5000;
  const serverOK = avgServerStart < 10000;  
  const memoryOK = avgMemory < 200 * 1024 * 1024;
  
  console.log(`${appOK ? '✅' : '❌'} Démarrage Electron < 5s: ${appOK ? 'PASS' : 'FAIL'}`);
  console.log(`${serverOK ? '✅' : '❌'} Démarrage Serveur < 10s: ${serverOK ? 'PASS' : 'FAIL'}`);
  console.log(`${memoryOK ? '✅' : '❌'} Mémoire < 200MB: ${memoryOK ? 'PASS' : 'FAIL'}`);
  
  const score = [appOK, serverOK, memoryOK].filter(Boolean).length;
  console.log(`\n🏆 Score: ${score}/3 objectifs atteints`);
  
  if (score === 3) {
    console.log('🎉 EXCELLENT ! Toutes les performances respectent les critères');
  } else if (score >= 2) {
    console.log('✅ BON ! La plupart des critères sont respectés');
  } else {
    console.log('⚠️ À AMÉLIORER : Plusieurs optimisations nécessaires');
  }
}

// === EXÉCUTION ===
if (require.main === module) {
  runFullQuickBenchmark().catch(console.error);
}

module.exports = { runQuickBenchmark, runFullQuickBenchmark }; 