/**
 * TypewriterMarkdown - 带打字机效果的 Markdown 渲染
 * 用于流式输出，收到数据即开始逐字显示
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MarkdownContent } from './MarkdownContent';

const CHARS_PER_TICK = 3; // 每 tick 显示字符数
const TICK_MS = 16; // ~187 字/秒，快速但仍可感知的打字机效果

interface TypewriterMarkdownProps {
  content: string;
  className?: string;
  /** 是否正在流式输出，用于显示光标 */
  isStreaming?: boolean;
  /** 是否启用打字机动画，false 则直接显示全部 */
  animate?: boolean;
  /** 纯文本模式，不解析 Markdown，保留换行 */
  plainText?: boolean;
  /** 动画追赶到当前 content 末尾时触发 */
  onComplete?: () => void;
}

export const TypewriterMarkdown: React.FC<TypewriterMarkdownProps> = ({
  content,
  className = '',
  isStreaming = true,
  animate = true,
  plainText = false,
  onComplete,
}) => {
  const [displayedLength, setDisplayedLength] = useState(animate ? 0 : content.length);
  const targetRef = useRef(content.length);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  // 追踪是否已经对当前 target 触发过 onComplete，避免重复触发
  const completeFiredRef = useRef(!animate);

  // 非动画模式：立即触发 onComplete
  useEffect(() => {
    if (!animate) {
      onCompleteRef.current?.();
    }
  }, [animate]);

  const fireCompleteIfNeeded = useCallback((len: number) => {
    if (len >= targetRef.current && !completeFiredRef.current) {
      completeFiredRef.current = true;
      onCompleteRef.current?.();
    }
  }, []);

  useEffect(() => {
    targetRef.current = content.length;
    // 新内容到来，重置 complete 标记
    completeFiredRef.current = false;

    if (!animate) {
      setDisplayedLength(content.length);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      completeFiredRef.current = true;
      onCompleteRef.current?.();
      return;
    }

    if (content.length <= 0) {
      setDisplayedLength(0);
      return;
    }

    // 收到数据立即开始逐字显示，使用 setInterval 确保稳定
    const tick = () => {
      setDisplayedLength((prev) => {
        const target = targetRef.current;
        if (prev >= target) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = undefined;
          }
          fireCompleteIfNeeded(prev);
          return target;
        }
        const next = Math.min(prev + CHARS_PER_TICK, target);
        if (next >= target) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = undefined;
          }
          fireCompleteIfNeeded(next);
        }
        return next;
      });
    };

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(tick, TICK_MS);
    // 下一帧立即开始，确保用户能看到首字
    const t = setTimeout(tick, 0);

    return () => {
      clearTimeout(t);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [content, animate, fireCompleteIfNeeded]);

  const displayed = content.slice(0, displayedLength);

  return (
    <div className="typewriter-markdown">
      {displayed ? (
        plainText ? (
          <span className={`whitespace-pre-wrap ${className}`}>{displayed}</span>
        ) : (
          <MarkdownContent content={displayed} className={className} />
        )
      ) : null}
      {isStreaming && (
        <span className="inline-block w-2 h-4 ml-0.5 bg-[#6366f1]/60 animate-pulse align-baseline" />
      )}
    </div>
  );
};
