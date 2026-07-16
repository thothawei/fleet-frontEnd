import type { MessageInstance } from 'antd/es/message/interface';

/**
 * 模組層的 antd message 實例橋接：讓 React 樹外的程式（如 QueryCache onError）
 * 也能用到 App.useApp() 提供、吃得到主題 context 的 message。
 * 由 <GlobalMessageBridge>（掛在 main.tsx 的 <AntdApp> 內）注入。
 */
let instance: MessageInstance | null = null;

export function setGlobalMessage(message: MessageInstance | null): void {
  instance = message;
}

export function getGlobalMessage(): MessageInstance | null {
  return instance;
}
