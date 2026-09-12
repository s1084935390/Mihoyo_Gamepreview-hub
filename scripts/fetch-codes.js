// scripts/fetch-codes.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// 各游戏的直播兑换码活动 actId（按当前前瞻直播填写，留空则使用全局直播活动）
const GAMES = [
  { key: 'genshin',  folder: 'yuanshen',  actId: '' },
  { key: 'starrail', folder: 'starRail',  actId: '' },
  { key: 'zzz',      folder: 'zzz',       actId: '' }
];

const MIYOLIVE_INDEX_URL = 'https://api-takumi.mihoyo.com/event/miyolive/index';
const REFRESH_CODE_URL = 'https://api-takumi-static.mihoyo.com/event/miyolive/refreshCode';

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw || !raw.trim()) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') return fallback;
    throw new Error(`读取 ${filePath} 失败: ${e.message}`);
  }
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

async function fetchLiveActId() {
  try {
    const res = await fetch(MIYOLIVE_INDEX_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://webstatic.mihoyo.com/' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return (data && data.data && data.data.live && data.data.live.act_id) || '';
  } catch (e) {
    console.warn('获取直播活动ID失败:', e.message);
    return '';
  }
}

async function fetchCodesForGame(game, actId) {
  try {
    const res = await fetch(`${REFRESH_CODE_URL}?act_id=${actId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://webstatic.mihoyo.com/' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    return (data && data.data && data.data.code_list) || [];
  } catch (e) {
    console.error(`[${game.key}] 获取兑换码失败: ${e.message}`);
    return [];
  }
}

async function run() {
  // 直播索引通常只有一个活动，先取全局 actId，再按游戏覆盖
  const globalActId = await fetchLiveActId();

  for (const game of GAMES) {
    const actId = game.actId || globalActId;
    if (!actId) {
      console.warn(`[${game.key}] 未找到活动ID，跳过`);
      continue;
    }

    const codes = await fetchCodesForGame(game, actId);
    if (!codes.length) {
      console.warn(`[${game.key}] 暂无兑换码`);
      continue;
    }

    // 读取最新版本，将兑换码写入对应详情文件
    const indexPath = path.join(game.folder, 'versions.json');
    const versions = readJson(indexPath, []);
    const latest = Array.isArray(versions) ? versions[0] : null;
    if (!latest) {
      console.warn(`[${game.key}] ${indexPath} 为空，无法写入兑换码`);
      continue;
    }

    const detailPath = path.join(game.folder, latest.file || `${latest.version}.json`);
    const detail = readJson(detailPath, {});
    detail.codes = codes;
    writeJson(detailPath, detail);
    console.log(`[${game.key}] 已写入 ${codes.length} 个兑换码到 ${detailPath}`);
  }
}

run();