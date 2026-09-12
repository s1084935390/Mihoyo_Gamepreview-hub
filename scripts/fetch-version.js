// scripts/fetch-version.js
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const GAME_IDS = {
  genshin:  { id: '1Z8W5NHUQb', biz: 'hk4e_cn',  folder: 'yuanshen' },
  starrail: { id: '64kMb5iAWu', biz: 'hkrpg_cn',  folder: 'starRail' },
  zzz:      { id: 'x6znKlJ0xK', biz: 'nap_cn',    folder: 'zzz' }
};

const LAUNCHER_ID = 'jGHBHlcOq1';

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

async function fetchGameVersion(gameKey) {
  const game = GAME_IDS[gameKey];
  const url = `https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages?launcher_id=${LAUNCHER_ID}&game_ids[]=${game.id}`;

  let version;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.miyoushe.com/' }
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const pkgs = data && data.data && data.data.game_packages;
    if (!Array.isArray(pkgs) || !pkgs.length) throw new Error('未获取到游戏包数据');
    version = pkgs[0] && pkgs[0].main && pkgs[0].main.major && pkgs[0].main.major.version;
    if (!version) throw new Error('未解析到版本号');
  } catch (e) {
    console.error(`[${gameKey}] 获取版本失败: ${e.message}`);
    return;
  }

  const indexPath = path.join(game.folder, 'versions.json');
  let versions = readJson(indexPath, []);
  if (!Array.isArray(versions)) versions = [];

  const exists = versions.find(v => v && v.version === version);
  if (exists) {
    console.log(`[${gameKey}] 版本 ${version} 已存在，跳过`);
    return;
  }

  const file = `${version}.json`;
  versions.unshift({
    version,
    title: '',            // 需要后续补充
    publishDate: new Date().toISOString().slice(0, 10),
    brief: '',
    file
  });
  writeJson(indexPath, versions);

  // 为新版本创建空的详情文件，避免详情页 404
  const detailPath = path.join(game.folder, file);
  if (!fs.existsSync(detailPath)) {
    writeJson(detailPath, {
      version,
      title: '',
      publishDate: new Date().toISOString().slice(0, 10),
      brief: '',
      codes: [],
      banners: [],
      characters: []
    });
  }

  console.log(`[${gameKey}] 新增版本 ${version}`);
}

(async () => {
  for (const key of Object.keys(GAME_IDS)) {
    await fetchGameVersion(key);
  }
})();