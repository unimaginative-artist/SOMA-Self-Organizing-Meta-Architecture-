#!/usr/bin/env node

/**
 * Deploy Always-On Nighttime Learning Worker to GCP
 *
 * Creates a cheap e2-small VM that runs 24/7 as a SOMA cluster worker
 * Automatically joins the cluster and handles nighttime learning
 *
 * Usage:
 *   node scripts/deploy-gcp-nighttime-worker.mjs --create
 *   node scripts/deploy-gcp-nighttime-worker.mjs --deploy
 *   node scripts/deploy-gcp-nighttime-worker.mjs --status
 *   node scripts/deploy-gcp-nighttime-worker.mjs --start
 *   node scripts/deploy-gcp-nighttime-worker.mjs --stop
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG = {
  projectId: 'able-copilot-479415-r8',
  region: 'us-central1',
  zone: 'us-central1-a',

  instance: {
    name: 'soma-nighttime-worker',
    machineType: 'e2-small',  // 2 vCPUs, 2GB RAM (~$15/month)
    // Use 'e2-micro' for free tier (1 vCPU, 1GB RAM) - may be slower
    diskSize: '20GB',
    imageFamily: 'ubuntu-2204-lts',
    imageProject: 'ubuntu-os-cloud'
  },

  // Your iMac coordinator address
  coordinatorAddress: process.env.SOMA_COORDINATOR || '192.168.1.251:7777'
};

function run(command, options = {}) {
  console.log(`\n🔧 ${command}`);
  try {
    const output = execSync(command, {
      stdio: options.silent ? 'pipe' : 'inherit',
      encoding: 'utf-8'
    });
    return output;
  } catch (error) {
    if (!options.ignoreError) throw error;
    return null;
  }
}

async function createInstance() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Creating Always-On Nighttime Learning Worker');
  console.log('═══════════════════════════════════════════════════════\n');

  const { instance } = CONFIG;

  console.log('Configuration:');
  console.log(`  Name: ${instance.name}`);
  console.log(`  Machine: ${instance.machineType}`);
  console.log(`  Region: ${CONFIG.region}`);
  console.log(`  Cost: ~$15/month for 24/7 operation`);
  console.log(`  Coordinator: ${CONFIG.coordinatorAddress}\n`);

  // Create startup script that will run on boot
  const startupScript = `#!/bin/bash
set -e

echo "🌙 SOMA Nighttime Learning Worker - Startup"

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Create soma user
sudo useradd -m -s /bin/bash soma || true

# Setup SOMA directory
sudo mkdir -p /home/soma/soma-dashboard-UNIFIED
sudo chown -R soma:soma /home/soma

# Clone or sync SOMA (you'll need to set this up with your repo)
# For now, we'll use the deployment package

echo "✅ System setup complete"
echo "📦 Ready for SOMA deployment"
`;

  const command = `gcloud compute instances create ${instance.name} \\
    --project=${CONFIG.projectId} \\
    --zone=${CONFIG.zone} \\
    --machine-type=${instance.machineType} \\
    --boot-disk-size=${instance.diskSize} \\
    --image-family=${instance.imageFamily} \\
    --image-project=${instance.imageProject} \\
    --metadata=startup-script='${startupScript}' \\
    --tags=soma-worker,http-server \\
    --scopes=cloud-platform`;

  try {
    run(command.replace(/\n/g, ' '));
    console.log('\n✅ Instance created successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Wait 2-3 minutes for instance to boot');
    console.log('   2. Run: node scripts/deploy-gcp-nighttime-worker.mjs --deploy');
  } catch (error) {
    console.error('\n❌ Failed to create instance');
    console.error('   If instance already exists, use --deploy to update it');
  }
}

async function deploySOMA() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Deploying SOMA to Cloud Worker');
  console.log('═══════════════════════════════════════════════════════\n');

  const { instance } = CONFIG;

  // Create deployment package
  console.log('📦 Creating deployment package...');

  const deployScript = `#!/bin/bash
set -e

echo "🚀 Deploying SOMA Nighttime Learning Worker"

cd /home/soma/soma-dashboard-UNIFIED

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm install --production

# Create .env file
cat > .env << 'ENVFILE'
# AI API Keys (from main .env)
GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ''}
DEEPSEEK_API_KEY=${process.env.DEEPSEEK_API_KEY || ''}
OLLAMA_ENDPOINT=${process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'}

# GCP Vertex AI
GCP_PROJECT_ID=able-copilot-479415-r8
GCP_SERVICE_ACCOUNT=vertex-express@able-copilot-479415-r8.iam.gserviceaccount.com
VERTEX_AI_LOCATION=us-central1

# Cluster Configuration (AUTO-DETECTED as worker)
SOMA_MODE=cluster
SOMA_CLUSTER=true
SOMA_COORDINATOR=${CONFIG.coordinatorAddress}
SOMA_CLUSTER_PORT=7777

# Features
SOMA_GPU=false
SOMA_MULTIMODAL=true
SOMA_CONTINUOUS_LEARNING=true
ENVFILE

# Create systemd service for auto-start
sudo tee /etc/systemd/system/soma-nighttime-learning.service > /dev/null << 'SERVICEEOF'
[Unit]
Description=SOMA Nighttime Learning Worker
After=network.target

[Service]
Type=simple
User=soma
WorkingDirectory=/home/soma/soma-dashboard-UNIFIED
ExecStart=/usr/bin/node scripts/start-nighttime-learning-service.mjs
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable soma-nighttime-learning
sudo systemctl start soma-nighttime-learning

echo "✅ SOMA Nighttime Learning Worker deployed!"
echo "📊 Check status: sudo systemctl status soma-nighttime-learning"
echo "📋 View logs: sudo journalctl -u soma-nighttime-learning -f"
`;

  // Write deployment script
  fs.writeFileSync('/tmp/deploy-soma-worker.sh', deployScript);

  console.log('📤 Uploading SOMA files to cloud...');

  // Upload essential files
  const filesToUpload = [
    'package.json',
    'scripts/start-nighttime-learning-service.mjs',
    'core/NighttimeLearningOrchestrator.js',
    'arbiters/MnemonicArbiter.js',
    'arbiters/AdaptiveLearningPlanner.js',
    'SOMArbiterV2_TriBrain.js',
    'vertex-credentials.json',
    '.env'
  ];

  try {
    // Create tar archive of necessary files
    console.log('   Creating deployment archive...');
    const files = filesToUpload.join(' ');
    run(`tar -czf /tmp/soma-deploy.tar.gz ${files}`, { ignoreError: true });

    // Upload archive
    console.log('   Uploading to VM...');
    run(`gcloud compute scp /tmp/soma-deploy.tar.gz soma@${instance.name}:/home/soma/ --zone=${CONFIG.zone} --project=${CONFIG.projectId}`);

    // Upload and run deployment script
    console.log('   Uploading deployment script...');
    run(`gcloud compute scp /tmp/deploy-soma-worker.sh soma@${instance.name}:/home/soma/ --zone=${CONFIG.zone} --project=${CONFIG.projectId}`);

    console.log('🚀 Running deployment on cloud VM...');
    run(`gcloud compute ssh soma@${instance.name} --zone=${CONFIG.zone} --project=${CONFIG.projectId} --command="cd /home/soma && tar -xzf soma-deploy.tar.gz && bash deploy-soma-worker.sh"`);

    console.log('\n✅ Deployment complete!');
    console.log('\n📊 Monitor your worker:');
    console.log(`   gcloud compute ssh soma@${instance.name} --zone=${CONFIG.zone} --project=${CONFIG.projectId} --command="sudo journalctl -u soma-nighttime-learning -f"`);
  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
  }
}

async function checkStatus() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Cloud Worker Status');
  console.log('═══════════════════════════════════════════════════════\n');

  const { instance } = CONFIG;

  // Check instance status
  console.log('📊 Instance Status:');
  run(`gcloud compute instances describe ${instance.name} --zone=${CONFIG.zone} --project=${CONFIG.projectId} --format="table(name,status,networkInterfaces[0].accessConfigs[0].natIP)"`);

  // Check if SOMA is running
  console.log('\n🌙 SOMA Service Status:');
  run(`gcloud compute ssh soma@${instance.name} --zone=${CONFIG.zone} --project=${CONFIG.projectId} --command="sudo systemctl status soma-nighttime-learning || echo 'Service not installed yet'"`, { ignoreError: true });

  // Get costs
  console.log('\n💰 Estimated Monthly Cost:');
  console.log(`   Machine (${CONFIG.instance.machineType}): ~$15/month`);
  console.log(`   Disk (20GB): ~$0.80/month`);
  console.log(`   Network egress: ~$0-5/month`);
  console.log(`   Total: ~$15-20/month for 24/7 learning`);
}

async function startInstance() {
  const { instance } = CONFIG;
  console.log(`\n▶️  Starting ${instance.name}...`);
  run(`gcloud compute instances start ${instance.name} --zone=${CONFIG.zone} --project=${CONFIG.projectId}`);
  console.log('✅ Instance started');
}

async function stopInstance() {
  const { instance } = CONFIG;
  console.log(`\n⏸️  Stopping ${instance.name}...`);
  run(`gcloud compute instances stop ${instance.name} --zone=${CONFIG.zone} --project=${CONFIG.projectId}`);
  console.log('✅ Instance stopped (no charges while stopped)');
}

// ════════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════════

const command = process.argv[2];

switch (command) {
  case '--create':
    await createInstance();
    break;

  case '--deploy':
    await deploySOMA();
    break;

  case '--status':
    await checkStatus();
    break;

  case '--start':
    await startInstance();
    break;

  case '--stop':
    await stopInstance();
    break;

  default:
    console.log(`
═══════════════════════════════════════════════════════
  Deploy Always-On Nighttime Learning Worker to GCP
═══════════════════════════════════════════════════════

Usage:
  node scripts/deploy-gcp-nighttime-worker.mjs --create    # Create VM
  node scripts/deploy-gcp-nighttime-worker.mjs --deploy    # Deploy SOMA
  node scripts/deploy-gcp-nighttime-worker.mjs --status    # Check status
  node scripts/deploy-gcp-nighttime-worker.mjs --start     # Start VM
  node scripts/deploy-gcp-nighttime-worker.mjs --stop      # Stop VM (save $)

Quick Start:
  1. --create   (creates e2-small VM, ~$15/month)
  2. --deploy   (installs SOMA and starts learning)
  3. --status   (monitor the worker)

Benefits:
  ✅ Runs 24/7 even when local machines sleep
  ✅ Automatically joins your cluster
  ✅ Cheap ($15/month for always-on)
  ✅ Can stop/start to save money
  ✅ Auto-restarts on crashes
`);
}
