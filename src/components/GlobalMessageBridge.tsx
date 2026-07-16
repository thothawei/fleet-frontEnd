import { useEffect } from 'react';
import { App } from 'antd';

import { setGlobalMessage } from '../utils/globalMessage';

/** 把 App.useApp() 的 message 實例注入模組層 holder，供 React 樹外使用（不渲染任何東西）。 */
export default function GlobalMessageBridge() {
  const { message } = App.useApp();
  useEffect(() => {
    setGlobalMessage(message);
    return () => setGlobalMessage(null);
  }, [message]);
  return null;
}
