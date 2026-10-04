# Antigravity Playground 🚀

뽀모도로 타이머, 할 일 플래너, 카운터와 이메일 계정을 지원하는 웹 앱입니다.

## 실행
Node.js 22 이상을 사용합니다.
```sh
npm ci
npm start
```
http://localhost:3000 에 접속하세요. 빌드 결과는 dist/에 생성됩니다.
index.html을 파일로 직접 열면 인증 번들이 없어 로그인할 수 없습니다.

## 로그인과 회원가입
- Supabase `test` 프로젝트의 이메일·비밀번호 인증을 사용합니다.
- 회원가입 비밀번호는 8자 이상이며 비밀번호 확인이 필요합니다.
- 이메일 인증을 완료한 뒤 로그인합니다. 인증 메일 재발송을 지원합니다.
- SDK가 브라우저 세션 유지, 토큰 갱신, 인증 콜백 및 탭 사이 로그인 상태 변경을 처리합니다.
- 로그아웃은 현재 브라우저의 세션에 적용됩니다.
- 타이머와 카운터는 기존과 동일하게 작동하며, 할 일은 기존 브라우저 로컬 저장소에 저장됩니다. 계정 간 분리나 서버 동기화 기능은 포함되지 않습니다.
- 비밀번호를 앱의 로컬 저장소나 자체 서버에 저장하지 않습니다.

## 인증 설정 및 배포
auth-config.json에는 브라우저용 Supabase URL과 **publishable key**만 포함됩니다.
service_role, secret key, 관리자 토큰은 절대 프런트엔드에 넣지 마세요.
SDK와 빌드 의존성은 버전을 고정하고 package-lock.json을 포함합니다.

Vercel에서 이 저장소의 main 브랜치를 연결하세요. vercel.json이 `npm run build`와 dist 출력 폴더를 지정합니다.

이메일 인증이 배포 사이트로 돌아오려면 [Supabase URL Configuration](https://supabase.com/dashboard/project/kahvhleouenhyvxxmipp/auth/url-configuration)의 **Redirect URLs**에 실제 배포 URL(끝에 / 포함)과 `http://localhost:3000/`를 등록해야 합니다. 다른 앱도 사용하는 test 프로젝트이므로 기존 Site URL과 Redirect URLs를 덮어쓰지 마세요.
기본 메일 서비스는 수신자 제한과 발송 제한이 있을 수 있습니다. 실제 사용자의 회원가입을 운영하려면 [SMTP 설정](https://supabase.com/dashboard/project/kahvhleouenhyvxxmipp/auth/smtp)을 확인하세요. 앱은 제한 오류를 한국어로 안내합니다.

## 검증
```sh
npm test
npm run build
```
자동 테스트는 인증 클라이언트 대역으로 가입 입력 검증, 인증 대기, 로그인·로그아웃, 세션 복원, 오류, 중복 제출, 안전한 텍스트 표시를 확인합니다.
실제 메일 수신과 인증 링크 클릭까지의 검증은 수신 가능한 테스트 이메일로 별도 확인해야 합니다.
