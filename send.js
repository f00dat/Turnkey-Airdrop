// send.js (ESM) — Sepolia bulk sender com failover, retry, nonce seguro e fee robusta
import 'dotenv/config';
import { ethers } from 'ethers';

const {
  PRIVATE_KEY, DEST,
  TX_PER_DAY = '500',
  AMOUNT_ETH_MIN = '0.00001',
  AMOUNT_ETH_MAX = '0.00001',
  GAS_LIMIT = '21000',
  BATCH_SIZE = '10',
  SLEEP_BETWEEN_BATCH_MS = '60000',
  PER_TX_DELAY_MS = '150',
  RETRY_MAX = '4',
  RETRY_BACKOFF_MS = '2000',
  PRIORITY_GWEI = '1.0',     // tip mínima desejada (gwei)
  FEE_MULTIPLIER = '1.20',   // cap = baseFee * MULT + tip
  DRY_RUN = 'false'
} = process.env;

const urls = (process.env.RPC_URLS || process.env.RPC_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
if (urls.length === 0) throw new Error('Defina RPC_URLS (vários, vírgula) ou RPC_URL (um) no .env');
if (!PRIVATE_KEY) throw new Error('Defina PRIVATE_KEY no .env');
if (!DEST) throw new Error('Defina DEST no .env');

let rpcIndex = 0;
let provider = new ethers.JsonRpcProvider(urls[rpcIndex]);
let wallet = new ethers.Wallet(PRIVATE_KEY, provider);

const mask = (u) => u.replace(/(https?:\/\/[^/]+).*/, '$1');

function useNextRpc() {
  rpcIndex = (rpcIndex + 1) % urls.length;
  provider = new ethers.JsonRpcProvider(urls[rpcIndex]);
  wallet = wallet.connect(provider);
  console.log('↻ Trocando RPC para:', mask(urls[rpcIndex]));
}

async function withRpcRetry(fn, tries = urls.length) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try { return await fn(); }
    catch (e) { lastErr = e; console.warn('RPC falhou, tentando próximo…', e.shortMessage || e.message || e); useNextRpc(); }
  }
  throw lastErr;
}

const TXS      = Number(TX_PER_DAY);
const BATCH    = Number(BATCH_SIZE);
const SLEEP    = Number(SLEEP_BETWEEN_BATCH_MS);
const GAS      = BigInt(GAS_LIMIT);
const DRY      = /^true$/i.test(DRY_RUN);
const PER_DELAY   = Number(PER_TX_DELAY_MS);
const RETRIES_MAX = Number(RETRY_MAX);
const RETRY_BACK  = Number(RETRY_BACKOFF_MS);

const vMin = ethers.parseEther(AMOUNT_ETH_MIN);
const vMax = ethers.parseEther(AMOUNT_ETH_MAX);

