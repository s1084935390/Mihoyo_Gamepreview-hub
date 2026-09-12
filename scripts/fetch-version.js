// scripts/fetch-version.js
import fetch from 'node-fetch';
import fs from 'fs';

const GAME_IDS = {
  genshin:  { id: '1Z8W5NHUQb', biz: 'hk4e_cn', folder: 'yuanshen' },
  starrail: { id: '64kMb5iAWu', biz: 'hkrpg_cn', folder: 'starRail' },
  zzz:      { id: 'x6znKlJ0xK', biz: 'nap_cn',   folder: 'zzz' }
};

async function fetchGameVersion(gameKey) {
  const { id, folder } = GAME_IDS[gameKey];
  const url = `https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages?launcher_id=jGHBHlcOq1&game_ids[]=${id}`;

  const res = await fetch(url);
  const data = await res.json();
  const pkg = data.data.game_packages[0];
  const version = pkg.main.major.version;

  // 读取已有的 versions.json，追加或更新版本条目
  const indexPath = `${folder}/versions.json`;
  let versions = [];
  if (fs.existsSync(indexPath)) {
    versions = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  }

  const exists = versions.find(v => v.version === version);
  if (!exists) {
    versions.unshift({
      version,
      title: '',            // 需要后续补充
      publishDate: new Date().toISOString().slice(0, 10),
      brief: '',
      file: `${version}.json`
    });
    fs.writeFileSync(indexPath, JSON.stringify(versions, null, 2), 'utf-8');
    console.log(`[${gameKey}] 新增版本 ${version}`);
  } else {
    console.log(`[${gameKey}] 版本 ${version} 已存在，跳过`);
  }
}

for (const key of Object.keys(GAME_IDS)) {
  await fetchGameVersion(key);
}