// src/index.html 의 /*DATA*/ 자리에 build/data.json 을 넣어 dist/index.html 한 장으로 만든다
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const tpl = fs.readFileSync(path.join(ROOT, 'src/index.html'), 'utf8');
const data = fs.readFileSync(path.join(ROOT, 'build/data.json'), 'utf8');
if (!tpl.includes('/*DATA*/')) throw new Error('src/index.html 에 /*DATA*/ 자리표시가 없어요');
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
// firebase.config.json 이 있으면 기기 동기화가 켜진다 (없으면 로그인 버튼이 '서버 없음'으로 안내)
const fbPath = path.join(ROOT, 'firebase.config.json');
const fb = fs.existsSync(fbPath) ? JSON.stringify(JSON.parse(fs.readFileSync(fbPath, 'utf8'))) : 'null';
if (!tpl.includes('/*FIREBASE*/null')) throw new Error('src/index.html 에 /*FIREBASE*/null 자리표시가 없어요');
fs.writeFileSync(path.join(ROOT, 'dist/index.html'), tpl.replace('/*DATA*/', () => data).replace('/*FIREBASE*/null', () => fb));
console.log('dist/index.html', (fs.statSync(path.join(ROOT, 'dist/index.html')).size / 1024).toFixed(0) + 'KB');
