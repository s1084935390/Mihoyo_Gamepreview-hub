// scripts/fetch-codes.js
import fetch from 'node-fetch';
import fs from 'fs';

const GAMES = [
  { key: 'genshin',  folder: 'yuanshen',  actId: '' },  // 需要填入当前直播 actId
  { key: 'starrail', folder: 'starRail',  actId: '' },
  { key: 'zzz',      folder: 'zzz',       actId: '' }
];

async function fetchCodes(game) {
  // 第一步：获取当前直播活动 ID
  const indexUrl = 'https://api-takumi.mihoyo.com/event/miyolive/index';
  const indexRes = await fetch(indexUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://webstatic.mihoyo.com/' }
  });
  const indexData = await indexRes.json();
  const actId = indexData?.data?.live?.act_id || game.actId;
  if (!actId) { console.log(`[${game.key}] 未找到活动ID`); return; }

  // 第二步：获取兑换码
  const codeUrl = `https://api-takumi-static.mihoyo.com/event/miyolive/refreshCode?act_id=${actId}`;
  const codeRes = await fetch(codeUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://webstatic.mihoyo.com/' }
  });
  const codeData = await codeRes.json();
  const codes = codeData?.data?.code_list || [];

  if (!codes.length) { console.log(`[${game.key}] 暂无兑换码`); return; }

  // 将兑换码写入对应版本的详情文件
  // 需要先确定当前最新版本号
  console.log(`[${game.key}] 获取到 ${codes.length} 个兑换码`);
  return codes;
}

for (const game of GAMES) {
  await fetchCodes(game);
}