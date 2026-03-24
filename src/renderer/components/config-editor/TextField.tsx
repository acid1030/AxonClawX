/**
 * 配置编辑器 - 文本输入
 */
import React from 'react';
import { ConfigField } from './ConfigField';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TextFieldProps {
  label: string;
  desc?: string;
  tooltip?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  mono?: boolean;
  multiline?: boolean;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  desc,
  tooltip,
  value,
  onChange,
  placeholder,
  error,
  mono = true,
  multiline,
}) => (
  <ConfigField label={label} desc={desc} tooltip={tooltip} error={error}>
    {multiline ? (
      <textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className={cn(
          'h-auto py-2 px-3 resize-y rounded-md border border-input bg-transparent text-sm outline-none focus:ring-1 focus:ring-ring',
          mono ? 'font-mono' : 'font-sans'
        )}
      />
    ) : (
      <Input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn('h-8 w-40 md:w-48', mono && 'font-mono')}
      />
    )}
  </ConfigField>
);