const randValue = () => {
  if (vMin === vMax) return vMin;
  const diff = vMax - vMin;
  const r = BigInt(Math.floor(Math.random() * 1e6));
  return vMin + (diff * r) / 1000000n;
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function nonceManager(addr) {
  const used = new Set(); // nonces usadas neste processo (evita duplicar)
  return {
    async next() {
      let n = await withRpcRetry(() => provider.getTransactionCount(addr, 'pending'));
      while (used.has(n)) n++;
      used.add(n);
      return n;
    }
  };
}

async function sendTxWithRetry(tx, label) {
  let err;
  for (let i = 0; i < RETRIES_MAX; i++) {
    try {
      const resp = await withRpcRetry(() => wallet.sendTransaction(tx));
      console.log(`  -> ${resp.hash} | nonce=${tx.nonce} | value=${ethers.formatEther(tx.value)} ETH`);
      if (PER_DELAY) await sleep(PER_DELAY);
      return true;
    } catch (e) {
      const msg = (e.shortMessage || e.message || '').toLowerCase();
      // conflitos de nonce: apenas loga e marca como falha leve (vamos requeue com outra nonce)
      if (msg.includes('nonce has already been used') || msg.includes('nonce too low')) {
        console.warn(`  (skip) ${label}: ${e.shortMessage || e.message}`);
        return false;
      }
      err = e;
      console.warn(`  (retry ${i+1}/${RETRIES_MAX}) ${label}:`, e.shortMessage || e.message || e);
      await sleep(RETRY_BACK);
    }
  }
  console.error(`Falha definitiva ${label}:`, err?.shortMessage || err?.message || err);
  return false;
}

async function main() {
  const who = await wallet.getAddress();
  console.log('Sender:', who);
  console.log('Dest  :', DEST);
  console.log('RPCs  :', urls.map(mask).join(' | '));
  console.log('Plan  :', `${TXS} tx em batches de ${BATCH}`);

  // cap = baseFee * MULT + tip  (garante cap >= tip)
  const fd    = await withRpcRetry(() => provider.getFeeData());
  const block = await withRpcRetry(() => provider.getBlock('latest'));

  const baseFee = block?.baseFeePerGas ?? ethers.parseUnits('1', 'gwei'); // fallback
  const tipSuggested = fd.maxPriorityFeePerGas ?? ethers.parseUnits('1', 'gwei');
  const tipMinEnv    = ethers.parseUnits(PRIORITY_GWEI || '1.0', 'gwei');
  const maxPrio      = tipSuggested > tipMinEnv ? tipSuggested : tipMinEnv;

  const multInt = Math.max(100, Math.floor(Number(FEE_MULTIPLIER) * 100)); // >= 1.00
  const maxFee  = (baseFee * BigInt(multInt)) / 100n + maxPrio;

  console.log(
    'Fees :',
    `base≈${ethers.formatUnits(baseFee, 'gwei')} gwei | tip≈${ethers.formatUnits(maxPrio, 'gwei')} gwei | cap≈${ethers.formatUnits(maxFee, 'gwei')} gwei`
  );

  const feePerTxEth = Number(ethers.formatEther(maxFee * GAS));
  const avgValueEth = Number(ethers.formatEther((vMin + vMax) / 2n));
  const needEth     = feePerTxEth * TXS + avgValueEth * TXS;

  const bal = Number(ethers.formatEther(await withRpcRetry(() => provider.getBalance(who))));
  console.log(`Saldo: ${bal.toFixed(6)} ETH | Necessário (estimado): ~${needEth.toFixed(6)} ETH`);
  if (bal + 1e-9 < needEth && !DRY) {
    console.error('Saldo possivelmente insuficiente. Ajuste DRY_RUN=true para simular apenas.');
    return;
  }
  if (DRY) { console.log('DRY_RUN=true → simulou, saindo.'); return; }

  const nm = nonceManager(who);

  let sent = 0;
  while (sent < TXS) {
    const nThis = Math.min(BATCH, TXS - sent);
    console.log(`Batch ${sent + 1}-${sent + nThis}`);

    const failed = [];
    for (let i = 0; i < nThis; i++) {
      const nonceI = await nm.next();
      const tx = {
        to: DEST,
        value: randValue(),
        gasLimit: GAS,
        maxFeePerGas: maxFee,
        maxPriorityFeePerGas: maxPrio,
        nonce: nonceI
      };
      const ok = await sendTxWithRetry(tx, `nonce ${nonceI}`);
      if (!ok) failed.push(nonceI);
    }

    for (const oldN of failed) {
      const nonceI = await nm.next();
      const tx = {
        to: DEST,
        value: randValue(),
        gasLimit: GAS,
        maxFeePerGas: maxFee,
        maxPriorityFeePerGas: maxPrio,
        nonce: nonceI
      };
      await sendTxWithRetry(tx, `requeue nonce ${nonceI} (era ${oldN})`);
    }

    sent += nThis;
    if (sent < TXS) {
      console.log(`Aguardando ${SLEEP} ms…`);
      await sleep(SLEEP);
    }
  }

  console.log(`Estimativa taxa gasta: ~${(feePerTxEth * TXS).toFixed(6)} ETH`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
