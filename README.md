# Antigravity Playground 🚀

이 프로젝트는 즉시 실행 및 Vercel 배포가 가능한 인터랙티브 웹 애플리케이션입니다.

## 🌟 주요 특징
- **Zero-config Vercel 배포**: 추가 빌드 설정 없이 깃허브 연결만으로 즉시 배포 가능
- **현대적인 Glassmorphism UI**: 모바일/데스크탑 반응형 디자인
- **인터랙티브 기능**: 클릭 카운터 및 랜덤 응원 메시지 생성기
- **로컬 개발 서버 지원**: Node.js 기본 내장 모듈(`http`, `fs`)을 이용한 경량 서버 (`server.js`)

## 🛠️ 로컬에서 실행하기

### 1. 브라우저로 바로 열기
`index.html` 파일을 더블 클릭하거나 브라우저로 열면 즉시 실행됩니다.

### 2. Node.js 로컬 서버로 실행하기
```bash
node server.js
# 또는
npm start
```
실행 후 브라우저에서 `http://localhost:3000`으로 접속합니다.

## 🚀 Vercel 배포 방법
1. [Vercel 대시보드](https://vercel.com/new)에 접속합니다.
2. `antigravity-playground` 레포지토리를 Import합니다.
3. 별도의 Build/Output 설정 변경 없이 **Deploy** 버튼을 클릭하면 완료됩니다.
