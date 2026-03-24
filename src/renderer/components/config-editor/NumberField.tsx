/**
 * 配置编辑器 - 数字输入
 */
import React from 'react';
import { ConfigField } from './ConfigField';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumberFieldProps {
  label: string;
  desc?: string;
  tooltip?: string;
  value: number | undefined | null;
  onChange: (v: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  error?: string;
}

export const NumberField: React.FC<NumberFieldProps> = ({
  label,
  desc,
  tooltip,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  error,
}) => (
  <ConfigField label={label} desc={desc} tooltip={tooltip} error={error}>
    <Input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value;
        onChange(v === '' ? undefined : Number(v));
      }}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className={cn('h-8 w-32 md:w-40 font-mono text-sm')}
    />
  </ConfigField>
);
