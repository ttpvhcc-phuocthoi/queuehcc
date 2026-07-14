/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_API_URL: string;
  // Thêm các biến khác của bạn tại đây
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}